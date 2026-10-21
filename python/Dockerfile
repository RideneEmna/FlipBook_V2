# Build from the repo root:  docker build -f python/Dockerfile .
FROM node:22-slim AS offline
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/viewer/package.json packages/viewer/
COPY apps/offline/package.json apps/offline/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace=apps/offline --include-workspace-root
COPY packages/viewer packages/viewer
COPY apps/offline apps/offline
RUN npm run build -w apps/offline

FROM python:3.12-slim
WORKDIR /app
COPY python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY python/ .
COPY --from=offline /repo/apps/offline/dist/index.html /app/offline-viewer/index.html
ENV OFFLINE_VIEWER_PATH=/app/offline-viewer/index.html
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
