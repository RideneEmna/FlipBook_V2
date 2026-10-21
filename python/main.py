import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core import jobs
from routers import convert, export, files

log = logging.getLogger("flipbook")

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
PURGE_EVERY_SECONDS = 600


async def _purge_loop():
    while True:
        await asyncio.sleep(PURGE_EVERY_SECONDS)
        try:
            await asyncio.to_thread(jobs.purge_expired)
        except Exception:
            log.exception("Nettoyage des fichiers expirés échoué")


@asynccontextmanager
async def lifespan(app: FastAPI):
    jobs.JOBS_DIR.mkdir(parents=True, exist_ok=True)
    jobs.purge_expired()
    task = asyncio.create_task(_purge_loop())
    yield
    task.cancel()


app = FastAPI(title="FlipBook Converter service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Length"],
)

app.include_router(convert.router)
app.include_router(files.router)
app.include_router(export.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
