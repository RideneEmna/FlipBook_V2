import asyncio
import json
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import StreamingResponse

from core import jobs

router = APIRouter()

CHUNK = 1024 * 1024
POLL_SECONDS = 0.4
KEEPALIVE_SECONDS = 15


def _job_or_404(job_id: str) -> jobs.Job:
    job = jobs.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Travail introuvable ou expiré")
    return job


@router.post("/convert", status_code=202)
async def start_conversion(
    file: UploadFile = File(...),
    dpi: Annotated[int, Form(ge=72, le=600)] = 300,
    quality: Annotated[int, Form(ge=1, le=100)] = 85,
):
    """Reçoit un PDF, lance la conversion en tâche de fond et renvoie le jobId."""
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Seuls les fichiers PDF sont acceptés")

    jobs.purge_expired()
    job = jobs.create_job()
    pdf_path = jobs.job_path(job.id) / "source.pdf"

    try:
        size = 0
        with open(pdf_path, "wb") as out:
            while True:
                chunk = await file.read(CHUNK)
                if not chunk:
                    break
                if size == 0 and b"%PDF-" not in chunk[:1024]:
                    raise HTTPException(status_code=415, detail="Ce fichier n'est pas un PDF valide")
                size += len(chunk)
                if size > jobs.MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Fichier trop volumineux (maximum {jobs.MAX_UPLOAD_MB} Mo)",
                    )
                out.write(chunk)
        if size == 0:
            raise HTTPException(status_code=400, detail="Le fichier est vide")
    except BaseException:
        jobs.discard_job(job.id)
        raise

    jobs.start_job(job, dpi, quality)
    return {"jobId": job.id}


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """État du job. 404 si les fichiers ont expiré (le Studio s'en sert pour jobExists)."""
    job = _job_or_404(job_id)
    data, _ = jobs.snapshot(job)
    return data


@router.get("/jobs/{job_id}/stream")
async def stream_job(job_id: str, request: Request):
    """Progression en Server-Sent Events : un message `data: {...}` à chaque changement."""
    job = _job_or_404(job_id)

    async def events():
        last_version = -1
        silent = 0.0
        while True:
            if await request.is_disconnected():
                break
            data, version = jobs.snapshot(job)
            if version != last_version:
                last_version = version
                silent = 0.0
                yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
                if data["status"] in (jobs.COMPLETED, jobs.ERROR):
                    break
            else:
                silent += POLL_SECONDS
                if silent >= KEEPALIVE_SECONDS:
                    silent = 0.0
                    yield ": keep-alive\n\n"
            await asyncio.sleep(POLL_SECONDS)

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.delete("/jobs/{job_id}", status_code=204)
async def delete_job(job_id: str):
    """Supprime un job terminé et ses fichiers."""
    outcome = jobs.delete_job(job_id)
    if outcome == "missing":
        raise HTTPException(status_code=404, detail="Travail introuvable ou expiré")
    if outcome == "busy":
        raise HTTPException(status_code=409, detail="La conversion est encore en cours")
    return Response(status_code=204)
