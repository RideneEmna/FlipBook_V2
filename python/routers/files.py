from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from core import jobs
from core.render import register_asset

router = APIRouter()


@router.get("/files/{job_id}/public/{file_path:path}")
async def get_public_file(job_id: str, file_path: str):
    """Sert les pages, miniatures, audio et zooms d'un job (même arborescence public/... que le ZIP)."""
    folder = jobs.existing_job_dir(job_id)
    if folder is None:
        raise HTTPException(status_code=404, detail="Fichier introuvable ou expiré")

    root = (folder / "public").resolve()
    target = (root / file_path).resolve()
    if not target.is_relative_to(root) or not target.is_file():
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    return FileResponse(target, headers={"Cache-Control": "private, max-age=3600"})


@router.post("/jobs/{job_id}/assets", status_code=201)
def upload_asset(
    job_id: str,
    kind: Annotated[str, Form()],
    file: UploadFile = File(...),
):
    """Enregistre un fichier de l'enseignant (kind = "audio" ou "modals") et renvoie son chemin public/..."""
    folder = jobs.existing_job_dir(job_id)
    if folder is None:
        raise HTTPException(status_code=404, detail="Travail introuvable ou expiré")
    try:
        path = register_asset(folder, kind, file.filename or "", file.file, max_bytes=jobs.MAX_ASSET_BYTES)
    except ValueError as exc:
        status = 413 if "volumineux" in str(exc) else 400
        raise HTTPException(status_code=status, detail=str(exc))
    return {"path": path}
