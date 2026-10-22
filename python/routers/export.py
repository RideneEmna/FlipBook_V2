import io
import json
import logging
import os
import re
import urllib.parse
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
    Path(os.environ["OFFLINE_VIEWER_PATH"])
    if os.environ.get("OFFLINE_VIEWER_PATH") and Path(os.environ["OFFLINE_VIEWER_PATH"]).is_file()
    else (Path(__file__).resolve().parent.parent.parent / "apps" / "offline" / "dist" / "index.html")
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

python -m http.server 8080 --bind 127.0.0.1 2>nul || python -m http.server 8080 2>nul || python3 -m http.server 8080 --bind 127.0.0.1 2>nul || py -m http.server 8080 2>nul || (
    echo.
    echo Python n'est pas installe sur cet ordinateur.
    echo Ouverture directe du fichier index.html dans votre navigateur...
    start "" "%~dp0index.html"
)
pause
"""

BAT_KIOSK_TEMPLATE = """@echo off
chcp 65001 >nul
title Flipbook Studio Pro - Mode Kiosque Plein Ecran
echo ======================================================================
echo   Flipbook Studio Pro - Lancement en Mode Kiosque Plein Ecran
echo ======================================================================
echo.

cd /d "%~dp0"

if not exist "%~dp0index.html" (
    echo ======================================================================
    echo   ATTENTION : ARCHIVE ZIP NON EXTRAITE !
    echo ======================================================================
    echo.
    echo   Le fichier "index.html" est introuvable dans ce dossier.
    echo   Veuillez extraire l'archive ZIP avant de lancer ce script.
    echo.
    pause
    exit /b 1
)

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8080" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Demarrage du mode Kiosque plein ecran...
echo (Pour quitter a tout moment : cliquez sur le bouton [X Quitter] ou appuyez sur Alt+F4)
echo.

set "TARGET_URL=http://localhost:8080/index.html?kiosk=1"

start msedge --app="%TARGET_URL%" --start-fullscreen 2>nul || (
    start msedge --kiosk "%TARGET_URL%" --edge-kiosk-type=fullscreen 2>nul || (
        start chrome --app="%TARGET_URL%" --start-fullscreen 2>nul || (
            start chrome --kiosk "%TARGET_URL%" 2>nul || (
                start "" "%TARGET_URL%"
            )
        )
    )
)

python -m http.server 8080 --bind 127.0.0.1 2>nul || python -m http.server 8080 2>nul || python3 -m http.server 8080 --bind 127.0.0.1 2>nul || py -m http.server 8080 2>nul || (
    echo.
    echo Serveur Python non detecte. Lancement direct...
    start msedge --app="%~dp0index.html?kiosk=1" --start-fullscreen 2>nul || start msedge --kiosk "%~dp0index.html?kiosk=1" 2>nul || start chrome --app="%~dp0index.html?kiosk=1" --start-fullscreen 2>nul || start "" "%~dp0index.html"
)
pause
"""

PWA_ICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#7c3aed" />
    </linearGradient>
    <linearGradient id="pageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f1f5f9" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  <g filter="url(#shadow)">
    <path d="M 100 140 Q 180 155 256 175 L 256 375 Q 180 355 100 340 Z" fill="url(#pageGrad)" />
    <path d="M 412 140 Q 332 155 256 175 L 256 375 Q 332 355 412 340 Z" fill="#e2e8f0" />
    <line x1="256" y1="172" x2="256" y2="378" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round" />
    <path d="M 256 175 Q 310 120 355 130 L 355 330 Q 310 320 256 375 Z" fill="url(#accentGrad)" opacity="0.92" />
    <circle cx="370" cy="115" r="10" fill="#fbbf24" />
    <path d="M 370 95 L 373 110 L 388 113 L 373 116 L 370 131 L 367 116 L 352 113 L 367 110 Z" fill="#fbbf24" />
    <circle cx="135" cy="185" r="7" fill="#67e8f9" />
    <circle cx="165" cy="225" r="5" fill="#a5b4fc" />
  </g>
</svg>"""

PWA_SW_JS = """// Student Flipbook Offline Service Worker - PWA & Offline Support
const CACHE_NAME = 'flipbook-offline-v1';
const OFFLINE_URLS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const netFetch = fetch(event.request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || netFetch;
    })
  );
});
"""


def _sanitize_filename(name: str) -> str:
    cleaned = re.sub(r'[\\/*?:"<>|]', "_", name or "mon-flipbook").strip()
    return cleaned or "mon-flipbook"


def _build_zip_response(project: dict[str, Any], job_id: str | None, start_mode: str | None = None) -> Response:
    if not start_mode:
        start_mode = project.get("startMode") or "flipbook"
    if start_mode in ("slides", "flipbook"):
        project["startMode"] = start_mode
    else:
        project["startMode"] = project.get("startMode") or "flipbook"
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

        # b. Scripts de lancement autonome Windows
        zf.writestr("Ouvrir_Flipbook.bat", BAT_SCRIPT_TEMPLATE.encode("utf-8"))
        zf.writestr("Lancer_Mode_Kiosque.bat", BAT_KIOSK_TEMPLATE.encode("utf-8"))

        # c. PWA & Mode Kiosque (Manifest, Service Worker, Icône)
        pwa_manifest = {
            "name": title or "Flipbook Interactif",
            "short_name": title or "Flipbook",
            "description": "Livre interactif et diapositives éducatives",
            "start_url": "./index.html",
            "id": "./index.html",
            "display": "fullscreen",
            "display_override": ["fullscreen", "standalone", "minimal-ui", "browser"],
            "background_color": "#0d0a27",
            "theme_color": "#17143F",
            "orientation": "any",
            "categories": ["education", "books"],
            "icons": [
                {
                    "src": "icon.svg",
                    "sizes": "512x512",
                    "type": "image/svg+xml",
                    "purpose": "any"
                },
                {
                    "src": "icon.svg",
                    "sizes": "192x192 512x512",
                    "type": "image/svg+xml",
                    "purpose": "maskable"
                }
            ]
        }
        zf.writestr("manifest.json", json.dumps(pwa_manifest, ensure_ascii=False, indent=2).encode("utf-8"))
        zf.writestr("sw.js", PWA_SW_JS.encode("utf-8"))
        zf.writestr("icon.svg", PWA_ICON_SVG.encode("utf-8"))

        # d. my-book.flipbook.json
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

    start_mode = payload.get("format") or project.get("startMode") or "flipbook"
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
    start_mode = payload.get("format") or project.get("startMode") or "flipbook"
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
        return {"ok": True, "jobId": job_id, "downloadUrl": f"/export/{job_id}?format={start_mode}"}

    return {"ok": False, "error": "Job introuvable"}


@router.get("/export")
@router.get("/export/{job_id}")
async def export_flipbook_zip_get(job_id: str = "", format: str | None = None):
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
    chosen_mode = format if (format and format in ("flipbook", "slides")) else (project.get("startMode") or "flipbook")
    return _build_zip_response(project, clean_job_id, chosen_mode)
