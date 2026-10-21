"""
jobs.py : registre des conversions et dossiers temporaires.

Chaque conversion est un "job" : un identifiant aléatoire (uuid4 sans tirets, donc
impossible à deviner), un dossier sur disque et un état en mémoire.

Règles (section 11 du plan) :
- les fichiers sont temporaires ; le délai est un temps d'INACTIVITÉ, rafraîchi à
  chaque requête qui concerne le job (FILE_IDLE_TTL_MINUTES, 120 par défaut) ;
- le ZIP exporté est la copie durable d'un livre, pas ce dossier.

Variables d'environnement (toutes facultatives) :
    FLIPBOOK_DATA_DIR       dossier des données (défaut : python/tmp_data)
    FILE_IDLE_TTL_MINUTES   inactivité avant suppression (défaut : 120)
    MAX_UPLOAD_MB           taille maximale d'un PDF (défaut : 500)
    MAX_ASSET_MB            taille maximale d'un fichier audio/image ajouté (défaut : 25)
    MAX_CONCURRENT_JOBS     conversions simultanées (défaut : 1, pour limiter la mémoire)
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import pypdfium2 as pdfium

from .render import render_pdf

log = logging.getLogger("flipbook.jobs")


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


DATA_DIR = Path(os.environ.get("FLIPBOOK_DATA_DIR") or Path(__file__).resolve().parent.parent / "tmp_data")
JOBS_DIR = DATA_DIR / "jobs"
IDLE_TTL_SECONDS = _env_int("FILE_IDLE_TTL_MINUTES", 120) * 60
MAX_UPLOAD_MB = _env_int("MAX_UPLOAD_MB", 500)
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
MAX_ASSET_BYTES = _env_int("MAX_ASSET_MB", 25) * 1024 * 1024
MAX_CONCURRENT_JOBS = max(1, _env_int("MAX_CONCURRENT_JOBS", 1))

# Les statuts reprennent ceux attendus par le Studio ('completed' | 'error').
QUEUED, RUNNING, COMPLETED, ERROR = "queued", "running", "completed", "error"

_JOB_ID_RE = re.compile(r"^[0-9a-f]{32}$")
_lock = threading.Lock()
_registry: dict[str, "Job"] = {}
_executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENT_JOBS, thread_name_prefix="convert")


@dataclass
class Job:
    id: str
    status: str = QUEUED
    percent: int = 0
    step: str = "En attente"
    message: str = ""
    total_pages: int = 0
    pages: list = field(default_factory=list)
    error: Optional[str] = None
    version: int = 0  # augmente à chaque changement ; sert au flux SSE


def is_valid_job_id(job_id: str) -> bool:
    return bool(_JOB_ID_RE.match(job_id or ""))


def job_path(job_id: str) -> Path:
    """Dossier d'un job. À n'appeler qu'avec un identifiant déjà validé."""
    return JOBS_DIR / job_id


def _touch(job_id: str) -> None:
    try:
        os.utime(job_path(job_id), None)
    except OSError:
        pass


def existing_job_dir(job_id: str) -> Optional[Path]:
    """Dossier du job s'il existe (et rafraîchit son délai d'inactivité), sinon None."""
    if not is_valid_job_id(job_id):
        return None
    folder = job_path(job_id)
    if not folder.is_dir():
        return None
    _touch(job_id)
    return folder


def create_job() -> Job:
    job = Job(id=uuid.uuid4().hex)
    job_path(job.id).mkdir(parents=True, exist_ok=True)
    with _lock:
        _registry[job.id] = job
    return job


def get_job(job_id: str) -> Optional[Job]:
    """Retourne le job (et rafraîchit son délai), ou None s'il est inconnu ou expiré."""
    if existing_job_dir(job_id) is None:
        with _lock:
            _registry.pop(job_id, None)
        return None
    with _lock:
        job = _registry.get(job_id)
    if job is not None:
        return job
    return _rehydrate(job_id)  # serveur redémarré : on relit job.json


def snapshot(job: Job) -> tuple[dict, int]:
    """État public du job (pour JSON et SSE) et son numéro de version."""
    with _lock:
        data = {
            "jobId": job.id,
            "status": job.status,
            "percent": job.percent,
            "step": job.step,
            "message": job.message,
            "totalPages": job.total_pages,
            "error": job.error,
        }
        if job.status == COMPLETED:
            data["pages"] = list(job.pages)
        return data, job.version


def _update(job: Job, **changes) -> None:
    with _lock:
        for key, value in changes.items():
            setattr(job, key, value)
        job.version += 1


def _persist(job: Job) -> None:
    data, _ = snapshot(job)
    try:
        (job_path(job.id) / "job.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    except OSError:
        log.warning("Impossible d'écrire job.json pour %s", job.id)


def _rehydrate(job_id: str) -> Optional[Job]:
    try:
        data = json.loads((job_path(job_id) / "job.json").read_text(encoding="utf-8"))
        job = Job(
            id=job_id,
            status=data["status"],
            percent=data.get("percent", 100),
            step=data.get("step", ""),
            message=data.get("message", ""),
            total_pages=data.get("totalPages", 0),
            pages=data.get("pages", []),
            error=data.get("error"),
        )
    except (OSError, ValueError, KeyError):
        return None
    with _lock:
        _registry[job_id] = job
    return job


def _friendly_error(exc: Exception) -> str:
    if isinstance(exc, pdfium.PdfiumError):
        return "Impossible de lire ce PDF (fichier abîmé ou protégé par un mot de passe)."
    if isinstance(exc, ValueError):
        return str(exc)
    return "La conversion a échoué. Réessayez avec un autre fichier."


def _run(job: Job, dpi: int, quality: int) -> None:
    folder = job_path(job.id)
    source = folder / "source.pdf"
    _update(job, status=RUNNING, percent=1, step="Démarrage", message="Conversion en cours...")

    def on_progress(pct: int, step: str, message: str) -> None:
        _update(job, percent=pct, step=step, message=message)
        _touch(job.id)

    try:
        result = render_pdf(source, folder, dpi=dpi, quality=quality, on_progress=on_progress)
        _update(
            job,
            status=COMPLETED,
            percent=100,
            step="Terminé",
            message=f"{result['totalPages']} pages prêtes",
            total_pages=result["totalPages"],
            pages=result["pages"],
        )
    except Exception as exc:  # noqa: BLE001 : le détail va dans les logs, pas chez l'utilisateur
        log.exception("Conversion %s échouée", job.id)
        _update(job, status=ERROR, step="Erreur", message=_friendly_error(exc), error=_friendly_error(exc))
    finally:
        try:
            source.unlink(missing_ok=True)  # le PDF n'est plus utile une fois les pages rendues
        except OSError:
            pass
        _persist(job)


def start_job(job: Job, dpi: int, quality: int) -> None:
    _executor.submit(_run, job, dpi, quality)


def discard_job(job_id: str) -> None:
    """Supprime un job et son dossier sans condition (échec d'envoi, par exemple)."""
    with _lock:
        _registry.pop(job_id, None)
    if is_valid_job_id(job_id):
        shutil.rmtree(job_path(job_id), ignore_errors=True)


def delete_job(job_id: str) -> str:
    """Supprime un job terminé. Retourne "deleted", "missing" ou "busy"."""
    job = get_job(job_id)
    if job is None:
        return "missing"
    if job.status in (QUEUED, RUNNING):
        return "busy"
    discard_job(job_id)
    return "deleted"


def purge_expired() -> int:
    """Supprime les dossiers inactifs depuis plus de FILE_IDLE_TTL_MINUTES. Retourne leur nombre."""
    if not JOBS_DIR.is_dir():
        return 0
    now = time.time()
    removed = 0
    for entry in JOBS_DIR.iterdir():
        if not entry.is_dir() or not is_valid_job_id(entry.name):
            continue
        with _lock:
            job = _registry.get(entry.name)
        if job is not None and job.status in (QUEUED, RUNNING):
            continue
        try:
            idle = now - entry.stat().st_mtime
        except OSError:
            continue
        if idle > IDLE_TTL_SECONDS:
            discard_job(entry.name)
            removed += 1
    return removed
