"""
render.py : rendu d'un PDF en pages WebP, découpe des zooms et enregistrement
des fichiers de l'enseignant.

Remplace la partie "conversion" de l'ancien scripts/pdf2flipbook.py, sans HTML,
sans argparse, sans chemin en dur et sans print : ce sont des fonctions simples
que le service FastAPI peut lancer dans une tâche de fond.

Arborescence produite dans le dossier du job (la même que dans le ZIP) :

    <job_dir>/public/pages/page-001.webp
    <job_dir>/public/pages/thumbs/page-001.webp
    <job_dir>/public/audio/page-flip.wav
    <job_dir>/public/audio/...           (fichiers ajoutés par l'enseignant)
    <job_dir>/public/modals/...          (zooms découpés + images ajoutées)

Tous les chemins renvoyés sont relatifs au dossier du job, avec des "/".
"""

from __future__ import annotations

import copy
import math
import random
import re
import struct
import uuid
import wave
from pathlib import Path
from typing import BinaryIO, Callable, Optional

import pypdfium2 as pdfium
from PIL import Image

# on_progress(pourcentage 0-100, étape, message), même signature que l'ancien progress_callback.
ProgressCallback = Callable[[int, str, str], None]

THUMB_WIDTH = 240
THUMB_QUALITY = 75
ZOOM_CROP_QUALITY = 92

ALLOWED_ASSET_EXTENSIONS: dict[str, set[str]] = {
    "audio": {".mp3", ".wav", ".ogg", ".m4a", ".aac"},
    "modals": {".webp", ".png", ".jpg", ".jpeg", ".gif"},
}


def _notify(on_progress: Optional[ProgressCallback], pct: int, step: str, message: str) -> None:
    """Appelle on_progress sans jamais laisser une erreur d'affichage casser la conversion."""
    if on_progress is None:
        return
    try:
        on_progress(pct, step, message)
    except Exception:
        pass


def _close_quietly(obj) -> None:
    close = getattr(obj, "close", None)
    if callable(close):
        try:
            close()
        except Exception:
            pass


def _dirs(job_dir: Path) -> dict[str, Path]:
    public = job_dir / "public"
    return {
        "pages": public / "pages",
        "thumbs": public / "pages" / "thumbs",
        "audio": public / "audio",
        "modals": public / "modals",
    }


def generate_page_flip_audio(output_path: Path) -> None:
    """Synthétise un son de page qui tourne (WAV mono 16 bits, sans dépendance)."""
    sample_rate = 44100
    n_samples = int(sample_rate * 0.35)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(output_path), "w") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        frames = []
        for i in range(n_samples):
            t = i / sample_rate
            envelope = math.exp(-12.0 * t) * (1.0 - math.exp(-60.0 * t))
            noise = random.random() * 2.0 - 1.0
            freq = 280.0 * (1.0 - 0.5 * t)
            woosh = math.sin(2.0 * math.pi * freq * t) * 0.3
            value = (noise * 0.7 + woosh) * envelope
            frames.append(struct.pack("<h", int(max(-1.0, min(1.0, value)) * 32767 * 0.8)))
        wav_file.writeframes(b"".join(frames))


def render_pdf(
    pdf_path: str | Path,
    job_dir: str | Path,
    dpi: int = 300,
    quality: int = 85,
    on_progress: Optional[ProgressCallback] = None,
) -> dict:
    """
    Rend chaque page du PDF en WebP (plus une miniature) dans le dossier du job.

    Une seule page est en mémoire à la fois : l'image, le bitmap et la page sont
    fermés avant de passer à la suivante.

    Retourne {"totalPages": int, "pages": [{"pageNumber", "imagePath", "thumbPath", "title"}]}.
    Lève FileNotFoundError si le PDF n'existe pas et ValueError si dpi/quality sont hors limites.
    """
    pdf_path = Path(pdf_path)
    job_dir = Path(job_dir)
    if not pdf_path.is_file():
        raise FileNotFoundError(f"Fichier PDF introuvable : {pdf_path}")
    if not 72 <= dpi <= 600:
        raise ValueError("dpi doit être compris entre 72 et 600")
    if not 1 <= quality <= 100:
        raise ValueError("quality doit être compris entre 1 et 100")

    dirs = _dirs(job_dir)
    for folder in dirs.values():
        folder.mkdir(parents=True, exist_ok=True)

    _notify(on_progress, 5, "Analyse", "Lecture du fichier PDF...")
    scale = dpi / 72.0
    pages: list[dict] = []

    pdf = pdfium.PdfDocument(str(pdf_path))
    try:
        total = len(pdf)
        if total == 0:
            raise ValueError("Le PDF ne contient aucune page")
        _notify(on_progress, 10, "Rendu HD", f"{total} pages détectées")

        for index in range(total):
            number = index + 1
            name = f"page-{number:03d}.webp"
            page = pdf[index]
            bitmap = None
            image = None
            thumb = None
            try:
                bitmap = page.render(scale=scale)
                image = bitmap.to_pil()
                image.save(dirs["pages"] / name, "WEBP", quality=quality, method=2)

                width, height = image.size
                thumb_height = max(1, int(height * (THUMB_WIDTH / width)))
                thumb = image.resize((THUMB_WIDTH, thumb_height), Image.Resampling.BILINEAR)
                thumb.save(dirs["thumbs"] / name, "WEBP", quality=THUMB_QUALITY, method=2)
            finally:
                _close_quietly(thumb)
                _close_quietly(image)
                _close_quietly(bitmap)
                _close_quietly(page)

            pages.append(
                {
                    "pageNumber": number,
                    "imagePath": f"public/pages/{name}",
                    "thumbPath": f"public/pages/thumbs/{name}",
                    "title": f"Page {number}",
                }
            )
            _notify(
                on_progress,
                int(10 + number / total * 75),
                "Rendu HD",
                f"Page {number}/{total} ({dpi} DPI)",
            )
    finally:
        _close_quietly(pdf)

    _notify(on_progress, 90, "Audio", "Son de feuilletage...")
    flip_sound = dirs["audio"] / "page-flip.wav"
    if not flip_sound.exists():
        generate_page_flip_audio(flip_sound)

    _notify(on_progress, 100, "Terminé", f"{total} pages prêtes")
    return {"totalPages": total, "pages": pages}


def _percent(value, default: float) -> float:
    """Convertit "40%", "40" ou 40 en 40.0."""
    try:
        return float(str(value).replace("%", "").strip())
    except (TypeError, ValueError):
        return default


def _safe_id(value, fallback: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]", "_", str(value or "")).strip("_")
    return cleaned or fallback


def crop_zoom_zones(
    job_dir: str | Path,
    project: dict,
    quality: int = ZOOM_CROP_QUALITY,
) -> tuple[dict, list[str]]:
    """
    Découpe, à l'export, les zones de zoom qui n'ont pas d'image fournie.

    Pour chaque interaction "zoom" ou "modal" sans hiresSrc ni imageSrc, la zone
    (x, y, width, height en %) est découpée dans l'image de la page et enregistrée
    dans public/modals. Le projet reçu n'est pas modifié : la fonction renvoie une
    copie où seul hiresSrc est ajouté à ces interactions.

    Retourne (projet_mis_à_jour, avertissements). Une zone invalide ne bloque pas
    l'export : elle retombe sur l'image entière de la page, avec un avertissement.
    """
    job_dir = Path(job_dir)
    dirs = _dirs(job_dir)
    dirs["modals"].mkdir(parents=True, exist_ok=True)

    result = copy.deepcopy(project)
    warnings: list[str] = []

    for page in result.get("pages") or []:
        try:
            number = int(page.get("pageNumber", 0))
        except (TypeError, ValueError):
            continue
        todo = [
            inter
            for inter in (page.get("interactions") or [])
            if inter.get("type") in ("zoom", "modal")
            and not (inter.get("hiresSrc") or inter.get("imageSrc"))
        ]
        if not todo:
            continue

        name = f"page-{number:03d}.webp"
        page_file = dirs["pages"] / name
        full_page_path = f"public/pages/{name}"
        if not page_file.is_file():
            for inter in todo:
                inter["hiresSrc"] = full_page_path
            warnings.append(f"Page {number} : image introuvable, zoom remplacé par la page entière")
            continue

        with Image.open(page_file) as full:
            full.load()
            im_w, im_h = full.size
            for position, inter in enumerate(todo, start=1):
                inter_id = _safe_id(inter.get("id"), f"zoom{position}")
                x = _percent(inter.get("x"), 0.0)
                y = _percent(inter.get("y"), 0.0)
                w = _percent(inter.get("width"), 40.0)
                h = _percent(inter.get("height"), 30.0)
                left = max(0, int(x / 100.0 * im_w))
                top = max(0, int(y / 100.0 * im_h))
                right = min(im_w, int((x + w) / 100.0 * im_w))
                bottom = min(im_h, int((y + h) / 100.0 * im_h))

                if right <= left or bottom <= top:
                    inter["hiresSrc"] = full_page_path
                    warnings.append(f"Page {number}, zone {inter_id} : zone vide, page entière utilisée")
                    continue

                crop_name = f"crop_p{number}_{inter_id}.webp"
                try:
                    with full.crop((left, top, right, bottom)) as cropped:
                        cropped.save(dirs["modals"] / crop_name, "WEBP", quality=quality)
                    inter["hiresSrc"] = f"public/modals/{crop_name}"
                except Exception as exc:
                    inter["hiresSrc"] = full_page_path
                    warnings.append(f"Page {number}, zone {inter_id} : découpe impossible ({exc})")

    return result, warnings


def _clean_filename(filename: str) -> str:
    """Garde uniquement le nom de fichier (jamais un chemin) et remplace les caractères douteux."""
    base = re.split(r"[\\/]", filename or "")[-1].strip()
    stem, dot, ext = base.rpartition(".")
    if not dot:
        stem, ext = base, ""
    stem = re.sub(r"[^\w\- ]", "_", stem).strip(" .") or "fichier"
    return f"{stem[:80]}.{ext.lower()}" if ext else stem[:80]


def register_asset(
    job_dir: str | Path,
    kind: str,
    filename: str,
    fileobj: BinaryIO,
    max_bytes: Optional[int] = None,
) -> str:
    """
    Enregistre un fichier envoyé par l'enseignant dans public/audio ou public/modals.

    kind vaut "audio" ou "modals". Seules des extensions autorisées sont acceptées
    (pas de SVG ni de HTML). Un nom déjà pris reçoit un suffixe pour ne rien écraser.
    Retourne le chemin relatif à mettre dans le projet, par exemple "public/audio/intro.mp3".
    Lève ValueError si le type, l'extension ou la taille ne conviennent pas.
    """
    if kind not in ALLOWED_ASSET_EXTENSIONS:
        raise ValueError(f"Type de fichier inconnu : {kind!r}")
    name = _clean_filename(filename)
    extension = Path(name).suffix.lower()
    if extension not in ALLOWED_ASSET_EXTENSIONS[kind]:
        allowed = ", ".join(sorted(ALLOWED_ASSET_EXTENSIONS[kind]))
        raise ValueError(f"Extension {extension or '(aucune)'} non autorisée pour {kind} (autorisées : {allowed})")

    folder = _dirs(Path(job_dir))[kind]
    folder.mkdir(parents=True, exist_ok=True)
    destination = folder / name
    if destination.exists():
        destination = folder / f"{destination.stem}_{uuid.uuid4().hex[:8]}{extension}"

    written = 0
    try:
        with open(destination, "wb") as out:
            while True:
                chunk = fileobj.read(1024 * 1024)
                if not chunk:
                    break
                written += len(chunk)
                if max_bytes is not None and written > max_bytes:
                    raise ValueError("Fichier trop volumineux")
                out.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    if written == 0:
        destination.unlink(missing_ok=True)
        raise ValueError("Fichier vide")

    return f"public/{kind}/{destination.name}"
