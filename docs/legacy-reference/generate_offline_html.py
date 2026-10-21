#!/usr/bin/env python3
"""
generate_offline_html.py
Génère un fichier HTML5 autonome (offline) pour le Flipbook Interactif
Best English Unit 1. Le fichier est auto-contenu : il embarque la
bibliothèque page-flip, tout le CSS et le JS, et référence les images
et fichiers audio via des chemins relatifs locaux.

Usage : python scripts/generate_offline_html.py
Output : flipbook-offline.html  (à la racine du projet)
Prérequis : Les dossiers public/pages/ et public/audio/ doivent exister.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGEFLIP_JS = os.path.join(ROOT, "node_modules", "page-flip", "dist", "js", "page-flip.browser.js")
INTERACTIONS_JSON = os.path.join(ROOT, "src", "data", "interactions.json")
OUTPUT_HTML = os.path.join(ROOT, "flipbook-offline.html")


def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def main():
    print("Reading page-flip library...")
    pageflip_src = read_file(PAGEFLIP_JS)

    print("Reading interactions data...")
    with open(INTERACTIONS_JSON, "r", encoding="utf-8") as f:
        book_data = json.load(f)

    # Remap paths: /pages/ → public/pages/ (relative to HTML file location)
    for page in book_data["pages"]:
        page["imagePath"] = "public" + page["imagePath"]
        page["thumbPath"] = "public" + page["thumbPath"]
        for inter in page.get("interactions", []):
            if inter.get("type") == "audio":
                inter["src"] = "public" + inter["src"]
            if inter.get("type") == "zoom":
                inter["hiresSrc"] = "public" + inter["hiresSrc"]

    book_json_str = json.dumps(book_data, ensure_ascii=False, indent=0)

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>{book_data['title']} — Flipbook Interactif Offline</title>
  <meta name="description" content="Flipbook interactif haute fidélité pour Best English Unit 1, utilisable hors ligne." />
  <style>
    /* ══════════════════════════════════════════════════════════
       RESET & ROOT
    ══════════════════════════════════════════════════════════ */
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

    :root {{
      --bg: #090d16;
      --bg2: #0f172a;
      --bg3: #1e293b;
      --border: #334155;
      --amber: #f59e0b;
      --amber-light: #fbbf24;
      --amber-dark: #d97706;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --danger: #ef4444;
    }}

    html, body {{
      height: 100%;
      width: 100%;
      overflow: hidden;
      background: radial-gradient(ellipse at top, #1e293b, #090d16);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      user-select: none;
      -webkit-user-select: none;
    }}

    /* ══════════════════════════════════════════════════════════
       LAYOUT
    ══════════════════════════════════════════════════════════ */
    #app {{
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
    }}

    /* ══════════════════════════════════════════════════════════
       HEADER
    ══════════════════════════════════════════════════════════ */
    #header {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: rgba(9,13,22,0.92);
      border-bottom: 1px solid rgba(51,65,85,0.8);
      backdrop-filter: blur(12px);
      z-index: 30;
      flex-shrink: 0;
      gap: 8px;
    }}
    #header .brand {{
      display: flex;
      align-items: center;
      gap: 10px;
    }}
    #header .book-icon {{
      width: 32px; height: 32px;
      background: linear-gradient(135deg, #d97706, #f59e0b);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(245,158,11,0.2);
      flex-shrink: 0;
    }}
    #header .title-group h1 {{
      font-size: 13px;
      font-weight: 700;
      color: #f1f5f9;
      display: flex; align-items: center; gap: 6px;
      flex-wrap: wrap;
    }}
    #header .badge {{
      font-size: 10px; font-weight: 400;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(245,158,11,0.15);
      color: #fbbf24;
      border: 1px solid rgba(245,158,11,0.3);
    }}
    #header .subtitle {{
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }}
    #header .header-right {{
      display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    }}
    .audio-playing-indicator {{
      display: none;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      background: rgba(245,158,11,0.1);
      border: 1px solid rgba(245,158,11,0.3);
      color: #fbbf24;
      font-size: 11px;
      font-weight: 500;
      animation: pulse 2s infinite;
    }}
    .audio-playing-indicator.active {{ display: flex; }}
    .audio-bars {{
      display: flex; align-items: center; gap: 2px; height: 12px;
    }}
    .audio-bars span {{
      display: block; width: 2px; border-radius: 2px;
      background: #f59e0b;
      animation: bounce-bar 0.8s ease-in-out infinite;
    }}
    .audio-bars span:nth-child(1) {{ height: 12px; animation-delay: 0s; }}
    .audio-bars span:nth-child(2) {{ height: 8px; animation-delay: 0.15s; }}
    .audio-bars span:nth-child(3) {{ height: 12px; animation-delay: 0.3s; }}
    @keyframes bounce-bar {{
      0%, 100% {{ transform: scaleY(0.4); }}
      50% {{ transform: scaleY(1); }}
    }}
    @keyframes pulse {{
      0%, 100% {{ opacity: 1; }}
      50% {{ opacity: 0.7; }}
    }}
    .btn-header {{
      display: flex; align-items: center; gap: 6px;
      padding: 5px 10px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--bg3);
      color: var(--text);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }}
    .btn-header:hover {{ background: #334155; color: var(--amber); }}
    .btn-header.active {{
      background: var(--amber);
      color: #0f172a;
      border-color: var(--amber-light);
    }}
    .btn-stop {{
      background: none; border: none;
      padding: 2px; border-radius: 4px;
      cursor: pointer; color: #fbbf24;
      font-size: 14px; line-height: 1;
      transition: background 0.15s;
    }}
    .btn-stop:hover {{ background: rgba(245,158,11,0.3); }}

    /* ══════════════════════════════════════════════════════════
       FLIPBOOK AREA & PAGE-FLIP ENGINE CORE
    ══════════════════════════════════════════════════════════ */
    #viewer-wrap {{
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
      padding: 10px 16px 70px 16px;
      box-sizing: border-box;
    }}
    #viewer-wrap.modal-active {{ pointer-events: none; user-select: none; }}

    /* ── Cyan Circular Navigation Buttons (Collés aux bordures du livre) ── */
    .nav-circle-btn {{
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 100;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      background: #00a2ed;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0, 162, 237, 0.5), 0 2px 8px rgba(0, 0, 0, 0.35);
      transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.18s ease, box-shadow 0.18s ease;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      padding: 0;
    }}
    .nav-circle-btn svg {{
      display: block;
      width: 28px;
      height: 28px;
      stroke: #ffffff;
      stroke-width: 4;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
      transition: transform 0.15s ease;
    }}
    .nav-btn-prev {{
      left: -26px;
    }}
    .nav-btn-prev svg {{
      transform: translateX(-1px);
    }}
    .nav-btn-next {{
      right: -26px;
    }}
    .nav-btn-next svg {{
      transform: translateX(1px);
    }}
    .nav-circle-btn:hover {{
      background: #008cd0;
      transform: translateY(-50%) scale(1.12);
      box-shadow: 0 6px 24px rgba(0, 162, 237, 0.7), 0 0 0 3px rgba(255, 255, 255, 0.7);
    }}
    .nav-btn-prev:hover svg {{
      transform: translateX(-3px);
    }}
    .nav-btn-next:hover svg {{
      transform: translateX(3px);
    }}
    .nav-circle-btn:active {{
      transform: translateY(-50%) scale(0.92);
    }}
    .nav-circle-btn:disabled {{
      opacity: 0.18;
      pointer-events: none;
      transform: translateY(-50%) scale(0.9);
      box-shadow: none;
    }}
    @media (max-width: 768px) {{
      .nav-circle-btn {{
        width: 40px;
        height: 40px;
        border-width: 2px;
      }}
      .nav-circle-btn svg {{
        width: 22px;
        height: 22px;
        stroke-width: 3.5;
      }}
      .nav-btn-prev {{ left: -16px; }}
      .nav-btn-next {{ right: -16px; }}
    }}

    #flipbook-container {{
      position: relative;
      margin: 0 auto;
      box-sizing: border-box;
    }}

    .stf__parent {{
      position: relative !important;
      display: block !important;
      margin: 0 auto !important;
      box-sizing: border-box !important;
      transform: translateZ(0);
      touch-action: pan-y;
    }}

    .stf__wrapper,
    .sft__wrapper {{
      position: relative !important;
      width: 100% !important;
      height: 100% !important;
      box-sizing: border-box !important;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.75),
                  0 0 35px rgba(0,0,0,0.45);
      border-radius: 6px;
    }}

    .stf__parent canvas {{
      position: absolute !important;
      width: 100% !important;
      height: 100% !important;
      left: 0 !important;
      top: 0 !important;
    }}

    .stf__block {{
      position: absolute !important;
      width: 100% !important;
      height: 100% !important;
      box-sizing: border-box !important;
      perspective: 2000px;
    }}

    .stf__item {{
      display: none;
      position: absolute !important;
      transform-style: preserve-3d;
      box-sizing: border-box !important;
    }}

    .stf__outerShadow,
    .stf__innerShadow,
    .stf__hardShadow,
    .stf__hardInnerShadow {{
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
    }}

    /* ══════════════════════════════════════════════════════════
       PAGE OVERLAY
    ══════════════════════════════════════════════════════════ */
    .page-item {{
      background: #ffffff;
      overflow: hidden;
      box-sizing: border-box;
      user-select: none;
      -webkit-user-select: none;
    }}
    .page-img {{
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      object-fit: fill;
      display: block;
      pointer-events: none;
    }}
    .page-spine-left {{
      position: absolute; inset: 0;
      background: linear-gradient(to right, rgba(0,0,0,0.02) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.18) 100%);
      pointer-events: none;
    }}
    .page-spine-right {{
      position: absolute; inset: 0;
      background: linear-gradient(to left, rgba(0,0,0,0.02) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.18) 100%);
      pointer-events: none;
    }}
    .page-overlay {{
      position: absolute; inset: 0;
      pointer-events: auto;
    }}
    .page-num {{
      position: absolute;
      bottom: 6px;
      font-size: 10px;
      font-family: monospace;
      color: rgba(100,116,139,0.6);
      pointer-events: none;
    }}
    .page-num.left {{ left: 10px; }}
    .page-num.right {{ right: 10px; }}

    /* ══════════════════════════════════════════════════════════
       AUDIO BUTTONS
    ══════════════════════════════════════════════════════════ */
    .audio-btn {{
      position: absolute;
      transform: translate(-50%, -50%);
      z-index: 20;
      width: 28px; height: 28px;
      border-radius: 50%;
      border: 1px solid rgba(245,158,11,0.4);
      background: rgba(9,13,22,0.82);
      color: #fbbf24;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all 0.18s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      font-size: 12px;
    }}
    .audio-btn:hover {{
      background: var(--amber);
      color: #0f172a;
      transform: translate(-50%, -50%) scale(1.1);
      box-shadow: 0 0 12px rgba(245,158,11,0.4);
    }}
    .audio-btn.playing {{
      background: var(--amber);
      color: #0f172a;
      transform: translate(-50%, -50%) scale(1.12);
      box-shadow: 0 0 0 3px rgba(245,158,11,0.25), 0 0 16px rgba(245,158,11,0.5);
      animation: audio-pulse-ring 1.2s ease-out infinite;
    }}
    @keyframes audio-pulse-ring {{
      0% {{ box-shadow: 0 0 0 0 rgba(245,158,11,0.5), 0 0 16px rgba(245,158,11,0.4); }}
      70% {{ box-shadow: 0 0 0 8px rgba(245,158,11,0), 0 0 16px rgba(245,158,11,0.4); }}
      100% {{ box-shadow: 0 0 0 0 rgba(245,158,11,0), 0 0 16px rgba(245,158,11,0.4); }}
    }}
    .audio-btn .tooltip {{
      display: none;
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(9,13,22,0.95);
      color: #fbbf24;
      font-size: 10px;
      padding: 3px 8px;
      border-radius: 4px;
      white-space: nowrap;
      border: 1px solid var(--border);
      pointer-events: none;
      z-index: 100;
    }}
    .audio-btn:hover .tooltip {{ display: block; }}

    /* ══════════════════════════════════════════════════════════
       ZOOM ZONES
    ══════════════════════════════════════════════════════════ */
    .zoom-zone {{
      position: absolute;
      border: 1px dashed transparent;
      border-radius: 8px;
      z-index: 10;
      cursor: zoom-in;
      transition: border-color 0.2s, background 0.2s;
    }}
    .zoom-zone:hover {{
      border-color: rgba(245,158,11,0.6);
      background: rgba(245,158,11,0.04);
    }}
    .zoom-badge {{
      position: absolute;
      top: 4px; right: 4px;
      display: flex; align-items: center; gap: 4px;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(9,13,22,0.9);
      border: 1px solid rgba(245,158,11,0.3);
      color: #fbbf24;
      font-size: 10px;
      font-weight: 600;
      opacity: 0.5;
      cursor: zoom-in;
      transition: opacity 0.2s, background 0.2s, transform 0.15s;
    }}
    .zoom-zone:hover .zoom-badge {{
      opacity: 1;
    }}
    .zoom-badge:hover {{
      background: var(--amber);
      color: #0f172a;
      transform: scale(1.05);
    }}

    /* ══════════════════════════════════════════════════════════
       CONTROL DOCK (bottom)
    ══════════════════════════════════════════════════════════ */
    #controls {{
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 40;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 18px;
      background: rgba(9,13,22,0.9);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(51,65,85,0.6);
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      color: var(--text);
      white-space: nowrap;
    }}
    .ctrl-btn {{
      padding: 6px;
      border-radius: 8px;
      border: none;
      background: none;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      line-height: 1;
    }}
    .ctrl-btn:hover {{ background: rgba(30,41,59,0.8); color: var(--amber); }}
    .ctrl-btn:disabled {{ opacity: 0.3; pointer-events: none; }}
    .ctrl-btn.active {{
      background: var(--amber);
      color: #0f172a;
      box-shadow: 0 0 10px rgba(245,158,11,0.3);
    }}
    .ctrl-divider {{
      width: 1px; height: 20px;
      background: var(--border);
      margin: 0 2px;
    }}
    #page-indicator {{
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(30,41,59,0.8);
      border: 1px solid rgba(51,65,85,0.8);
      color: #fbbf24;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: border-color 0.15s;
    }}
    #page-indicator:hover {{ border-color: var(--amber); }}
    .page-total {{ color: #64748b; font-weight: 400; }}

    /* ══════════════════════════════════════════════════════════
       THUMBNAIL DRAWER
    ══════════════════════════════════════════════════════════ */
    #thumb-drawer-backdrop {{
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      z-index: 49;
    }}
    #thumb-drawer-backdrop.open {{ display: block; }}
    #thumb-drawer {{
      position: fixed;
      bottom: 0; left: 0; right: 0;
      max-height: 75vh;
      background: rgba(9,13,22,0.97);
      border-top: 1px solid var(--border);
      border-radius: 16px 16px 0 0;
      z-index: 50;
      display: flex;
      flex-direction: column;
      transform: translateY(100%);
      transition: transform 0.25s ease-out;
      padding: 16px;
    }}
    #thumb-drawer.open {{ transform: translateY(0); }}
    #thumb-drawer-header {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--bg3);
      margin-bottom: 12px;
      font-weight: 600;
      font-size: 14px;
    }}
    #thumb-drawer-close {{
      background: none; border: none;
      cursor: pointer; color: #94a3b8;
      font-size: 20px; line-height: 1;
      padding: 4px;
      border-radius: 50%;
      transition: all 0.15s;
    }}
    #thumb-drawer-close:hover {{ color: var(--text); background: var(--bg3); }}
    #thumb-grid {{
      overflow-y: auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 10px;
      padding-bottom: 12px;
    }}
    .thumb-item {{
      display: flex; flex-direction: column;
      align-items: center; gap: 4px;
      padding: 6px;
      border-radius: 8px;
      border: 1px solid var(--bg3);
      cursor: pointer;
      transition: all 0.15s;
    }}
    .thumb-item:hover {{ background: var(--bg3); border-color: var(--border); }}
    .thumb-item.active {{
      border-color: var(--amber);
      background: rgba(245,158,11,0.08);
      transform: scale(1.04);
      box-shadow: 0 0 12px rgba(245,158,11,0.2);
    }}
    .thumb-item img {{
      width: 100%; aspect-ratio: 0.707;
      object-fit: cover;
      border-radius: 4px;
      background: var(--bg3);
    }}
    .thumb-num {{
      font-size: 10px;
      color: var(--text-muted);
      font-weight: 600;
    }}
    .thumb-item.active .thumb-num {{ color: var(--amber); }}

    /* ══════════════════════════════════════════════════════════
       MODAL LIGHTBOX (Règle R2)
    ══════════════════════════════════════════════════════════ */
    #image-modal {{
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9000;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 10px;
    }}
    #image-modal.open {{
      display: flex;
      animation: modal-in 0.15s ease-out both;
    }}
    @keyframes modal-in {{
      from {{ opacity: 0; }}
      to {{ opacity: 1; }}
    }}
    #modal-backdrop {{
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.88);
      backdrop-filter: blur(6px);
      cursor: zoom-out;
    }}
    #modal-inner {{
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      max-width: 90vw;
      max-height: 90vh;
      animation: modal-scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
    }}
    @keyframes modal-scale-in {{
      from {{ transform: scale(0.72); opacity: 0; }}
      to {{ transform: scale(1); opacity: 1; }}
    }}
    #modal-controls {{
      display: flex; align-items: center; gap: 6px;
      padding: 6px 12px;
      background: rgba(9,13,22,0.92);
      border: 1px solid rgba(51,65,85,0.8);
      border-radius: 12px;
      backdrop-filter: blur(8px);
    }}
    #zoom-level {{
      font-size: 12px; font-family: monospace;
      font-weight: 700; color: var(--amber);
      min-width: 44px; text-align: center;
    }}
    .modal-btn {{
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      border: none; border-radius: 8px;
      background: none; color: #94a3b8;
      font-size: 15px; cursor: pointer;
      transition: all 0.15s;
    }}
    .modal-btn:hover {{ background: rgba(30,41,59,0.8); color: var(--amber); }}
    .modal-btn:disabled {{ opacity: 0.3; pointer-events: none; }}
    .modal-btn.close:hover {{ background: var(--danger); color: #fff; }}
    .modal-sep {{ width: 1px; height: 16px; background: var(--border); }}
    #modal-img-wrap {{
      position: relative;
      overflow: hidden;
      border-radius: 8px;
      border: 1px solid rgba(51,65,85,0.5);
      background: #0f172a;
      box-shadow: 0 24px 64px rgba(0,0,0,0.8);
      max-width: 90vw;
      max-height: calc(90vh - 60px);
    }}
    #modal-img {{
      display: block;
      max-width: 88vw;
      max-height: calc(88vh - 70px);
      object-fit: contain;
      transform-origin: center center;
      will-change: transform;
      transition: transform 0.08s ease-out;
      user-select: none;
      -webkit-user-drag: none;
    }}
    #modal-hint {{
      font-size: 11px; color: #475569; text-align: center;
      user-select: none;
    }}
    #modal-hint kbd {{
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--bg3);
      border: 1px solid var(--border);
      color: #64748b;
      font-size: 10px;
    }}

    /* Help Modal */
    #help-modal {{
      display: none;
      position: fixed; inset: 0;
      z-index: 8000;
      align-items: center; justify-content: center;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
    }}
    #help-modal.open {{ display: flex; animation: modal-in 0.12s ease-out; }}
    #help-box {{
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: 14px; padding: 20px;
      max-width: 340px; width: 90%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    }}
    #help-box h3 {{ font-size: 14px; color: var(--amber); margin-bottom: 14px; }}
    #help-box ul {{ list-style: none; display: flex; flex-direction: column; gap: 8px; }}
    #help-box li {{ display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #94a3b8; }}
    #help-box kbd {{
      padding: 2px 6px; border-radius: 4px;
      background: var(--bg3); border: 1px solid var(--border);
      color: #64748b; font-size: 10px;
    }}
    .help-close-btn {{
      margin-top: 16px; padding-top: 12px;
      border-top: 1px solid var(--bg3);
      display: flex; justify-content: flex-end;
    }}
    .help-close-btn button {{
      padding: 6px 16px; border-radius: 6px;
      background: var(--amber); color: #0f172a;
      font-weight: 700; font-size: 12px;
      border: none; cursor: pointer;
      transition: background 0.15s;
    }}
    .help-close-btn button:hover {{ background: var(--amber-light); }}

    /* Scrollbar */
    ::-webkit-scrollbar {{ width: 5px; height: 5px; }}
    ::-webkit-scrollbar-track {{ background: var(--bg2); }}
    ::-webkit-scrollbar-thumb {{ background: var(--border); border-radius: 3px; }}
    ::-webkit-scrollbar-thumb:hover {{ background: var(--amber); }}
  </style>
</head>
<body>
<div id="app">
  <!-- ═══════════════════════════════════════════════════ HEADER -->
  <header id="header">
    <div class="brand">
      <div class="book-icon">📖</div>
      <div class="title-group">
        <h1>{book_data['title']} <span class="badge">Double Page</span></h1>
        <p class="subtitle">Unité 1 · Audio, zoom HD & feuilletage interactif</p>
      </div>
    </div>

    <div class="audio-playing-indicator" id="audio-indicator">
      <div class="audio-bars">
        <span></span><span></span><span></span>
      </div>
      <span>Lecture...</span>
      <button class="btn-stop" id="btn-stop-audio" title="Arrêter la lecture">⬛</button>
    </div>

    <div class="header-right">
      <button class="btn-header" id="btn-fullscreen" onclick="toggleFullscreen()" title="Plein écran (F)">
        <span id="fs-icon">⛶</span>
        <span id="fs-label" class="hidden-mobile">Plein Écran</span>
      </button>
      <button class="btn-header" id="btn-toc" onclick="openThumbDrawer()" title="Table des matières">
        Pages <span id="page-range-header" style="color:#64748b; font-weight:400; margin-left:4px">1 / {book_data['totalPages']}</span>
      </button>
    </div>
  </header>

  <!-- ═══════════════════════════════════════════════════ VIEWER -->
  <div id="viewer-wrap">
    <div id="flipbook-container">
      <button class="nav-circle-btn nav-btn-prev" id="nav-prev" onclick="goPrev()" title="Previous (←)" aria-label="Previous Page">
        <svg viewBox="0 0 24 24"><polyline points="15 19 8 12 15 5"></polyline></svg>
      </button>
      <button class="nav-circle-btn nav-btn-next" id="nav-next" onclick="goNext()" title="Next (→)" aria-label="Next Page">
        <svg viewBox="0 0 24 24"><polyline points="9 5 16 12 9 19"></polyline></svg>
      </button>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════ CONTROLS DOCK -->
  <div id="controls">
    <button class="ctrl-btn" id="btn-first"  onclick="goFirst()"  title="First Page (Home)" aria-label="First Page">⏮</button>
    <button class="ctrl-btn" id="btn-prev"   onclick="goPrev()"   title="Previous Page (←)" aria-label="Previous Page">◀</button>
    <span   id="page-indicator" onclick="promptPage()" title="Click to go to page">
      Page <span id="page-left-num">1</span>
      <span class="page-total"> / {book_data['totalPages']}</span>
    </span>
    <button class="ctrl-btn" id="btn-next"   onclick="goNext()"   title="Next Page (→)" aria-label="Next Page">▶</button>
    <button class="ctrl-btn" id="btn-last"   onclick="goLast()"   title="Last Page (End)" aria-label="Last Page">⏭</button>
    <span class="ctrl-divider"></span>
    <button class="ctrl-btn" id="btn-thumbs" onclick="openThumbDrawer()" title="Table of Contents (T)">⊞</button>
    <button class="ctrl-btn" id="btn-sound"  onclick="toggleSound()" title="Page Flip Sound (M)">🔊</button>
    <button class="ctrl-btn" id="btn-fs2"    onclick="toggleFullscreen()" title="Fullscreen (F)">⛶</button>
    <button class="ctrl-btn" id="btn-help"   onclick="openHelp()" title="Help & Shortcuts (?)">?</button>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ THUMBNAIL DRAWER -->
<div id="thumb-drawer-backdrop" onclick="closeThumbDrawer()"></div>
<div id="thumb-drawer">
  <div id="thumb-drawer-header">
    <span>📚 Table des matières — {book_data['totalPages']} pages</span>
    <button id="thumb-drawer-close" onclick="closeThumbDrawer()" aria-label="Fermer">✕</button>
  </div>
  <div id="thumb-grid"></div>
</div>

<!-- ═══════════════════════════════════════════════════ IMAGE MODAL (Règle R2) -->
<div id="image-modal" role="dialog" aria-modal="true" aria-label="Zoom image HD">
  <div id="modal-backdrop" onclick="closeModal()"></div>
  <div id="modal-inner">
    <div id="modal-controls">
      <span id="zoom-level">100%</span>
      <span class="modal-sep"></span>
      <button class="modal-btn" id="btn-zoom-out" onclick="adjustZoom(-0.25)" title="Zoom arrière (−)">−</button>
      <button class="modal-btn" id="btn-zoom-in"  onclick="adjustZoom(0.25)"  title="Zoom avant (+)">+</button>
      <button class="modal-btn" id="btn-zoom-reset" onclick="resetZoom()"     title="Reset (0)">↺</button>
      <span class="modal-sep"></span>
      <button class="modal-btn close" onclick="closeModal()" title="Fermer (Échap)">✕</button>
    </div>
    <div id="modal-img-wrap">
      <img id="modal-img" src="" alt="" loading="eager" draggable="false" />
    </div>
    <p id="modal-hint">Molette pour zoomer · Glisser pour naviguer · <kbd>Échap</kbd> pour fermer · <kbd>+</kbd> / <kbd>−</kbd> / <kbd>0</kbd></p>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ HELP MODAL -->
<div id="help-modal" onclick="closeHelp()">
  <div id="help-box" onclick="event.stopPropagation()">
    <h3>🎹 Navigation & Raccourcis</h3>
    <ul>
      <li><span>Next Page (Suivant)</span><kbd>→</kbd> ou <kbd>PageDown</kbd></li>
      <li><span>Previous Page (Précédent)</span><kbd>←</kbd> ou <kbd>PageUp</kbd></li>
      <li><span>Première / Dernière page</span><kbd>Home</kbd> / <kbd>End</kbd></li>
      <li><span>Couper / Activer le son</span><kbd>M</kbd></li>
      <li><span>Plein écran</span><kbd>F</kbd></li>
      <li><span>Zoomer image</span><span>Clic sur 🔍 Zoom HD ou sur la page</span></li>
      <li><span>Zoomer dans modal</span><kbd>Molette</kbd> ou <kbd>+</kbd> / <kbd>−</kbd></li>
      <li><span>Fermer modal</span><kbd>Échap</kbd></li>
      <li><span>Aide</span><kbd>?</kbd></li>
    </ul>
    <div class="help-close-btn"><button onclick="closeHelp()">Compris</button></div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ PAGE-FLIP LIBRARY -->
<script>
{pageflip_src}
</script>

<!-- ═══════════════════════════════════════════════════ APP SCRIPT -->
<script>
(function() {{
  'use strict';

  // Extract PageFlip class from the library namespace (exports to window.St.PageFlip)
  const PageFlip = St.PageFlip;

  // ── Book Data ──────────────────────────────────────────────────────────────
  const BOOK = {book_json_str};
  const TOTAL = BOOK.totalPages;

  // ── State ──────────────────────────────────────────────────────────────────
  let currentPage = 1;        // 1-indexed page number
  let soundEnabled = true;
  let currentAudio = null;
  let playingAudioId = null;
  let pageFlip = null;
  let thumbDrawerOpen = false;

  // Modal zoom state
  let modalZoom = 1;
  let modalTranslate = {{ x: 0, y: 0 }};
  let isDragging = false;
  let dragStart = null;
  let translateAtDrag = {{ x: 0, y: 0 }};
  let pinchStartDist = null;
  let pinchStartZoom = 1;
  const MIN_ZOOM = 0.5, MAX_ZOOM = 5, ZOOM_STEP = 0.25;

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const viewerWrap = document.getElementById('viewer-wrap');
  let container    = document.getElementById('flipbook-container');
  const modalEl    = document.getElementById('image-modal');
  const modalImg   = document.getElementById('modal-img');
  const zoomLevel  = document.getElementById('zoom-level');
  const audioInd   = document.getElementById('audio-indicator');
  const pageRangeH = document.getElementById('page-range-header');
  const btnFirst   = document.getElementById('btn-first');
  const btnPrev    = document.getElementById('btn-prev');
  const btnNext    = document.getElementById('btn-next');
  const btnLast    = document.getElementById('btn-last');
  const navPrev    = document.getElementById('nav-prev');
  const navNext    = document.getElementById('nav-next');
  const thumbGrid  = document.getElementById('thumb-grid');

  // ── Dimensions ────────────────────────────────────────────────────────────
  function calcDimensions() {{
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const availW = Math.min(winW * 0.94, 1600);
    const availH = Math.max(380, winH - 140);
    const maxByW = (availW - 20) / 2;
    const maxByH = availH * 0.707;
    const w = Math.max(280, Math.floor(Math.min(maxByW, maxByH)));
    const h = Math.max(396, Math.floor(w / 0.707));
    return {{ w, h }};
  }}

  // ── Initialise Flipbook ───────────────────────────────────────────────────
  function initFlipbook() {{
    const {{ w, h }} = calcDimensions();

    // Destroy previous instance if any
    if (pageFlip) {{
      try {{ pageFlip.destroy(); }} catch(e) {{}}
      pageFlip = null;
    }}

    // Recreate container and attach circular nav buttons directly to the book edges
    viewerWrap.innerHTML = `
      <div id="flipbook-container">
        <button class="nav-circle-btn nav-btn-prev" id="nav-prev" onclick="goPrev()" title="Previous (←)" aria-label="Previous Page">
          <svg viewBox="0 0 24 24"><polyline points="15 19 8 12 15 5"></polyline></svg>
        </button>
        <button class="nav-circle-btn nav-btn-next" id="nav-next" onclick="goNext()" title="Next (→)" aria-label="Next Page">
          <svg viewBox="0 0 24 24"><polyline points="9 5 16 12 9 19"></polyline></svg>
        </button>
      </div>
    `;
    container = document.getElementById('flipbook-container');

    container.style.cssText = [
      'width:'  + (w * 2) + 'px',
      'height:' + h + 'px',
      'position:relative',
      'margin:0 auto',
      'box-sizing:border-box',
    ].join(';');

    // Build page elements
    const pageElements = [];
    BOOK.pages.forEach((page, idx) => {{
      // In showCover mode: Page 1 is right (cover), pages 2,4,6..34 are left, pages 3,5,7..33 are right
      const isLeft = (page.pageNumber % 2 === 0);
      const div = document.createElement('div');
      div.className = 'page-item';
      div.dataset.density = (idx === 0 || idx === TOTAL - 1) ? 'hard' : 'soft';

      // Background image
      const img = document.createElement('img');
      img.className = 'page-img';
      img.src = page.imagePath;
      img.alt = page.title || `Page ${{page.pageNumber}}`;
      img.loading = 'lazy';
      div.appendChild(img);

      // Spine gradient
      const spine = document.createElement('div');
      spine.className = isLeft ? 'page-spine-left' : 'page-spine-right';
      div.appendChild(spine);

      // Interactive overlay
      const overlay = document.createElement('div');
      overlay.className = 'page-overlay';

      (page.interactions || []).forEach(inter => {{
        if (inter.type === 'audio') {{
          const btn = document.createElement('button');
          btn.className = 'audio-btn';
          btn.id = 'abtn-' + inter.id;
          btn.style.left = inter.x;
          btn.style.top  = inter.y;
          btn.setAttribute('aria-label', inter.title || "Lire l'audio");
          btn.title = inter.title || '';
          btn.innerHTML = `<span>🔊</span><span class="tooltip">${{inter.title || ''}}</span>`;
          btn.addEventListener('click', (e) => {{
            e.stopPropagation();
            playAudio(inter.id, inter.src);
          }});
          overlay.appendChild(btn);
        }}
        if (inter.type === 'zoom') {{
          const zone = document.createElement('div');
          zone.className = 'zoom-zone';
          zone.style.left   = inter.x;
          zone.style.top    = inter.y;
          zone.style.width  = inter.width;
          zone.style.height = inter.height;
          zone.setAttribute('role', 'button');
          zone.setAttribute('aria-label', "Zoom HD: " + (inter.title || 'image'));
          zone.tabIndex = 0;
          zone.innerHTML = `<span class="zoom-badge">🔍 Zoom HD</span>`;
          const openZoom = (e) => {{
            e.stopPropagation();
            openModal(inter.hiresSrc, inter.title || 'Zoom HD');
          }};
          zone.addEventListener('click', openZoom);
          zone.addEventListener('keydown', (e) => {{ if (e.key === 'Enter' || e.key === ' ') openZoom(e); }});
          overlay.appendChild(zone);
        }}
      }});

      // Clicking on the page (outside audio buttons) opens in HD zoom modal
      overlay.addEventListener('click', (e) => {{
        if (e.target.closest('.audio-btn, .zoom-zone')) return;
        openModal(page.imagePath, page.title || `Page ${{page.pageNumber}}`);
      }});

      // Page number
      const num = document.createElement('div');
      num.className = 'page-num ' + (isLeft ? 'left' : 'right');
      num.textContent = page.pageNumber;
      div.appendChild(num);

      div.appendChild(overlay);
      container.appendChild(div);
      pageElements.push(div);
    }});

    // Init PageFlip with hardcover support
    pageFlip = new PageFlip(container, {{
      width: w, height: h,
      size: 'fixed',
      minWidth: 280, maxWidth: 1000,
      minHeight: 396, maxHeight: 1400,
      drawShadow: true,
      maxShadowOpacity: 0.45,
      showCover: true,
      usePortrait: false,
      startPage: 0,
      flippingTime: 650,
      disableFlipByClick: true,
      showPageCorners: false,
      mobileScrollSupport: false,
    }});

    // Load only the page elements
    pageFlip.loadFromHTML(pageElements);

    pageFlip.on('flip', (e) => {{
      const newPage = e.data + 1;
      if (newPage !== currentPage) {{
        stopAudio();
        currentPage = newPage;
        playFlipSound();
        updateUI();
      }}
    }});

    updateUI();
  }}

  // ── Resize ────────────────────────────────────────────────────────────────
  let resizeTimeout;
  window.addEventListener('resize', () => {{
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {{
      const savedPage = currentPage;
      initFlipbook();
      if (pageFlip && savedPage > 1) {{
        if (savedPage >= TOTAL) {{
          pageFlip.flip(TOTAL - 1);
        }} else {{
          const targetIdx = (savedPage % 2 === 0) ? (savedPage - 1) : (savedPage - 2);
          pageFlip.flip(Math.max(0, targetIdx));
        }}
      }}
    }}, 250);
  }});

  // ── Navigation ────────────────────────────────────────────────────────────
  window.goPrev  = () => pageFlip && pageFlip.flipPrev();
  window.goNext  = () => pageFlip && pageFlip.flipNext();
  window.goFirst = () => pageFlip && pageFlip.flip(0);
  window.goLast  = () => pageFlip && pageFlip.flip(TOTAL - 1);
  window.goToPage = (pageNum) => {{
    if (!pageFlip) return;
    pageNum = Math.max(1, Math.min(TOTAL, parseInt(pageNum, 10) || 1));
    if (pageNum === 1) {{
      pageFlip.flip(0);
    }} else if (pageNum === TOTAL) {{
      pageFlip.flip(TOTAL - 1);
    }} else {{
      const targetIdx = (pageNum % 2 === 0) ? (pageNum - 1) : (pageNum - 2);
      pageFlip.flip(Math.max(0, Math.min(TOTAL - 1, targetIdx)));
    }}
  }};
  window.promptPage = () => {{
    const val = prompt(`Go to page (1 - ${{TOTAL}}) / Aller à la page (1 - ${{TOTAL}}) :`, currentPage);
    if (val === null) return;
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= TOTAL) window.goToPage(n);
  }};

  // ── Update UI ─────────────────────────────────────────────────────────────
  function updateUI() {{
    const pageIndicator = document.getElementById('page-indicator');
    const isCover = (currentPage === 1);
    const isBackCover = (currentPage === TOTAL);

    let leftPageNum, rightPageNum, headerText;

    if (isCover) {{
      leftPageNum = 1;
      rightPageNum = null;
      headerText = `Cover · Page 1 / ${{TOTAL}}`;
      if (pageIndicator) {{
        pageIndicator.innerHTML = `Cover <span class="page-total">(p. 1 / ${{TOTAL}})</span>`;
      }}
    }} else if (isBackCover) {{
      leftPageNum = TOTAL;
      rightPageNum = null;
      headerText = `Back Cover · Page ${{TOTAL}} / ${{TOTAL}}`;
      if (pageIndicator) {{
        pageIndicator.innerHTML = `Back Cover <span class="page-total">(p. ${{TOTAL}} / ${{TOTAL}})</span>`;
      }}
    }} else {{
      leftPageNum = (currentPage % 2 === 0) ? currentPage : (currentPage - 1);
      rightPageNum = Math.min(TOTAL - 1, leftPageNum + 1);
      headerText = `${{leftPageNum}}-${{rightPageNum}} / ${{TOTAL}}`;
      if (pageIndicator) {{
        pageIndicator.innerHTML = `Pages <span id="page-left-num">${{leftPageNum}}</span> - <span id="page-right-num">${{rightPageNum}}</span> <span class="page-total">/ ${{TOTAL}}</span>`;
      }}
    }}

    if (pageRangeH) pageRangeH.textContent = headerText;

    const isAtStart = isCover || currentPage <= 1;
    const isAtEnd   = isBackCover || currentPage >= TOTAL;

    if (btnFirst) btnFirst.disabled = isAtStart;
    if (btnPrev)  btnPrev.disabled  = isAtStart;
    if (btnNext)  btnNext.disabled  = isAtEnd;
    if (btnLast)  btnLast.disabled  = isAtEnd;

    // Floating Previous / Next buttons
    const navP = document.getElementById('nav-prev');
    const navN = document.getElementById('nav-next');
    if (navP) navP.disabled = isAtStart;
    if (navN) navN.disabled = isAtEnd;

    // Highlight active thumbnail(s)
    document.querySelectorAll('.thumb-item').forEach(el => {{
      const n = parseInt(el.dataset.page, 10);
      if (isCover) {{
        el.classList.toggle('active', n === 1);
      }} else if (isBackCover) {{
        el.classList.toggle('active', n === TOTAL);
      }} else {{
        el.classList.toggle('active', n === leftPageNum || n === rightPageNum);
      }}
    }});
  }}

  // ── Audio ─────────────────────────────────────────────────────────────────
  function playAudio(id, src) {{
    if (playingAudioId === id) {{ stopAudio(); return; }}
    stopAudio();
    const audio = new Audio(src);
    audio.onended = () => {{
      playingAudioId = null; currentAudio = null;
      audioInd.classList.remove('active');
      const prevBtn = document.getElementById('abtn-' + id);
      if (prevBtn) prevBtn.classList.remove('playing');
    }};
    audio.onerror = () => {{
      console.warn('Cannot play', src);
      playingAudioId = null; currentAudio = null;
      audioInd.classList.remove('active');
    }};
    audio.play().catch(() => {{}});
    currentAudio = audio;
    playingAudioId = id;
    audioInd.classList.add('active');
    const btn = document.getElementById('abtn-' + id);
    if (btn) btn.classList.add('playing');
  }}

  function stopAudio() {{
    if (currentAudio) {{ currentAudio.pause(); currentAudio.currentTime = 0; }}
    if (playingAudioId) {{
      const btn = document.getElementById('abtn-' + playingAudioId);
      if (btn) btn.classList.remove('playing');
    }}
    currentAudio = null; playingAudioId = null;
    audioInd.classList.remove('active');
  }}

  document.getElementById('btn-stop-audio').addEventListener('click', stopAudio);

  // ── Page flip sound ───────────────────────────────────────────────────────
  function playFlipSound() {{
    if (!soundEnabled) return;
    const s = new Audio('public/audio/page-flip.wav');
    s.volume = 0.4;
    s.play().catch(() => {{}});
  }}

  window.toggleSound = () => {{
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('btn-sound');
    btn.textContent = soundEnabled ? '🔊' : '🔇';
    btn.classList.toggle('active', !soundEnabled);
  }};

  // ── Fullscreen ────────────────────────────────────────────────────────────
  window.toggleFullscreen = () => {{
    if (!document.fullscreenElement) {{
      document.documentElement.requestFullscreen().catch(() => {{}});
    }} else {{
      document.exitFullscreen().catch(() => {{}});
    }}
  }};
  document.addEventListener('fullscreenchange', () => {{
    const isFS = !!document.fullscreenElement;
    const icon  = document.getElementById('fs-icon');
    const btnFs = document.getElementById('btn-fullscreen');
    const btnFs2 = document.getElementById('btn-fs2');
    icon.textContent = isFS ? '⊡' : '⛶';
    btnFs.classList.toggle('active', isFS);
    btnFs2.classList.toggle('active', isFS);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
  }});

  // ── Thumbnail Drawer ──────────────────────────────────────────────────────
  function buildThumbs() {{
    thumbGrid.innerHTML = '';
    BOOK.pages.forEach(page => {{
      const item = document.createElement('div');
      item.className = 'thumb-item';
      item.dataset.page = page.pageNumber;
      const img = document.createElement('img');
      img.src = page.thumbPath;
      img.alt = `Page ${{page.pageNumber}}`;
      img.loading = 'lazy';
      const num = document.createElement('div');
      num.className = 'thumb-num';
      num.textContent = 'p. ' + page.pageNumber;
      item.appendChild(img);
      item.appendChild(num);
      item.addEventListener('click', () => {{
        window.goToPage(page.pageNumber);
        closeThumbDrawer();
      }});
      thumbGrid.appendChild(item);
    }});
  }}

  window.openThumbDrawer = () => {{
    thumbDrawerOpen = true;
    document.getElementById('thumb-drawer-backdrop').classList.add('open');
    document.getElementById('thumb-drawer').classList.add('open');
    updateUI();
  }};
  window.closeThumbDrawer = () => {{
    thumbDrawerOpen = false;
    document.getElementById('thumb-drawer-backdrop').classList.remove('open');
    document.getElementById('thumb-drawer').classList.remove('open');
  }};

  // ── Image Modal (Règle R2) ─────────────────────────────────────────────────
  function openModal(src, alt) {{
    stopAudio();
    viewerWrap.classList.add('modal-active');
    modalImg.src = src;
    modalImg.alt = alt;
    modalEl.setAttribute('aria-label', alt);
    resetZoom();
    modalEl.classList.add('open');
    document.getElementById('btn-zoom-in').focus();
  }}

  function closeModal() {{
    modalEl.classList.remove('open');
    viewerWrap.classList.remove('modal-active');
    modalImg.src = '';
  }}

  window.openModal  = openModal;
  window.closeModal = closeModal;

  // Zoom helpers
  function applyZoomTransform(transition) {{
    const t = transition !== false ? 'transform 0.08s ease-out' : 'none';
    modalImg.style.transition = t;
    modalImg.style.transform  =
      `scale(${{modalZoom}}) translate(${{modalTranslate.x / modalZoom}}px, ${{modalTranslate.y / modalZoom}}px)`;
    zoomLevel.textContent = Math.round(modalZoom * 100) + '%';
    document.getElementById('btn-zoom-out').disabled = modalZoom <= MIN_ZOOM;
    document.getElementById('btn-zoom-in').disabled  = modalZoom >= MAX_ZOOM;
  }}

  window.adjustZoom = (delta) => {{
    modalZoom = parseFloat(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, modalZoom + delta)).toFixed(2));
    if (modalZoom <= 1) modalTranslate = {{ x: 0, y: 0 }};
    applyZoomTransform();
  }};

  window.resetZoom = () => {{
    modalZoom = 1; modalTranslate = {{ x: 0, y: 0 }};
    applyZoomTransform();
  }};

  // Wheel zoom
  document.getElementById('modal-img-wrap').addEventListener('wheel', (e) => {{
    e.preventDefault(); e.stopPropagation();
    const delta = -e.deltaY * 0.001 * modalZoom;
    modalZoom = parseFloat(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, modalZoom + delta)).toFixed(3));
    if (modalZoom <= 1) modalTranslate = {{ x: 0, y: 0 }};
    applyZoomTransform(false);
  }}, {{ passive: false }});

  // Double click zoom in / reset
  document.getElementById('modal-img-wrap').addEventListener('dblclick', (e) => {{
    e.preventDefault(); e.stopPropagation();
    if (modalZoom > 1) {{
      window.resetZoom();
    }} else {{
      modalZoom = 2.2;
      applyZoomTransform(true);
    }}
  }});

  // Mouse drag (pan)
  modalImg.addEventListener('mousedown', (e) => {{
    if (modalZoom <= 1) return;
    e.preventDefault();
    isDragging = true;
    dragStart = {{ x: e.clientX, y: e.clientY }};
    translateAtDrag = {{ ...modalTranslate }};
    modalImg.style.cursor = 'grabbing';
  }});
  window.addEventListener('mousemove', (e) => {{
    if (!isDragging || !dragStart) return;
    modalTranslate = {{
      x: translateAtDrag.x + (e.clientX - dragStart.x),
      y: translateAtDrag.y + (e.clientY - dragStart.y),
    }};
    applyZoomTransform(false);
  }});
  window.addEventListener('mouseup', () => {{
    isDragging = false; dragStart = null;
    modalImg.style.cursor = modalZoom > 1 ? 'grab' : 'zoom-in';
  }});

  // Touch pinch-to-zoom
  document.getElementById('modal-img-wrap').addEventListener('touchstart', (e) => {{
    if (e.touches.length === 2) {{
      const [t1, t2] = [e.touches[0], e.touches[1]];
      pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      pinchStartZoom = modalZoom;
    }}
  }}, {{ passive: true }});
  document.getElementById('modal-img-wrap').addEventListener('touchmove', (e) => {{
    if (e.touches.length === 2 && pinchStartDist !== null) {{
      e.preventDefault();
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      modalZoom = parseFloat(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStartZoom * (dist / pinchStartDist))).toFixed(3));
      if (modalZoom <= 1) modalTranslate = {{ x: 0, y: 0 }};
      applyZoomTransform(false);
    }}
  }}, {{ passive: false }});

  // ── Help Modal ────────────────────────────────────────────────────────────
  window.openHelp  = () => document.getElementById('help-modal').classList.add('open');
  window.closeHelp = () => document.getElementById('help-modal').classList.remove('open');

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {{
    const isModal = modalEl.classList.contains('open');
    const isHelp  = document.getElementById('help-modal').classList.contains('open');
    const target  = e.target;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    if (isModal) {{
      switch (e.key) {{
        case 'Escape': e.stopPropagation(); closeModal(); break;
        case '+': case '=': e.preventDefault(); window.adjustZoom(ZOOM_STEP); break;
        case '-': e.preventDefault(); window.adjustZoom(-ZOOM_STEP); break;
        case '0': e.preventDefault(); window.resetZoom(); break;
      }}
      return;
    }}
    if (isHelp) {{ if (e.key === 'Escape') closeHelp(); return; }}
    if (thumbDrawerOpen) {{ if (e.key === 'Escape') closeThumbDrawer(); return; }}
    if (isInput) return;

    switch (e.key) {{
      case 'ArrowRight': case 'PageDown': e.preventDefault(); window.goNext(); break;
      case 'ArrowLeft':  case 'PageUp':  e.preventDefault(); window.goPrev(); break;
      case 'Home': e.preventDefault(); window.goFirst(); break;
      case 'End':  e.preventDefault(); window.goLast();  break;
      case 'm': case 'M': window.toggleSound(); break;
      case 'f': case 'F': window.toggleFullscreen(); break;
      case '?': window.openHelp(); break;
    }}
  }}, true);

  // ── Boot ──────────────────────────────────────────────────────────────────
  buildThumbs();
  initFlipbook();

}})();
</script>
</body>
</html>"""

    print(f"Writing output HTML to {OUTPUT_HTML}...")
    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(html)

    size_kb = os.path.getsize(OUTPUT_HTML) / 1024
    print(f"flipbook-offline.html generated successfully! ({size_kb:.0f} KB)")
    print(f"   -> Open in browser: {OUTPUT_HTML}")


if __name__ == "__main__":
    main()
