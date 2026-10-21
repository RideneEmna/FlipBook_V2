import io
import json
import logging
import re
import zipfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response

from core import jobs
from core.render import _dirs, crop_zoom_zones, generate_page_flip_audio

log = logging.getLogger("flipbook.export")

router = APIRouter()

OFFLINE_INDEX_HTML = (
    Path(__file__).resolve().parent.parent.parent / "apps" / "offline" / "dist" / "index.html"
)

BAT_SCRIPT_TEMPLATE = """@echo off
chcp 65001 >nul
title Flipbook Studio Pro - Serveur Local Autonome
echo ======================================================================
echo   Flipbook Studio Pro - Lecture Optimale et Support Video YouTube
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Verifier si index.html est present dans ce dossier (detecte si le ZIP n'est pas extrait)
if not exist "%~dp0index.html" (
    echo ======================================================================
    echo   ATTENTION : ARCHIVE ZIP NON EXTRAITE !
    echo ======================================================================
    echo.
    echo   Le fichier "index.html" est introuvable dans ce dossier.
    echo   Vous avez probablement clique sur ce fichier directement depuis le ZIP.
    echo.
    echo   POUR LANCER VOTRE FLIPBOOK :
    echo   1. Fermez cette fenetre.
    echo   2. Faites un CLIC DROIT sur le fichier .zip telecharge.
    echo   3. Cliquez sur "Extraire tout..." puis validez l'extraction.
    echo   4. Rendez-vous dans le dossier extrait.
    echo   5. Double-cliquez sur "Ouvrir_Flipbook.bat".
    echo ======================================================================
    echo.
    pause
    exit /b 1
)

:: 2. Tuer d'anciens serveurs HTTP orphelins sur le port 8080 s'ils sont encore actifs
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8080" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Demarrage du serveur local pour permettre la lecture sans restriction...
echo Ouvrez votre navigateur a l'adresse : http://localhost:8080/index.html
echo.

start "" "http://localhost:8080/index.html?v=%random%"

python -m http.server 8080 --directory "%~dp0" 2>nul || python3 -m http.server 8080 --directory "%~dp0" 2>nul || py -m http.server 8080 --directory "%~dp0" 2>nul || (
    echo.
    echo Python n'est pas installe sur cet ordinateur.
    echo Ouverture directe du fichier index.html dans votre navigateur...
    start "" "%~dp0index.html"
)
pause
"""


def _sanitize_filename(name: str) -> str:
    cleaned = re.sub(r'[\\/*?:"<>|]', "_", name or "mon-flipbook").strip()
    return cleaned or "mon-flipbook"


import urllib.parse

def _build_zip_response(project: dict[str, Any], job_id: str | None, start_mode: str = "flipbook") -> Response:
    project["startMode"] = start_mode
    title = project.get("title") or project.get("name") or "my-book"
    safe_title = _sanitize_filename(title)
    ascii_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', safe_title) or "flipbook"
    encoded_title = urllib.parse.quote(f"{safe_title}.zip")

    # 1. Dossier du job pour récupérer les assets s'il existe
    job_dir: Path | None = None
    if job_id:
        job_dir = jobs.existing_job_dir(job_id)

    # Sauvegarder project.json dans job_dir si présent
    if job_dir and job_dir.is_dir() and project:
        try:
            (job_dir / "project.json").write_text(json.dumps(project, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass

    # 2. Découpe des zones de zoom si job_dir est disponible
    if job_dir and job_dir.is_dir():
        dirs = _dirs(job_dir)
        dirs["modals"].mkdir(parents=True, exist_ok=True)
        try:
            project, _ = crop_zoom_zones(job_dir, project)
        except Exception:
            pass

        flip_audio = dirs["audio"] / "page-flip.wav"
        if not flip_audio.exists():
            try:
                generate_page_flip_audio(flip_audio)
            except Exception:
                pass

    # 3. Préparer le fichier HTML autonome
    html_content = ""
    if OFFLINE_INDEX_HTML.is_file():
        try:
            html_content = OFFLINE_INDEX_HTML.read_text(encoding="utf-8")
        except Exception:
            pass

    if not html_content:
        html_content = """<!doctype html>
<html lang="fr"><head><meta charset="UTF-8"><title>Flipbook</title></head>
<body><div id="app"></div></body></html>"""

    # Injecter les données du projet dans index.html
    embedded_script = (
        f'<script id="flipbook-project" type="application/json">\n'
        f"{json.dumps(project, ensure_ascii=False, indent=2)}\n"
        f"</script>\n"
    )

    if "</body>" in html_content:
        index_html_final = html_content.replace("</body>", f"{embedded_script}</body>")
    else:
        index_html_final = html_content + embedded_script

    # 4. Construire l'archive ZIP en mémoire
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        # a. index.html
        zf.writestr("index.html", index_html_final.encode("utf-8"))

        # b. Ouvrir_Flipbook.bat
        zf.writestr("Ouvrir_Flipbook.bat", BAT_SCRIPT_TEMPLATE.encode("utf-8"))

        # c. my-book.flipbook.json
        project_json_str = json.dumps(project, ensure_ascii=False, indent=2)
        zf.writestr(f"{safe_title}.flipbook.json", project_json_str.encode("utf-8"))

        # d. public/ assets depuis job_dir
        if job_dir and job_dir.is_dir():
            public_dir = job_dir / "public"
            if public_dir.is_dir():
                for file_path in public_dir.rglob("*"):
                    if file_path.is_file():
                        rel_path = file_path.relative_to(job_dir)
                        zf.write(file_path, arcname=str(rel_path).replace("\\", "/"))

    buffer.seek(0)
    zip_bytes = buffer.getvalue()

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_title}.zip"; filename*=UTF-8\'\'{encoded_title}',
            "Content-Length": str(len(zip_bytes)),
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
        },
    )


@router.post("/export")
async def export_flipbook_zip(request: Request):
    """
    Exporte le projet Flipbook complet sous forme d'archive .zip autonome (POST)
    """
    try:
        raw_body = await request.body()
        if raw_body:
            payload = json.loads(raw_body.decode("utf-8"))
        else:
            payload = {}
    except Exception as exc:
        log.warning("JSON decode failed in /export: %s", exc)
        payload = {}

    if not isinstance(payload, dict):
        payload = {}

    job_id = payload.get("jobId")
    if isinstance(job_id, str):
        job_id = job_id.replace("-", "").strip()

    project = payload.get("project") or {}
    if not isinstance(project, dict):
        project = {}

    start_mode = payload.get("format", "flipbook")
    return _build_zip_response(project, job_id, start_mode)


@router.post("/export/save")
async def save_export_project(request: Request):
    """
    Sauvegarde le projet (interactions, modales, etc.) sur le serveur sans transférer l'archive binaire.
    Renvoie immédiatement l'URL de téléchargement direct.
    """
    try:
        raw_body = await request.body()
        payload = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception:
        payload = {}

    job_id = (payload.get("jobId") or "").replace("-", "").strip()
    project = payload.get("project") or {}
    start_mode = payload.get("format", "flipbook")
    project["startMode"] = start_mode

    job_dir = jobs.existing_job_dir(job_id) if job_id else None
    if job_dir and job_dir.is_dir():
        dirs = _dirs(job_dir)
        dirs["modals"].mkdir(parents=True, exist_ok=True)
        try:
            project, _ = crop_zoom_zones(job_dir, project)
        except Exception:
            pass
        flip_audio = dirs["audio"] / "page-flip.wav"
        if not flip_audio.exists():
            try:
                generate_page_flip_audio(flip_audio)
            except Exception:
                pass
        (job_dir / "project.json").write_text(json.dumps(project, ensure_ascii=False, indent=2), encoding="utf-8")
        return {"ok": True, "jobId": job_id, "downloadUrl": f"/export/{job_id}"}

    return {"ok": False, "error": "Job introuvable"}


@router.get("/export")
@router.get("/export/{job_id}")
async def export_flipbook_zip_get(job_id: str = "", format: str = "flipbook"):
    """
    Permet le téléchargement direct de l'archive .zip autonome via un lien GET ou barre d'adresse.
    """
    clean_job_id = (job_id or "").replace("-", "").strip()
    project = {}
    if clean_job_id:
        job_dir = jobs.existing_job_dir(clean_job_id)
        if job_dir:
            proj_file = job_dir / "project.json"
            if proj_file.is_file():
                try:
                    project = json.loads(proj_file.read_text(encoding="utf-8"))
                except Exception:
                    pass
    return _build_zip_response(project, clean_job_id, format)
