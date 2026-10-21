# FlipBook Converter (monorepo)

| Folder | Role |
|---|---|
| `packages/viewer` | `@flipbook/viewer`: shared React viewer, types, store (no Next.js imports) |
| `apps/web` | Next.js app: Studio, upload page, viewer preview |
| `apps/offline` | Vite build: single-file `index.html` placed in the exported ZIP |
| `python` | FastAPI service: PDF to WebP, TTS, import/export ZIP |
| `tests/fixtures` | Sample projects (`Unit1`, `Starter Unit`) |
| `docs/legacy-reference` | Old Studio JS and `generate_offline_html.py`, kept for reading only |

## First run
```bash
npm install
cp apps/web/.env.example apps/web/.env.local
cp python/.env.example python/.env
python -m venv python/.venv
# activate: Windows python\.venv\Scripts\activate | Linux/macOS source python/.venv/bin/activate
pip install -r python/requirements.txt
npm run build:offline   # needs the viewer components copied first
npm run dev:python      # terminal 1, http://127.0.0.1:8000/docs
npm run dev:web         # terminal 2, http://localhost:3000
```
