#!/usr/bin/env python3
"""
===============================================================================
 PDF2FLIPBOOK - Convertisseur Universel de PDF en Flipbook Interactif Offline
===============================================================================
Ce script permet de transformer n'importe quel fichier PDF en un livre interactif
(Flipbook) HTML5 haute résolution (300 DPI), 100% autonome et fonctionnant hors ligne.

Fonctionnalités incluses :
- Rendu vectoriel HD 300 DPI vers WebP optimisé (chargement rapide & haute netteté)
- Génération automatique des miniatures (thumbnails)
- Effet sonore réaliste de feuilletage de page (synthétisé en WAV sans dépendance externe)
- Affichage réaliste de livre :
    * Page 1 (Cover / Couverture) affichée seule à droite
    * Pages intérieures affichées en double page (spreads côte à côte)
    * Dernière page (Back Cover / Quatrième de couverture) affichée seule à gauche
- Boutons de navigation flottants stylisés "Previous" et "Next"
- Barre d'outils inférieure complète (⏮, ◀, Pages X-Y / Total, ▶, ⏭, Table des matières, Son, Plein écran, Aide)
- Modal Lightbox HD avec Zoom progressif (molette, boutons +/-, double clic, glisser-déposer / pan, pinch-to-zoom)
- Navigation clavier (Flèches, PageUp/Down, Home/End, M, F, ?, Échap)
- 100% Hors-ligne : fonctionne en ouvrant simplement le fichier HTML dans n'importe quel navigateur

Usage :
    python pdf2flipbook.py "chemin/vers/mon_fichier.pdf"
    python pdf2flipbook.py "mon_fichier.pdf" --title "Mon Super Livre" --out "flipbook_output" --dpi 300

Prérequis :
    pip install pypdfium2 pillow
"""

import os
import sys
import shutil
import argparse
import json
import wave
import struct
import math
import random
import pypdfium2 as pdfium
from PIL import Image


def generate_page_flip_audio(output_path):
    """Génère un son réaliste de froissement de page en fichier WAV pur."""
    sample_rate = 44100
    duration = 0.35  # secondes
    n_samples = int(sample_rate * duration)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with wave.open(output_path, "w") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        frames = []
        for i in range(n_samples):
            t = i / sample_rate
            envelope = math.exp(-12.0 * t) * (1.0 - math.exp(-60.0 * t))
            noise = (random.random() * 2.0 - 1.0)
            freq = 280.0 * (1.0 - 0.5 * t)
            woosh = math.sin(2.0 * math.pi * freq * t) * 0.3
            sample_val = (noise * 0.7 + woosh) * envelope
            int_val = int(max(-1.0, min(1.0, sample_val)) * 32767 * 0.8)
            frames.append(struct.pack("<h", int_val))
            
        wav_file.writeframes(b"".join(frames))


def get_pageflip_lib_code(custom_lib_path=None):
    """Récupère le code JS de la bibliothèque page-flip (depuis node_modules, fichier local, ou fallback)."""
    candidates = []
    if custom_lib_path:
        candidates.append(custom_lib_path)
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    candidates.extend([
        os.path.join(project_root, "node_modules", "page-flip", "dist", "js", "page-flip.browser.js"),
        os.path.join(current_dir, "page-flip.browser.js"),
        os.path.join(project_root, "flipbook-offline.html"),
    ])
    
    for path in candidates:
        if os.path.exists(path):
            if path.endswith(".html"):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                        if "PageFlip=class" in content or "St.PageFlip" in content:
                            import re
                            match = re.search(r'<script[^>]*>\s*(!function\(t,e\).*?PageFlip.*?)\s*</script>', content, re.DOTALL)
                            if match:
                                return match.group(1)
                except Exception:
                    pass
            elif path.endswith(".js"):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        return f.read()
                except Exception:
                    pass

    raise FileNotFoundError(
        "Impossible de trouver page-flip.browser.js. "
        "Assurez-vous que node_modules/page-flip est installé ou placez le fichier page-flip.browser.js à côté du script."
    )


def build_flipbook_html(title, subtitle, pages_data, pageflip_js_code, audio_rel_path="public/audio/page-flip.wav"):
    """Construit le document HTML5 interactif complet et autonome."""
    book_data = {
        "title": title,
        "subtitle": subtitle,
        "totalPages": len(pages_data),
        "pages": pages_data
    }
    book_json_str = json.dumps(book_data, ensure_ascii=False, indent=2)

    html_template = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <title>{title} — Flipbook Interactif</title>
  <meta name="description" content="Flipbook interactif haute fidélité pour {title}, utilisable hors ligne." />
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
       PAGE OVERLAY & INTERACTION
    ══════════════════════════════════════════════════════════ */
    .page-item {{
      background: #ffffff;
      overflow: hidden;
      box-sizing: border-box;
      user-select: none;
      -webkit-user-select: none;
      cursor: zoom-in;
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
       AUDIO & SPEECH (TTS) BUTTONS
    ══════════════════════════════════════════════════════════ */
    .audio-btn {{
      position: absolute;
      transform: translate(-50%, -50%);
      z-index: 25;
      width: 34px; height: 34px;
      border-radius: 0;
      border: none;
      background: transparent;
      color: inherit;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: none;
      font-size: 15px;
      user-select: none;
    }}
    .audio-btn:hover {{
      background: transparent;
      transform: translate(-50%, -50%) scale(1.18);
      box-shadow: none;
    }}
    .audio-wave-icon {{
      width: 20px;
      height: 20px;
      display: block;
      pointer-events: none;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));
    }}
    .audio-wave-icon rect, .audio-wave-icon path {{
      transform-box: fill-box;
      transform-origin: center;
    }}
    .audio-btn.playing .audio-wave-icon .wb-2 {{ animation: eqBounce 0.55s infinite alternate ease-in-out; }}
    .audio-btn.playing .audio-wave-icon .wb-4 {{ animation: eqBounce 0.45s infinite alternate ease-in-out 0.15s; }}
    .audio-btn.playing .audio-wave-icon .wb-6 {{ animation: eqBounce 0.65s infinite alternate ease-in-out 0.3s; }}
    .audio-btn.playing .audio-wave-icon .wb-8 {{ animation: eqBounce 0.5s infinite alternate ease-in-out 0.1s; }}
    .audio-btn.playing .audio-wave-icon .wb-10 {{ animation: eqBounce 0.6s infinite alternate ease-in-out 0.2s; }}
    @keyframes eqBounce {{
      0% {{ transform: scaleY(0.4); }}
      100% {{ transform: scaleY(1.35); }}
    }}
    .audio-btn.tts-btn {{
      border-color: transparent;
      color: inherit;
      box-shadow: none;
    }}
    .audio-btn.tts-btn:hover {{
      background: transparent;
      color: inherit;
      box-shadow: none;
    }}
    .audio-btn.playing {{
      background: transparent;
      color: inherit;
      transform: translate(-50%, -50%) scale(1.15);
      animation: audio-pulse-ring 1.3s ease-out infinite;
    }}
    .audio-btn.tts-btn.playing {{
      background: transparent;
      color: inherit;
      animation: tts-pulse-ring 1.3s ease-out infinite;
    }}
    @keyframes audio-pulse-ring {{
      0% {{ box-shadow: 0 0 0 0 rgba(245,158,11,0.7), 0 0 16px rgba(245,158,11,0.5); }}
      70% {{ box-shadow: 0 0 0 12px rgba(245,158,11,0), 0 0 20px rgba(245,158,11,0.3); }}
      100% {{ box-shadow: 0 0 0 0 rgba(245,158,11,0), 0 0 16px rgba(245,158,11,0.3); }}
    }}
    @keyframes tts-pulse-ring {{
      0% {{ box-shadow: 0 0 0 0 rgba(0,162,237,0.8), 0 0 16px rgba(0,162,237,0.5); }}
      70% {{ box-shadow: 0 0 0 12px rgba(0,162,237,0), 0 0 20px rgba(0,162,237,0.3); }}
      100% {{ box-shadow: 0 0 0 0 rgba(0,162,237,0), 0 0 16px rgba(0,162,237,0.3); }}
    }}
    .audio-btn .tooltip {{
      display: none;
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(9,13,22,0.96);
      color: #f1f5f9;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      white-space: nowrap;
      border: 1px solid var(--border);
      pointer-events: none;
      z-index: 100;
      box-shadow: 0 4px 16px rgba(0,0,0,0.6);
    }}
    .audio-btn:hover .tooltip {{ display: block; }}

    .video-btn {{
      position: absolute;
      transform: translate(-50%, -50%);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #dc2626;
      color: #ffffff;
      border: 2px solid #ffffff;
      box-shadow: 0 4px 14px rgba(220, 38, 38, 0.5);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 25;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      font-size: 13px;
      line-height: 1;
    }}
    .video-btn:hover {{
      background: #ef4444;
      transform: translate(-50%, -50%) scale(1.18);
      box-shadow: 0 6px 20px rgba(220, 38, 38, 0.75);
    }}
    .video-btn .tooltip {{
      display: none;
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(9,13,22,0.96);
      color: #f1f5f9;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      white-space: nowrap;
      border: 1px solid rgba(220, 38, 38, 0.5);
      pointer-events: none;
      z-index: 100;
      box-shadow: 0 4px 16px rgba(0,0,0,0.6);
    }}
    .video-btn:hover .tooltip {{ display: block; }}

    /* ══════════════════════════════════════════════════════════
       TTS KARAOKE BUBBLE & HIGHLIGHT (OFFLINE STANDALONE)
    ══════════════════════════════════════════════════════════ */
    .tts-karaoke-bubble {{
      position: absolute;
      bottom: calc(100% + 10px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.98);
      border: 1.5px solid var(--cyan);
      box-shadow: 0 10px 30px rgba(0,0,0,0.85), 0 0 18px rgba(0, 162, 237, 0.4);
      border-radius: 10px;
      padding: 10px 14px;
      color: #f1f5f9;
      font-size: 13px;
      line-height: 1.5;
      max-width: 320px;
      min-width: 180px;
      max-height: 180px;
      overflow-y: auto;
      text-align: left;
      z-index: 100;
      pointer-events: auto;
      animation: bubblePop 0.15s ease-out;
    }}
    .tts-karaoke-bubble::after {{
      content: "";
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -6px;
      border-width: 6px;
      border-style: solid;
      border-color: var(--cyan) transparent transparent transparent;
    }}
    .k-word {{
      display: inline-block;
      padding: 1px 3px;
      margin: 1px 1px;
      border-radius: 4px;
      color: rgba(241, 245, 249, 0.85);
      transition: background-color 0.12s ease, color 0.12s ease, transform 0.12s ease;
    }}
    .k-word.k-read {{ color: #7dd3fc; opacity: 0.9; }}
    .k-word.k-active {{
      background: linear-gradient(135deg, #00a2ed 0%, #0284c7 100%);
      color: #ffffff !important;
      font-weight: 700;
      box-shadow: 0 0 12px rgba(0, 162, 237, 0.9);
      transform: scale(1.08);
      border-radius: 5px;
    }}

    /* ══════════════════════════════════════════════════════════
       MODAL & ZOOM ZONES
    ══════════════════════════════════════════════════════════ */
    .zoom-zone {{
      position: absolute;
      border: 1.5px dashed rgba(245,158,11,0.4);
      border-radius: 8px;
      z-index: 15;
      cursor: zoom-in;
      background: transparent;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }}
    .zoom-zone:hover {{
      border: 2px solid #f59e0b;
      background: rgba(245,158,11,0.06);
      box-shadow: 0 0 16px rgba(245,158,11,0.45);
    }}
    .zoom-badge {{
      position: absolute;
      top: 5px; right: 5px;
      width: 28px; height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      border: 2px solid #ffffff;
      color: #ffffff;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 3px 10px rgba(0,0,0,0.5);
      cursor: zoom-in;
      transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s;
      pointer-events: none;
    }}
    .zoom-zone:hover .zoom-badge {{
      transform: scale(1.18);
      box-shadow: 0 0 16px rgba(245,158,11,0.85);
    }}
    .zoom-badge svg {{
      width: 15px; height: 15px;
      stroke: #ffffff; stroke-width: 2.5; fill: none;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
    }}

    /* ══════════════════════════════════════════════════════════
       WIDGET FILL-BLANK (Texte à trou)
    ══════════════════════════════════════════════════════════ */
    .widget-fill-blank {{
      position: absolute;
      display: flex;
      align-items: center;
      gap: 4px;
      z-index: 25;
    }}
    .fb-input {{
      background: rgba(255,255,255,0.92);
      border: 2.5px solid #10b981;
      border-radius: 6px;
      color: #0f172a;
      font-size: 13px;
      font-weight: 700;
      font-family: inherit;
      padding: 3px 8px;
      width: 100%;
      height: 100%;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
      text-align: center;
      cursor: text;
    }}
    .fb-input:focus {{ border-color: #34d399; box-shadow: 0 0 0 3px rgba(16,185,129,0.35); }}
    .fb-input.correct {{
      background: #dcfce7;
      border-color: #16a34a;
      box-shadow: 0 0 0 3px rgba(22,163,74,0.35);
      color: #15803d;
    }}
    .fb-input.incorrect {{
      background: #fee2e2;
      border-color: #dc2626;
      box-shadow: 0 0 0 3px rgba(220,38,38,0.35);
      color: #b91c1c;
      animation: fb-shake 0.35s ease;
    }}
    @keyframes fb-shake {{
      0%,100% {{ transform: translateX(0); }}
      20%      {{ transform: translateX(-5px); }}
      60%      {{ transform: translateX(5px); }}
    }}
    .fb-hint-btn {{
      flex-shrink: 0;
      width: 22px; height: 22px;
      border-radius: 50%;
      background: rgba(16,185,129,0.85);
      border: 1.5px solid #fff;
      color: #fff;
      font-size: 12px; font-weight: 900;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: transform 0.15s;
      line-height: 1;
    }}
    .fb-hint-btn:hover {{ transform: scale(1.2); }}
    .fb-hint-tooltip {{
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%; transform: translateX(-50%);
      background: rgba(15,23,42,0.96);
      color: #f1f5f9; font-size: 11px; font-weight: 600;
      padding: 4px 10px; border-radius: 6px;
      white-space: nowrap; border: 1px solid #334155;
      z-index: 200; pointer-events: none;
      animation: fb-fadein 0.15s ease;
    }}
    @keyframes fb-fadein {{ from{{opacity:0;transform:translateX(-50%) translateY(4px)}} to{{opacity:1;transform:translateX(-50%) translateY(0)}} }}

    /* ══════════════════════════════════════════════════════════
       WIDGET REVEAL (Zone masquée / Révélation)
    ══════════════════════════════════════════════════════════ */
    .widget-reveal {{
      position: absolute;
      display: flex; align-items: center; justify-content: center;
      border-radius: 5px;
      cursor: pointer;
      z-index: 24;
      font-size: 11px; font-weight: 800;
      color: #fff;
      text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      transition: opacity 0.35s ease, transform 0.35s ease;
      user-select: none;
      overflow: hidden;
    }}
    .widget-reveal.revealed {{
      opacity: 0;
      pointer-events: none;
      transform: scale(0.92);
    }}
    .widget-reveal-text {{
      position: absolute;
      display: flex; align-items: center; justify-content: center;
      border-radius: 5px;
      z-index: 23;
      font-size: 12px; font-weight: 700;
      color: #15803d;
      background: rgba(220,252,231,0.97);
      border: 2px solid #16a34a;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease 0.15s;
      padding: 2px 6px;
      text-align: center;
    }}
    .widget-reveal-text.visible {{ opacity: 1; }}

    /* ══════════════════════════════════════════════════════════
       WIDGET CHECKBOX-TASK (Case à cocher)
    ══════════════════════════════════════════════════════════ */
    .widget-checkbox {{
      position: absolute;
      transform: translate(-50%, -50%);
      z-index: 25;
      display: flex; align-items: center; gap: 8px;
      background: rgba(15,23,42,0.88);
      border: 2px solid #334155;
      border-radius: 10px;
      padding: 5px 10px 5px 6px;
      cursor: pointer;
      user-select: none;
      backdrop-filter: blur(6px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      transition: border-color 0.2s, box-shadow 0.2s;
      max-width: 260px;
    }}
    .widget-checkbox:hover {{ border-color: #f43f5e; box-shadow: 0 0 14px rgba(244,63,94,0.5); }}
    .chk-box {{
      width: 22px; height: 22px; flex-shrink: 0;
      border-radius: 6px;
      border: 2.5px solid #64748b;
      background: #1e293b;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      transition: all 0.2s;
    }}
    .chk-box.checked {{ background: #f43f5e; border-color: #fb7185; }}
    .chk-label {{
      font-size: 11px; font-weight: 700; color: #e2e8f0;
      line-height: 1.3;
      flex: 1;
    }}
    .widget-checkbox.validated-correct {{
      border-color: #16a34a;
      background: rgba(22,163,74,0.2);
      box-shadow: 0 0 16px rgba(22,163,74,0.5);
    }}
    .widget-checkbox.validated-wrong {{
      border-color: #dc2626;
      background: rgba(220,38,38,0.15);
      box-shadow: 0 0 16px rgba(220,38,38,0.4);
    }}
    /* ══════════════════════════════════════════════════════════
       WIDGET PAINT-BUCKET (Coloriage)
    ══════════════════════════════════════════════════════════ */
    .widget-paint-bucket {{
      position: absolute;
      border-radius: 6px;
      cursor: pointer;
      z-index: 15;
      transition: background-color 0.25s ease, border-color 0.2s, box-shadow 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      border: 2px dashed rgba(255, 255, 255, 0.4);
    }}
    .widget-paint-bucket:hover {{
      border-color: #fff;
      box-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
    }}
    .widget-paint-bucket.validated-correct {{
      border: 3px solid #16a34a !important;
      box-shadow: 0 0 16px rgba(22,163,74,0.7) !important;
    }}
    .widget-paint-bucket.validated-wrong {{
      border: 3px solid #dc2626 !important;
      box-shadow: 0 0 16px rgba(220,38,38,0.7) !important;
    }}
    .fb-paint-palette {{
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 40;
      background: rgba(15, 23, 42, 0.92);
      border: 1.5px solid rgba(255, 255, 255, 0.2);
      border-radius: 30px;
      padding: 6px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
    }}
    .fb-paint-swatch {{
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid rgba(255, 255, 255, 0.4);
      transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
    }}
    .fb-paint-swatch:hover {{
      transform: scale(1.2);
      border-color: #fff;
    }}
    .fb-paint-swatch.active {{
      transform: scale(1.25);
      border-color: #fff;
      box-shadow: 0 0 10px #fff;
    }}
    /* ══════════════════════════════════════════════════════════
       WIDGET DRAWING-PAD (Dessin & Écriture Crayon)
    ══════════════════════════════════════════════════════════ */
    .widget-drawing-canvas {{
      position: absolute;
      z-index: 22;
      touch-action: none;
      cursor: crosshair;
      border-radius: 6px;
    }}
    .fb-drawing-toolbar {{
      position: absolute;
      top: 10px;
      right: 12px;
      z-index: 40;
      background: rgba(15, 23, 42, 0.92);
      border: 1.5px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
    }}
    .fb-drawing-btn {{
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: background 0.15s;
    }}
    .fb-drawing-btn:hover {{
      background: rgba(255, 255, 255, 0.2);
    }}
    .fb-drawing-btn.active {{
      background: #2563eb;
      border-color: #60a5fa;
    }}
    /* Score Panel */
    .score-panel {{
      position: fixed;
      bottom: 80px; right: 16px;
      z-index: 500;
      background: rgba(15,23,42,0.96);
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 10px 14px;
      min-width: 170px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.7);
      backdrop-filter: blur(12px);
      font-size: 12px; color: #e2e8f0;
      font-family: inherit;
      animation: fb-fadein 0.2s ease;
    }}
    .score-panel h4 {{
      margin: 0 0 8px 0;
      font-size: 11px; font-weight: 800;
      color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;
    }}
    .score-num {{
      font-size: 28px; font-weight: 900; color: #34d399;
      text-align: center; display: block;
      line-height: 1;
    }}
    .score-sub {{
      font-size: 11px; color: #64748b;
      text-align: center; display: block;
      margin-top: 2px;
    }}
    .score-bar-wrap {{
      height: 6px; background: #1e293b;
      border-radius: 999px; overflow: hidden; margin-top: 8px;
    }}
    .score-bar {{
      height: 100%; background: linear-gradient(90deg, #10b981, #34d399);
      border-radius: 999px;
      transition: width 0.5s ease;
    }}
    .score-btns {{ display: flex; gap: 6px; margin-top: 10px; }}
    .score-btn {{
      flex: 1; padding: 5px 0;
      background: #1e293b; border: 1px solid #334155;
      border-radius: 6px; color: #94a3b8;
      font-size: 10px; font-weight: 700;
      cursor: pointer; transition: all 0.15s; text-align: center;
    }}
    .score-btn:hover {{ background: #334155; color: #fff; }}
    .score-btn.validate-btn {{ background: rgba(16,185,129,0.2); border-color: #10b981; color: #34d399; }}
    .score-btn.validate-btn:hover {{ background: #10b981; color: #fff; }}

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
       ANNOTATION & DYNAMIC LOUPE SYSTEM
    ══════════════════════════════════════════════════════════ */
    .page-annot-canvas {{
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 28;
      pointer-events: none;
      touch-action: none;
    }}
    body.annot-mode-pen .page-annot-canvas {{
      pointer-events: auto;
      cursor: crosshair;
    }}
    body.annot-mode-eraser .page-annot-canvas {{
      pointer-events: auto;
      cursor: cell;
    }}
    .annot-palette {{
      position: fixed;
      bottom: 74px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid var(--border);
      border-radius: 30px;
      padding: 6px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 45;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6), 0 0 16px rgba(0, 162, 237, 0.25);
      backdrop-filter: blur(12px);
      user-select: none;
      animation: paletteFadeIn 0.2s ease-out;
    }}
    @keyframes paletteFadeIn {{
      from {{ opacity: 0; transform: translate(-50%, 10px); }}
      to {{ opacity: 1; transform: translate(-50%, 0); }}
    }}
    .palette-colors, .palette-sizes {{
      display: flex;
      align-items: center;
      gap: 6px;
    }}
    .palette-sep {{
      width: 1px;
      height: 18px;
      background: var(--border);
    }}
    .color-dot {{
      width: 20px;
      height: 20px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;
      transition: transform 0.15s, border-color 0.15s;
    }}
    .color-dot:hover {{
      transform: scale(1.2);
    }}
    .color-dot.active {{
      border-color: #ffffff;
      box-shadow: 0 0 8px currentColor;
      transform: scale(1.15);
    }}
    .size-dot {{
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      cursor: pointer;
      border-radius: 50%;
      font-size: 14px;
      transition: all 0.15s;
    }}
    .size-dot.active, .size-dot:hover {{
      color: #38bdf8;
      background: rgba(255,255,255,0.1);
    }}
    .palette-clear-btn {{
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }}
    .palette-clear-btn:hover {{
      background: rgba(239, 68, 68, 0.35);
      color: #ffffff;
    }}

    /* Circular Magnifier Glass (Loupe) */
    .circular-loupe-lens {{
      position: fixed;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      border: 3.5px solid #00a2ed;
      box-shadow: 0 12px 36px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.25), 0 0 20px rgba(0,162,237,0.5);
      pointer-events: none;
      z-index: 1000;
      background-repeat: no-repeat;
      display: none;
      overflow: hidden;
      cursor: none;
      transform: translate(-50%, -50%);
    }}
    .circular-loupe-lens::after {{
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 50%;
      box-shadow: inset 0 0 12px rgba(255,255,255,0.35);
    }}

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
      grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
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
       MODAL LIGHTBOX
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

    /* ══════════════════════════════════════════════════════════
       YOUTUBE VIDEO MODAL
    ══════════════════════════════════════════════════════════ */
    #video-modal {{
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9500;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(0, 0, 0, 0.88);
      backdrop-filter: blur(8px);
    }}
    #video-modal.open {{
      display: flex;
      animation: modal-in 0.15s ease-out both;
    }}
    #video-modal-inner {{
      position: relative;
      width: 94vw;
      max-width: 1200px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85);
      animation: modal-scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
    }}
    #video-modal-header {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
    }}
    #video-modal-header span {{
      font-size: 13px;
      font-weight: 700;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    #video-modal-wrap {{
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000000;
    }}
    #video-modal-wrap:fullscreen, #video-modal-wrap:-webkit-full-screen {{
      width: 100vw !important;
      height: 100vh !important;
      max-width: 100vw !important;
      max-height: 100vh !important;
      aspect-ratio: auto !important;
      background: #000000 !important;
    }}
    #video-modal-wrap:fullscreen iframe, #video-modal-wrap:-webkit-full-screen iframe {{
      width: 100% !important;
      height: 100% !important;
    }}
    #video-modal-iframe {{
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: none;
    }}
  </style>
  <script src="public/assets/lottie.min.js"></script>
  <script>
    if (!window.lottie) {{{{
      document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"><\\/script>');
    }}}}
  </script>
</head>
<body>
<div id="app">
  <!-- ═══════════════════════════════════════════════════ HEADER -->
  <header id="header">
    <div class="brand">
      <div class="book-icon">📖</div>
      <div class="title-group">
        <h1>{title} <span class="badge">Flipbook</span></h1>
        <p class="subtitle">{subtitle}</p>
      </div>
    </div>

    <div class="header-right">
      <button class="btn-header" id="btn-fullscreen" onclick="toggleFullscreen()" title="Fullscreen (F)">
        <span id="fs-icon">⛶</span>
        <span id="fs-label" class="hidden-mobile">Plein Écran</span>
      </button>
      <button class="btn-header" id="btn-toc" onclick="openThumbDrawer()" title="Table of Contents">
        Pages <span id="page-range-header" style="color:#64748b; font-weight:400; margin-left:4px">1 / {len(pages_data)}</span>
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
      <span class="page-total"> / {len(pages_data)}</span>
    </span>
    <button class="ctrl-btn" id="btn-next"   onclick="goNext()"   title="Next Page (→)" aria-label="Next Page">▶</button>
    <button class="ctrl-btn" id="btn-last"   onclick="goLast()"   title="Last Page (End)" aria-label="Last Page">⏭</button>
    <span class="ctrl-divider"></span>
    <button class="ctrl-btn" id="btn-pen"    onclick="toggleViewerTool('pen')"    title="Stylo / Dessin (P)" aria-label="Stylo">✏️</button>
    <button class="ctrl-btn" id="btn-eraser" onclick="toggleViewerTool('eraser')" title="Gomme / Effacer (E)" aria-label="Gomme">🧹</button>
    <button class="ctrl-btn" id="btn-loupe"  onclick="toggleViewerTool('loupe')"  title="Loupe Grossissante (Z)" aria-label="Loupe">🔍</button>
    <span class="ctrl-divider"></span>
    <button class="ctrl-btn" id="btn-thumbs" onclick="openThumbDrawer()" title="Table of Contents (T)">⊞</button>
    <button class="ctrl-btn" id="btn-sound"  onclick="toggleSound()" title="Page Flip Sound (M)">🔊</button>
    <button class="ctrl-btn" id="btn-fs2"    onclick="toggleFullscreen()" title="Fullscreen (F)">⛶</button>
    <button class="ctrl-btn" id="btn-help"   onclick="openHelp()" title="Help & Shortcuts (?)">?</button>
  </div>

  <!-- FLOATING ANNOTATION PALETTE -->
  <div id="annot-palette" class="annot-palette" style="display:none;">
    <div class="palette-colors">
      <div class="color-dot active" style="background:#0ea5e9;" onclick="setAnnotColor('#0ea5e9', this)" title="Bleu"></div>
      <div class="color-dot" style="background:#ef4444;" onclick="setAnnotColor('#ef4444', this)" title="Rouge"></div>
      <div class="color-dot" style="background:#10b981;" onclick="setAnnotColor('#10b981', this)" title="Vert"></div>
      <div class="color-dot" style="background:#facc15;" onclick="setAnnotColor('rgba(250,204,21,0.5)', this, 14)" title="Surligneur Jaune"></div>
      <div class="color-dot" style="background:#0f172a;" onclick="setAnnotColor('#0f172a', this)" title="Noir"></div>
    </div>
    <div class="palette-sep"></div>
    <div class="palette-sizes">
      <div class="size-dot active" onclick="setAnnotSize(2.5, this)" title="Trait Fin"><span>•</span></div>
      <div class="size-dot" onclick="setAnnotSize(5, this)" title="Trait Moyen"><span>●</span></div>
      <div class="size-dot" onclick="setAnnotSize(12, this)" title="Trait Épais"><span>⬤</span></div>
    </div>
    <div class="palette-sep"></div>
    <button class="palette-clear-btn" type="button" onclick="clearActivePageDrawing()" title="Effacer toutes les annotations de la page">🗑️ Effacer page</button>
  </div>

  <!-- CIRCULAR DYNAMIC LOUPE LENS -->
  <div id="circular-loupe-lens" class="circular-loupe-lens" style="display:none;"></div>
</div>

<!-- ═══════════════════════════════════════════════════ THUMBNAIL DRAWER -->
<div id="thumb-drawer-backdrop" onclick="closeThumbDrawer()"></div>
<div id="thumb-drawer">
  <div id="thumb-drawer-header">
    <span>📚 Table des matières — {len(pages_data)} pages</span>
    <button id="thumb-drawer-close" onclick="closeThumbDrawer()" aria-label="Fermer">✕</button>
  </div>
  <div id="thumb-grid"></div>
</div>

<!-- ═══════════════════════════════════════════════════ IMAGE MODAL -->
<div id="image-modal" role="dialog" aria-modal="true" aria-label="Zoom image HD">
  <div id="modal-backdrop" onclick="closeModal()"></div>
  <div id="modal-inner">
    <div id="modal-controls">
      <span id="zoom-level">100%</span>
      <span class="modal-sep"></span>
      <button class="modal-btn" id="btn-zoom-out" onclick="adjustZoom(-0.25)" title="Zoom out (−)">−</button>
      <button class="modal-btn" id="btn-zoom-in"  onclick="adjustZoom(0.25)"  title="Zoom in (+)">+</button>
      <button class="modal-btn" id="btn-zoom-reset" onclick="resetZoom()"     title="Reset zoom (0)">↺</button>
      <span class="modal-sep"></span>
      <button class="modal-btn close" onclick="closeModal()" title="Close (Escape)">✕</button>
    </div>
    <div id="modal-img-wrap">
      <img id="modal-img" src="" alt="" loading="eager" draggable="false" />
    </div>
    <p id="modal-hint">Molette pour zoomer · Glisser pour naviguer · <kbd>Échap</kbd> pour fermer · <kbd>+</kbd> / <kbd>−</kbd> / <kbd>0</kbd></p>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ VIDEO MODAL -->
<div id="video-modal" role="dialog" aria-modal="true" aria-label="Vidéo YouTube" onclick="closeVideoModal()">
  <div id="video-modal-inner" onclick="event.stopPropagation()">
    <div id="video-modal-header">
      <span id="video-modal-title"><span style="color:#ef4444;">▶</span> Vidéo YouTube</span>
      <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
        <a id="video-modal-yt-btn" href="#" target="_blank" rel="noopener noreferrer" style="font-size:12px; color:#38bdf8; text-decoration:none; display:inline-flex; align-items:center; gap:4px; padding:4px 8px; border-radius:6px; background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.25);" title="Ouvrir sur YouTube">↗ Ouvrir sur YouTube</a>
        <button id="video-modal-fs-btn" class="modal-btn" onclick="toggleVideoFullscreen()" title="Plein écran (F)" style="font-size:15px;">⛶</button>
        <button class="modal-btn close" onclick="closeVideoModal()" title="Fermer (Échap)">✕</button>
      </div>
    </div>
    <div id="video-modal-wrap">
      <iframe id="video-modal-iframe" src="" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    </div>
    <div id="video-modal-notice" style="display:none; font-size:11px; color:#94a3b8; background:#0f172a; border-top:1px solid #334155; padding:8px 14px; text-align:center;">
      💡 Si le lecteur YouTube affiche une <b>Erreur 153</b> en mode local (file://), <a id="video-modal-link-fallback" href="#" target="_blank" rel="noopener noreferrer" style="color:#38bdf8; font-weight:600; text-decoration:underline;">cliquez ici pour ouvrir directement la vidéo sur YouTube</a> ou lancez le flipbook avec <b>Ouvrir_Flipbook.bat</b>.
    </div>
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
      <li><span>Couper / Activer son</span><kbd>M</kbd></li>
      <li><span>Plein écran</span><kbd>F</kbd></li>
      <li><span>Zoomer sur une page</span><span>Clic sur la page</span></li>
      <li><span>Zoomer dans modal</span><kbd>Molette</kbd> ou <kbd>+</kbd> / <kbd>−</kbd></li>
      <li><span>Fermer modal</span><kbd>Échap</kbd></li>
    </ul>
    <div class="help-close-btn"><button onclick="closeHelp()">Compris</button></div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ PAGE-FLIP LIBRARY -->
<script>
{pageflip_js_code}
</script>

<!-- ═══════════════════════════════════════════════════ APP SCRIPT -->
<script>
(function() {{
  'use strict';

  const PageFlip = St.PageFlip;
  const BOOK = {book_json_str};
  const TOTAL = BOOK.totalPages;

  let currentPage = 1;
  let soundEnabled = true;
  let pageFlip = null;
  let thumbDrawerOpen = false;

  // Audio & Speech State
  let currentAudio = null;
  let playingAudioId = null;
  let currentUtterance = null;

  function escapeHtml(text) {{
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }}

  const AUDIO_ICON_SVG = `<img src="public/assets/icone.png" style="width:100%;height:100%;object-fit:contain;pointer-events:none;" alt="Audio"/>`;

  const ZOOM_LOUPE_SVG = `<svg class="zoom-loupe-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;

  let ttsKaraokeTimer = null;

  // ═══════════════════════════════════════════════════════════════
  // FBEngine — Moteur interactif TBI (fill-blank + checkbox + score)
  // ═══════════════════════════════════════════════════════════════
  const FBEngine = (function() {{
    let scorePanel = null;

    function normalize(str, caseSensitive) {{
      const s = str.trim().replace(/\\s+/g, ' ');
      return caseSensitive ? s : s.toLowerCase();
    }}

    function checkOne(inp) {{
      if (!inp) return false;
      const answer   = inp.dataset.answer || '';
      const alts     = (inp.dataset.alternatives || '').split(';').map(s => s.trim()).filter(Boolean);
      const cs       = inp.dataset.caseSensitive === '1';
      const userVal  = normalize(inp.value, cs);
      const expected = [normalize(answer, cs), ...alts.map(a => normalize(a, cs))];
      const ok       = expected.includes(userVal);
      inp.classList.remove('correct', 'incorrect');
      void inp.offsetWidth;
      inp.classList.add(ok ? 'correct' : 'incorrect');
      if (ok) inp.readOnly = true;
      return ok;
    }}

    function validateGroup(groupId) {{
      const inputs = Array.from(document.querySelectorAll('.fb-input'))
        .filter(inp => !groupId || inp.dataset.groupId === groupId);
      let correct = 0;
      inputs.forEach(inp => {{ if (checkOne(inp)) correct++; }});
      const checkboxes = Array.from(document.querySelectorAll('.widget-checkbox'))
        .filter(cb => !groupId || cb.dataset.groupId === groupId);
      checkboxes.forEach(cb => {{
        const isChecked = cb.dataset.checked === '1';
        const isCorrect = cb.dataset.correct === '1';
        const ok = isChecked === isCorrect;
        cb.classList.remove('validated-correct', 'validated-wrong');
        cb.classList.add(ok ? 'validated-correct' : 'validated-wrong');
        if (ok) correct++;
      }});
      const paintBuckets = Array.from(document.querySelectorAll('.widget-paint-bucket'))
        .filter(pb => !groupId || pb.dataset.groupId === groupId);
      paintBuckets.forEach(pb => {{
        const userCol = (pb.dataset.currentColor || '').toLowerCase().trim();
        const targetCol = (pb.dataset.targetColor || '').toLowerCase().trim();
        const ok = userCol === targetCol;
        pb.classList.remove('validated-correct', 'validated-wrong');
        pb.classList.add(ok ? 'validated-correct' : 'validated-wrong');
        if (ok) correct++;
      }});
      showScore(correct, inputs.length + checkboxes.length + paintBuckets.length);
    }}

    function revealAnswers(groupId) {{
      document.querySelectorAll('.fb-input').forEach(inp => {{
        if (!groupId || inp.dataset.groupId === groupId) {{
          inp.value = inp.dataset.answer;
          inp.classList.remove('incorrect'); inp.classList.add('correct');
          inp.readOnly = true;
        }}
      }});
      document.querySelectorAll('.widget-checkbox').forEach(cb => {{
        if (!groupId || cb.dataset.groupId === groupId) {{
          const isCorrect = cb.dataset.correct === '1';
          cb.dataset.checked = isCorrect ? '1' : '0';
          const box = cb.querySelector('.chk-box');
          if (box) {{ box.textContent = isCorrect ? '\u2713' : ''; box.classList.toggle('checked', isCorrect); }}
          cb.classList.add('validated-correct');
        }}
      }});
      document.querySelectorAll('.widget-paint-bucket').forEach(pb => {{
        if (!groupId || pb.dataset.groupId === groupId) {{
          const targetColor = pb.dataset.targetColor || '#ef4444';
          pb.style.backgroundColor = targetColor;
          pb.dataset.currentColor = targetColor;
          pb.classList.remove('validated-wrong');
          pb.classList.add('validated-correct');
        }}
      }});
    }}

    function resetGroup(groupId) {{
      document.querySelectorAll('.fb-input').forEach(inp => {{
        if (!groupId || inp.dataset.groupId === groupId) {{
          inp.value = ''; inp.classList.remove('correct','incorrect'); inp.readOnly = false;
        }}
      }});
      document.querySelectorAll('.widget-checkbox').forEach(cb => {{
        if (!groupId || cb.dataset.groupId === groupId) {{
          cb.dataset.checked = '0';
          const box = cb.querySelector('.chk-box');
          if (box) {{ box.textContent = ''; box.classList.remove('checked'); }}
          cb.classList.remove('validated-correct','validated-wrong');
        }}
      }});
      document.querySelectorAll('.widget-paint-bucket').forEach(pb => {{
        if (!groupId || pb.dataset.groupId === groupId) {{
          const defaultCol = pb.dataset.defaultColor || 'transparent';
          pb.style.backgroundColor = defaultCol;
          pb.dataset.currentColor = defaultCol;
          pb.classList.remove('validated-correct','validated-wrong');
        }}
      }});
      if (scorePanel) {{ scorePanel.remove(); scorePanel = null; }}
    }}

    const LOTTIE_SUCCESS_DATA = {{"v":"5.7.1","fr":30,"ip":0,"op":60,"w":300,"h":300,"nm":"Comp 1","ddd":0,"assets":[],"layers":[{{"ddd":0,"ind":1,"ty":4,"nm":"4","sr":1,"ks":{{"o":{{"a":0,"k":100,"ix":11}},"r":{{"a":0,"k":0,"ix":10}},"p":{{"a":0,"k":[151,151,0],"ix":2}},"a":{{"a":0,"k":[0,0,0],"ix":1}},"s":{{"a":0,"k":[100,100,100],"ix":6}}}},"ao":0,"shapes":[{{"ty":"gr","it":[{{"ind":0,"ty":"sh","ix":1,"ks":{{"a":0,"k":{{"i":[[0,0],[-22.5,-7.5],[0,0]],"o":[[0,0],[22.5,7.5],[0,0]],"v":[[61,78.5],[78,100.5],[94,115.5]],"c":false}},"ix":2}},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false}},{{"ty":"st","c":{{"a":0,"k":[0.11764705882352941,0.3215686274509804,0.7803921568627451,1],"ix":3}},"o":{{"a":0,"k":100,"ix":4}},"w":{{"a":0,"k":5,"ix":5}},"lc":2,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false}},{{"ty":"tr","p":{{"a":0,"k":[0,0],"ix":2}},"a":{{"a":0,"k":[0,0],"ix":1}},"s":{{"a":0,"k":[100,100],"ix":3}},"r":{{"a":0,"k":0,"ix":6}},"o":{{"a":0,"k":100,"ix":7}},"sk":{{"a":0,"k":0,"ix":4}},"sa":{{"a":0,"k":0,"ix":5}},"nm":"Transform"}}],"nm":"Shape 1","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false}},{{"ty":"tm","s":{{"a":1,"k":[{{"i":{{"x":[0.667],"y":[1]}},"o":{{"x":[0.333],"y":[0]}},"t":28.254,"s":[0]}},{{"t":51,"s":[100]}}],"ix":1}},"e":{{"a":1,"k":[{{"i":{{"x":[0.667],"y":[1]}},"o":{{"x":[0.333],"y":[0]}},"t":17,"s":[0]}},{{"t":46.2109375,"s":[100]}}],"ix":2}},"o":{{"a":0,"k":0,"ix":3}},"m":1,"ix":2,"nm":"Trim Paths 1","mn":"ADBE Vector Filter - Trim","hd":false}}],"ip":17,"op":617,"st":17,"bm":0}},{{"ddd":0,"ind":2,"ty":4,"nm":"3","sr":1,"ks":{{"o":{{"a":0,"k":100,"ix":11}},"r":{{"a":0,"k":203,"ix":10}},"p":{{"a":0,"k":[251.408,59.449,0],"ix":2}},"a":{{"a":0,"k":[-103.936,89.696,0],"ix":1}},"s":{{"a":0,"k":[91.456,89.381,100],"ix":6}}}},"ao":0,"shapes":[{{"ty":"gr","it":[{{"ind":0,"ty":"sh","ix":1,"ks":{{"a":0,"k":{{"i":[[0,0],[29.459,25.084],[5,-25.75],[5.75,-0.75]],"o":[[0,0],[-25.25,-21.5],[-5.515,28.405],[-5.75,0.75]],"v":[[-75,68.75],[-107.25,86.5],[-94,84],[-128.75,113]],"c":false}},"ix":2}},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false}},{{"ty":"st","c":{{"a":0,"k":[0.9882352941176471,0.7254901960784313,0.2235294117647059,1],"ix":3}},"o":{{"a":0,"k":100,"ix":4}},"w":{{"a":0,"k":5,"ix":5}},"lc":2,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false}},{{"ty":"tr","p":{{"a":0,"k":[0,0],"ix":2}},"a":{{"a":0,"k":[0,0],"ix":1}},"s":{{"a":0,"k":[100,100],"ix":3}},"r":{{"a":0,"k":0,"ix":6}},"o":{{"a":0,"k":100,"ix":7}},"sk":{{"a":0,"k":0,"ix":4}},"sa":{{"a":0,"k":0,"ix":5}},"nm":"Transform"}}],"nm":"Shape 1","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false}},{{"ty":"tm","s":{{"a":1,"k":[{{"i":{{"x":[0.667],"y":[1]}},"o":{{"x":[0.333],"y":[0]}},"t":28.254,"s":[0]}},{{"t":51,"s":[100]}}],"ix":1}},"e":{{"a":1,"k":[{{"i":{{"x":[0.667],"y":[1]}},"o":{{"x":[0.333],"y":[0]}},"t":17,"s":[0]}},{{"t":46.2109375,"s":[100]}}],"ix":2}},"o":{{"a":0,"k":0,"ix":3}},"m":1,"ix":2,"nm":"Trim Paths 1","mn":"ADBE Vector Filter - Trim","hd":false}}],"ip":17,"op":617,"st":17,"bm":0}},{{"ddd":0,"ind":3,"ty":4,"nm":"2","sr":1,"ks":{{"o":{{"a":0,"k":100,"ix":11}},"r":{{"a":0,"k":0,"ix":10}},"p":{{"a":0,"k":[-21,347,0],"ix":2}},"a":{{"a":0,"k":[0,0,0],"ix":1}},"s":{{"a":0,"k":[100,100,100],"ix":6}}}},"ao":0,"shapes":[{{"ty":"gr","it":[{{"ind":0,"ty":"sh","ix":1,"ks":{{"a":0,"k":{{"i":[[0,0],[20.5,4.5],[0,0],[18.25,9.25],[3.5,-3.25]],"o":[[0,0],[-20.5,-4.5],[0,0],[-18.25,-9.25],[-3.5,3.25]],"v":[[90.75,-122.25],[83.5,-110.5],[81.25,-97.25],[69.75,-93.25],[61,-75.75]],"c":false}},"ix":2}},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false}},{{"ty":"st","c":{{"a":0,"k":[0.6,0.09019607843137255,0.9254901960784314,1],"ix":3}},"o":{{"a":0,"k":100,"ix":4}},"w":{{"a":0,"k":5,"ix":5}},"lc":2,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false}},{{"ty":"tr","p":{{"a":0,"k":[0,0],"ix":2}},"a":{{"a":0,"k":[0,0],"ix":1}},"s":{{"a":0,"k":[100,100],"ix":3}},"r":{{"a":0,"k":0,"ix":6}},"o":{{"a":0,"k":100,"ix":7}},"sk":{{"a":0,"k":0,"ix":4}},"sa":{{"a":0,"k":0,"ix":5}},"nm":"Transform"}}],"nm":"Shape 1","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false}},{{"ty":"tm","s":{{"a":1,"k":[{{"i":{{"x":[0.667],"y":[1]}},"o":{{"x":[0.333],"y":[0]}},"t":28.254,"s":[0]}},{{"t":51,"s":[100]}}],"ix":1}},"e":{{"a":1,"k":[{{"i":{{"x":[0.667],"y":[1]}},"o":{{"x":[0.333],"y":[0]}},"t":17,"s":[0]}},{{"t":46.2109375,"s":[100]}}],"ix":2}},"o":{{"a":0,"k":0,"ix":3}},"m":1,"ix":2,"nm":"Trim Paths 1","mn":"ADBE Vector Filter - Trim","hd":false}}],"ip":17,"op":617,"st":17,"bm":0}},{{"ddd":0,"ind":4,"ty":4,"nm":"1","sr":1,"ks":{{"o":{{"a":0,"k":100,"ix":11}},"r":{{"a":0,"k":0,"ix":10}},"p":{{"a":0,"k":[147,146,0],"ix":2}},"a":{{"a":0,"k":[0,0,0],"ix":1}},"s":{{"a":0,"k":[109.756,101.856,100],"ix":6}}}},"ao":0,"shapes":[{{"ty":"gr","it":[{{"ind":0,"ty":"sh","ix":1,"ks":{{"a":0,"k":{{"i":[[0,0],[33.75,1]],"o":[[0,0],[-33.75,-1]],"v":[[-57.75,-75.75],[-90.75,-107.5]],"c":false}},"ix":2}},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false}},{{"ty":"st","c":{{"a":0,"k":[0.9921568627450981,0.3686274509803922,0.4588235294117647,1],"ix":3}},"o":{{"a":0,"k":100,"ix":4}},"w":{{"a":0,"k":5,"ix":5}},"lc":2,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false}},{{"ty":"tr","p":{{"a":0,"k":[-1.5,-0.25],"ix":2}},"a":{{"a":0,"k":[0,0],"ix":1}},"s":{{"a":0,"k":[100,100],"ix":3}},"r":{{"a":0,"k":0,"ix":6}},"o":{{"a":0,"k":100,"ix":7}},"sk":{{"a":0,"k":0,"ix":4}},"sa":{{"a":0,"k":0,"ix":5}},"nm":"Transform"}}],"nm":"Shape 1","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false}},{{"ty":"tm","s":{{"a":1,"k":[{{"i":{{"x":[0.667],"y":[1]}},"o":{{"x":[0.333],"y":[0]}},"t":28.254,"s":[0]}},{{"t":51,"s":[100]}}],"ix":1}},"e":{{"a":1,"k":[{{"i":{{"x":[0.667],"y":[1]}},"o":{{"x":[0.333],"y":[0]}},"t":17,"s":[0]}},{{"t":46.2109375,"s":[100]}}],"ix":2}},"o":{{"a":0,"k":0,"ix":3}},"m":1,"ix":2,"nm":"Trim Paths 1","mn":"ADBE Vector Filter - Trim","hd":false}}],"ip":17,"op":617,"st":17,"bm":0}},{{"ddd":0,"ind":5,"ty":4,"nm":"checkmark/success Outlines","sr":1,"ks":{{"o":{{"a":0,"k":100,"ix":11}},"r":{{"a":0,"k":0,"ix":10}},"p":{{"a":0,"k":[150.06,150.061,0],"ix":2}},"a":{{"a":0,"k":[99,99,0],"ix":1}},"s":{{"a":1,"k":[{{"i":{{"x":[0.667,0.667,0.667],"y":[1,1,1]}},"o":{{"x":[0.333,0.333,0.333],"y":[0,0,0]}},"t":0,"s":[100,100,100]}},{{"i":{{"x":[0.667,0.667,0.667],"y":[1,1,1]}},"o":{{"x":[0.333,0.333,0.333],"y":[0,0,0]}},"t":12,"s":[27,27,100]}},{{"t":21,"s":[100,100,100]}}],"ix":6}}}},"ao":0,"shapes":[{{"ty":"gr","it":[{{"ind":0,"ty":"sh","ix":1,"ks":{{"a":0,"k":{{"i":[[0,0],[0.831,1.409],[0,0],[-0.622,2.004],[-1.844,1.043],[-2.083,-0.474],[-1.215,-1.74],[0,0],[-0.949,0.537],[0,0],[-2.041,-0.632],[-1.075,-1.826],[0.463,-2.047],[1.756,-1.181]],"o":[[-1.424,0.805],[0,0],[-0.93,-1.899],[0.622,-2.006],[1.844,-1.042],[2.084,0.474],[0,0],[0.553,0.939],[0,0],[1.921,-0.899],[2.042,0.631],[1.076,1.823],[-0.463,2.047],[0,0]],"v":[[-26.138,30.587],[-30.199,29.498],[-58.899,-19.189],[-59.378,-25.261],[-55.542,-30.001],[-49.433,-30.884],[-44.302,-27.441],[-23.618,7.647],[-20.911,8.371],[47.571,-30.344],[53.736,-30.76],[58.584,-26.94],[59.537,-20.918],[56.086,-15.898]],"c":true}},"ix":2}},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false}},{{"ty":"fl","c":{{"a":0,"k":[1,1,1,1],"ix":4}},"o":{{"a":0,"k":100,"ix":5}},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false}},{{"ty":"tr","p":{{"a":0,"k":[99.943,103.024],"ix":2}},"a":{{"a":0,"k":[0,0],"ix":1}},"s":{{"a":0,"k":[83.631,83.631],"ix":3}},"r":{{"a":0,"k":-12.6,"ix":6}},"o":{{"a":0,"k":100,"ix":7}},"sk":{{"a":0,"k":0,"ix":4}},"sa":{{"a":0,"k":0,"ix":5}},"nm":"Transform"}}],"nm":"Group 1","np":2,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false}},{{"ty":"gr","it":[{{"ind":0,"ty":"sh","ix":1,"ks":{{"a":0,"k":{{"i":[[-47.479,-12.722],[12.721,-47.478],[47.478,12.722],[-12.723,47.478]],"o":[[47.479,12.722],[-12.723,47.479],[-47.478,-12.723],[12.721,-47.479]],"v":[[23.036,-85.967],[85.969,23.035],[-23.035,85.967],[-85.966,-23.035]],"c":true}},"ix":2}},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false}},{{"ty":"fl","c":{{"a":1,"k":[{{"i":{{"x":[0.833],"y":[0.833]}},"o":{{"x":[0.167],"y":[0.167]}},"t":0,"s":[0.901960790157,0.901960790157,0.901960790157,1]}},{{"i":{{"x":[0.833],"y":[0.833]}},"o":{{"x":[0.167],"y":[0.167]}},"t":10,"s":[0.901960790157,0.901960790157,0.901960790157,1]}},{{"t":29,"s":[0.262745112181,0.823529422283,0.588235318661,1]}}],"ix":4}},"o":{{"a":0,"k":100,"ix":5}},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false}},{{"ty":"tr","p":{{"a":0,"k":[98.939,98.939],"ix":2}},"a":{{"a":0,"k":[0,0],"ix":1}},"s":{{"a":0,"k":[100,100],"ix":3}},"r":{{"a":0,"k":0,"ix":6}},"o":{{"a":0,"k":100,"ix":7}},"sk":{{"a":0,"k":0,"ix":4}},"sa":{{"a":0,"k":0,"ix":5}},"nm":"Transform"}}],"nm":"Group 2","np":2,"cix":2,"bm":0,"ix":2,"mn":"ADBE Vector Group","hd":false}}],"ip":0,"op":600,"st":0,"bm":0}},{{"ddd":0,"ind":6,"ty":4,"nm":"large-circles/success Outlines","sr":1,"ks":{{"o":{{"a":1,"k":[{{"i":{{"x":[0.833],"y":[0.833]}},"o":{{"x":[0.167],"y":[0.167]}},"t":42,"s":[100]}},{{"t":52,"s":[2]}}],"ix":11}},"r":{{"a":0,"k":0,"ix":10}},"p":{{"a":0,"k":[148,146,0],"ix":2}},"a":{{"a":0,"k":[95.5,98,0],"ix":1}},"s":{{"a":1,"k":[{{"i":{{"x":[0.667,0.667,0.667],"y":[1,1,1]}},"o":{{"x":[0.009,0.009,0.333],"y":[1.621,1.621,0]}},"t":17,"s":[62,62,100]}},{{"t":50,"s":[124,124,100]}}],"ix":6}}}},"ao":0,"shapes":[{{"ty":"gr","it":[{{"ind":0,"ty":"sh","ix":1,"ks":{{"a":0,"k":{{"i":[[-6.209,1.338],[-1.337,-6.209],[6.209,-1.337],[1.338,6.209]],"o":[[6.208,-1.337],[1.338,6.209],[-6.209,1.338],[-1.337,-6.209]],"v":[[-2.421,-11.243],[11.242,-2.422],[2.421,11.241],[-11.243,2.421]],"c":true}},"ix":2}},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false}},{{"ty":"fl","c":{{"a":0,"k":[0.6,0.09019607843137255,0.9254901960784314,1],"ix":4}},"o":{{"a":0,"k":100,"ix":5}},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false}},{{"ty":"tr","p":{{"a":0,"k":[173.998,145.423],"ix":2}},"a":{{"a":0,"k":[0,0],"ix":1}},"s":{{"a":0,"k":[71,71],"ix":3}},"r":{{"a":0,"k":0,"ix":6}},"o":{{"a":0,"k":100,"ix":7}},"sk":{{"a":0,"k":0,"ix":4}},"sa":{{"a":0,"k":0,"ix":5}},"nm":"Transform"}}],"nm":"Group 1","np":2,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false}},{{"ty":"gr","it":[{{"ind":0,"ty":"sh","ix":1,"ks":{{"a":0,"k":{{"i":[[-6.209,1.337],[-1.338,-6.209],[6.209,-1.338],[1.338,6.209]],"o":[[6.209,-1.338],[1.337,6.209],[-6.209,1.337],[-1.337,-6.208]],"v":[[-2.421,-11.242],[11.242,-2.422],[2.422,11.242],[-11.243,2.422]],"c":true}},"ix":2}},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false}},{{"ty":"fl","c":{{"a":0,"k":[0.11764705882352941,0.3215686274509804,0.7803921568627451,1],"ix":4}},"o":{{"a":0,"k":100,"ix":5}},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false}},{{"ty":"tr","p":{{"a":0,"k":[63.997,183.011],"ix":2}},"a":{{"a":0,"k":[0,0],"ix":1}},"s":{{"a":0,"k":[70,70],"ix":3}},"r":{{"a":0,"k":0,"ix":6}},"o":{{"a":0,"k":100,"ix":7}},"sk":{{"a":0,"k":0,"ix":4}},"sa":{{"a":0,"k":0,"ix":5}},"nm":"Transform"}}],"nm":"Group 2","np":2,"cix":2,"bm":0,"ix":2,"mn":"ADBE Vector Group","hd":false}},{{"ty":"gr","it":[{{"ind":0,"ty":"sh","ix":1,"ks":{{"a":0,"k":{{"i":[[-6.209,1.337],[-1.337,-6.208],[6.209,-1.337],[1.338,6.209]],"o":[[6.209,-1.337],[1.338,6.209],[-6.209,1.338],[-1.337,-6.209]],"v":[[-2.421,-11.243],[11.242,-2.423],[2.421,11.242],[-11.243,2.421]],"c":true}},"ix":2}},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false}},{{"ty":"fl","c":{{"a":0,"k":[0.9882352941176471,0.7254901960784313,0.2235294117647059,1],"ix":4}},"o":{{"a":0,"k":100,"ix":5}},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false}},{{"ty":"tr","p":{{"a":0,"k":[103.291,12.83],"ix":2}},"a":{{"a":0,"k":[0,0],"ix":1}},"s":{{"a":0,"k":[70,70],"ix":3}},"r":{{"a":0,"k":0,"ix":6}},"o":{{"a":0,"k":100,"ix":7}},"sk":{{"a":0,"k":0,"ix":4}},"sa":{{"a":0,"k":0,"ix":5}},"nm":"Transform"}}],"nm":"Group 3","np":2,"cix":2,"bm":0,"ix":3,"mn":"ADBE Vector Group","hd":false}},{{"ty":"gr","it":[{{"ind":0,"ty":"sh","ix":1,"ks":{{"a":0,"k":{{"i":[[-6.208,1.337],[-1.337,-6.209],[6.209,-1.338],[1.338,6.209]],"o":[[6.209,-1.337],[1.338,6.209],[-6.209,1.337],[-1.337,-6.209]],"v":[[-2.423,-11.242],[11.241,-2.422],[2.421,11.242],[-11.243,2.422]],"c":true}},"ix":2}},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false}},{{"ty":"fl","c":{{"a":0,"k":[0.11764705882352941,0.3215686274509804,0.7803921568627451,1],"ix":4}},"o":{{"a":0,"k":100,"ix":5}},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false}},{{"ty":"tr","p":{{"a":0,"k":[178.004,59.795],"ix":2}},"a":{{"a":0,"k":[0,0],"ix":1}},"s":{{"a":0,"k":[67,67],"ix":3}},"r":{{"a":0,"k":0,"ix":6}},"o":{{"a":0,"k":100,"ix":7}},"sk":{{"a":0,"k":0,"ix":4}},"sa":{{"a":0,"k":0,"ix":5}},"nm":"Transform"}}],"nm":"Group 4","np":2,"cix":2,"bm":0,"ix":4,"mn":"ADBE Vector Group","hd":false}},{{"ty":"gr","it":[{{"ind":0,"ty":"sh","ix":1,"ks":{{"a":0,"k":{{"i":[[-6.209,1.337],[-1.338,-6.208],[6.209,-1.337],[1.338,6.209]],"o":[[6.209,-1.337],[1.337,6.209],[-6.209,1.338],[-1.337,-6.209]],"v":[[-2.421,-11.243],[11.243,-2.423],[2.422,11.242],[-11.243,2.421]],"c":true}},"ix":2}},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false}},{{"ty":"fl","c":{{"a":0,"k":[0.9921568627450981,0.3686274509803922,0.4588235294117647,1],"ix":4}},"o":{{"a":0,"k":100,"ix":5}},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false}},{{"ty":"tr","p":{{"a":0,"k":[12.829,84.352],"ix":2}},"a":{{"a":0,"k":[0,0],"ix":1}},"s":{{"a":0,"k":[68,68],"ix":3}},"r":{{"a":0,"k":0,"ix":6}},"o":{{"a":0,"k":100,"ix":7}},"sk":{{"a":0,"k":0,"ix":4}},"sa":{{"a":0,"k":0,"ix":5}},"nm":"Transform"}}],"nm":"Group 5","np":2,"cix":2,"bm":0,"ix":5,"mn":"ADBE Vector Group","hd":false}}],"ip":17,"op":617,"st":17,"bm":0}},{{"ddd":0,"ind":7,"ty":4,"nm":"checkmark/success Outlines","sr":1,"ks":{{"o":{{"a":0,"k":100,"ix":11}},"r":{{"a":0,"k":0,"ix":10}},"p":{{"a":0,"k":[150.073,150.073,0],"ix":2}},"a":{{"a":0,"k":[99,99,0],"ix":1}},"s":{{"a":1,"k":[{{"i":{{"x":[0.203,0.203,0.667],"y":[0.507,0.507,1]}},"o":{{"x":[0.915,0.915,0.333],"y":[0.651,0.651,0]}},"t":50,"s":[93.357,93.357,100]}},{{"t":59,"s":[121.357,121.357,100]}}],"ix":6}}}},"ao":0,"shapes":[{{"ty":"gr","it":[{{"ind":0,"ty":"sh","ix":1,"ks":{{"a":0,"k":{{"i":[[0,0],[0.831,1.409],[0,0],[-0.622,2.004],[-1.844,1.043],[-2.083,-0.474],[-1.215,-1.74],[0,0],[-0.949,0.537],[0,0],[-2.041,-0.632],[-1.075,-1.826],[0.463,-2.047],[1.756,-1.181]],"o":[[-1.424,0.805],[0,0],[-0.93,-1.899],[0.622,-2.006],[1.844,-1.042],[2.084,0.474],[0,0],[0.553,0.939],[0,0],[1.921,-0.899],[2.042,0.631],[1.076,1.823],[-0.463,2.047],[0,0]],"v":[[-26.138,30.587],[-30.199,29.498],[-58.899,-19.189],[-59.378,-25.261],[-55.542,-30.001],[-49.433,-30.884],[-44.302,-27.441],[-23.618,7.647],[-20.911,8.371],[47.571,-30.344],[53.736,-30.76],[58.584,-26.94],[59.537,-20.918],[56.086,-15.898]],"c":true}},"ix":2}},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false}},{{"ty":"fl","c":{{"a":0,"k":[1,1,1,1],"ix":4}},"o":{{"a":0,"k":100,"ix":5}},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false}},{{"ty":"tr","p":{{"a":0,"k":[98.943,102.024],"ix":2}},"a":{{"a":0,"k":[0,0],"ix":1}},"s":{{"a":0,"k":[100,100],"ix":3}},"r":{{"a":0,"k":0,"ix":6}},"o":{{"a":0,"k":100,"ix":7}},"sk":{{"a":0,"k":0,"ix":4}},"sa":{{"a":0,"k":0,"ix":5}},"nm":"Transform"}}],"nm":"Group 1","np":2,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false}},{{"ty":"gr","it":[{{"ind":0,"ty":"sh","ix":1,"ks":{{"a":0,"k":{{"i":[[-47.479,-12.722],[12.721,-47.478],[47.478,12.722],[-12.723,47.478]],"o":[[47.479,12.722],[-12.723,47.479],[-47.478,-12.723],[12.721,-47.479]],"v":[[23.036,-85.967],[85.969,23.035],[-23.035,85.967],[-85.966,-23.035]],"c":true}},"ix":2}},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false}},{{"ty":"fl","c":{{"a":0,"k":[0,0.8549019607843137,0.5607843137254902,1],"ix":4}},"o":{{"a":0,"k":100,"ix":5}},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false}},{{"ty":"tr","p":{{"a":0,"k":[98.939,98.939],"ix":2}},"a":{{"a":0,"k":[0,0],"ix":1}},"s":{{"a":0,"k":[100,100],"ix":3}},"r":{{"a":0,"k":0,"ix":6}},"o":{{"a":0,"k":100,"ix":7}},"sk":{{"a":0,"k":0,"ix":4}},"sa":{{"a":0,"k":0,"ix":5}},"nm":"Transform"}}],"nm":"Group 2","np":2,"cix":2,"bm":0,"ix":2,"mn":"ADBE Vector Group","hd":false}}],"ip":50,"op":650,"st":50,"bm":0}}],"markers":[]}};

    function playCelebrationChime() {{
      try {{
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {{
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.11);
          gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.11);
          gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + idx * 0.11 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.11 + 0.38);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.11);
          osc.stop(ctx.currentTime + idx * 0.11 + 0.4);
        }});
      }} catch(e) {{}}
    }}

    function playLottieSuccess() {{
      const containerId = 'lottie-success-container';
      let c = document.getElementById(containerId);
      if (!c) {{
        c = document.createElement('div');
        c.id = containerId;
        c.style.position = 'fixed';
        c.style.inset = '0';
        c.style.pointerEvents = 'none';
        c.style.zIndex = '10010';
        c.style.display = 'flex';
        c.style.alignItems = 'center';
        c.style.justifyContent = 'center';
        document.body.appendChild(c);
      }}
      c.innerHTML = '<div id="lottie-success-anim" style="width: 420px; height: 420px; filter: drop-shadow(0 12px 28px rgba(0,0,0,0.6));"></div>';
      
      playCelebrationChime();

      if (window.lottie && typeof LOTTIE_SUCCESS_DATA !== 'undefined') {{
        try {{
          window.lottie.loadAnimation({{
            container: document.getElementById('lottie-success-anim'),
            renderer: 'svg',
            loop: false,
            autoplay: true,
            animationData: LOTTIE_SUCCESS_DATA
          }});
          setTimeout(() => {{ if (c) c.innerHTML = ''; }}, 3500);
          return;
        }} catch(err) {{
          console.error('Lottie inline error', err);
        }}
      }}

      fetch('public/assets/lottie-success.json')
        .then(res => res.json())
        .then(data => {{
          if (window.lottie) {{
            window.lottie.loadAnimation({{
              container: document.getElementById('lottie-success-anim'),
              renderer: 'svg',
              loop: false,
              autoplay: true,
              animationData: data
            }});
          }}
          setTimeout(() => {{ if (c) c.innerHTML = ''; }}, 3500);
        }})
        .catch(err => console.error("Lottie fail", err));
    }}

    function showScore(correct, total) {{
      const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
      if (!scorePanel) {{
        scorePanel = document.createElement('div');
        scorePanel.className = 'score-panel';
        document.body.appendChild(scorePanel);
      }}
      const star = pct === 100 ? ' \u2b50' : '';
      if (pct === 100 && total > 0) {{
        playLottieSuccess();
      }}
      scorePanel.innerHTML =
        '<h4>📊 Score de la page</h4>' +
        '<span class="score-num">' + correct + ' / ' + total + star + '</span>' +
        '<span class="score-sub">' + pct + '% de bonnes reponses</span>' +
        '<div class="score-bar-wrap"><div class="score-bar" style="width:' + pct + '%"></div></div>' +
        '<div class="score-btns">' +
          '<button class="score-btn validate-btn" onclick="FBEngine.validateGroup(\\\'\\\')">Corriger</button>' +
          '<button class="score-btn" onclick="FBEngine.revealAnswers(\\\'\\\')">Reponses</button>' +
          '<button class="score-btn" onclick="FBEngine.resetGroup(\\\'\\\')">Refaire</button>' +
        '</div>';
    }}

    return {{ checkOne, validateGroup, revealAnswers, resetGroup, showScore }};
  }})();
  window.FBEngine = FBEngine;



  function stopAllAudio() {{
    if (currentAudio) {{
      try {{ currentAudio.pause(); currentAudio.currentTime = 0; }} catch(e) {{}}
      currentAudio = null;
    }}
    if (window.speechSynthesis && window.speechSynthesis.speaking) {{
      try {{ window.speechSynthesis.cancel(); }} catch(e) {{}}
    }}
    if (ttsKaraokeTimer) {{
      clearInterval(ttsKaraokeTimer);
      ttsKaraokeTimer = null;
    }}
    document.querySelectorAll('.tts-karaoke-bubble').forEach(b => b.remove());
    document.querySelectorAll('.audio-btn').forEach(b => b.classList.remove('playing'));
    playingAudioId = null;
  }}

  function playAudio(id, src) {{
    if (playingAudioId === id) {{
      stopAllAudio();
      return;
    }}
    stopAllAudio();
    try {{
      const audio = new Audio(src);
      currentAudio = audio;
      playingAudioId = id;
      const btn = document.getElementById('abtn-' + id);
      if (btn) btn.classList.add('playing');
      audio.onended = () => stopAllAudio();
      audio.onerror = () => stopAllAudio();
      audio.play().catch(() => stopAllAudio());
    }} catch(e) {{
      stopAllAudio();
    }}
  }}

  function playTTS(id, text, lang, enableKaraoke = true) {{
    if (playingAudioId === id) {{
      stopAllAudio();
      return;
    }}
    stopAllAudio();
    if (!('speechSynthesis' in window)) {{
      alert("Votre navigateur ne supporte pas la synthèse vocale (Web Speech API).");
      return;
    }}
    try {{
      const btn = document.getElementById('tts-' + id);
      if (btn) btn.classList.add('playing');
      playingAudioId = id;

      // Karaoke bubble creation
      let bubble = null;
      let tokens = [];

      function highlightWord(targetIdx) {{
        if (!bubble) return;
        const spans = bubble.querySelectorAll('.k-word');
        spans.forEach((sp, i) => {{
          if (i < targetIdx) sp.className = 'k-word k-read';
          else if (i === targetIdx) {{
            sp.className = 'k-word k-active';
            try {{ sp.scrollIntoView({{ behavior: 'smooth', block: 'nearest' }}); }} catch(e) {{}}
          }} else sp.className = 'k-word';
        }});
      }}

      let boundaryFired = false;
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang || 'en-US';
      utt.rate = 0.80;
      utt.pitch = 1.0;
      currentUtterance = utt;

      utt.onboundary = (e) => {{
        if (e.name === 'word' || e.name === 'sentence') {{
          boundaryFired = true;
          for (let i = 0; i < tokens.length; i++) {{
            if (e.charIndex >= tokens[i].st && e.charIndex < tokens[i].en) {{
              highlightWord(i);
              break;
            }}
          }}
        }}
      }};

      // Timer fallback
      let stepWord = 0;
      setTimeout(() => {{
        if (playingAudioId === id && !boundaryFired && tokens.length > 0) {{
          ttsKaraokeTimer = setInterval(() => {{
            if (playingAudioId !== id || boundaryFired) {{
              clearInterval(ttsKaraokeTimer);
              return;
            }}
            if (stepWord < tokens.length) {{
              highlightWord(stepWord);
              stepWord++;
            }} else {{
              clearInterval(ttsKaraokeTimer);
            }}
          }}, 380);
        }}
      }}, 350);

      utt.onend = () => stopAllAudio();
      utt.onerror = () => stopAllAudio();
      window.speechSynthesis.speak(utt);
    }} catch(e) {{
      stopAllAudio();
    }}
  }}

  // Modal zoom state
  let modalZoom = 1;
  let modalTranslate = {{ x: 0, y: 0 }};
  let isDragging = false;
  let dragStart = null;
  let translateAtDrag = {{ x: 0, y: 0 }};
  let pinchStartDist = null;
  let pinchStartZoom = 1;
  const MIN_ZOOM = 0.5, MAX_ZOOM = 5, ZOOM_STEP = 0.25;

  // DOM refs
  const viewerWrap = document.getElementById('viewer-wrap');
  let container    = document.getElementById('flipbook-container');
  const modalEl    = document.getElementById('image-modal');
  const modalImg   = document.getElementById('modal-img');
  const zoomLevel  = document.getElementById('zoom-level');
  const pageRangeH = document.getElementById('page-range-header');
  const btnFirst   = document.getElementById('btn-first');
  const btnPrev    = document.getElementById('btn-prev');
  const btnNext    = document.getElementById('btn-next');
  const btnLast    = document.getElementById('btn-last');
  const navPrev    = document.getElementById('nav-prev');
  const navNext    = document.getElementById('nav-next');
  const thumbGrid  = document.getElementById('thumb-grid');

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

    const pageElements = [];
    BOOK.pages.forEach((page, idx) => {{
      const isLeft = (page.pageNumber % 2 === 0);
      const div = document.createElement('div');
      div.className = 'page-item';
      div.dataset.density = (idx === 0 || idx === TOTAL - 1) ? 'hard' : 'soft';

      const img = document.createElement('img');
      img.className = 'page-img';
      img.src = page.imagePath;
      img.alt = page.title || `Page ${{page.pageNumber}}`;
      img.loading = 'lazy';
      div.appendChild(img);

      const spine = document.createElement('div');
      spine.className = isLeft ? 'page-spine-left' : 'page-spine-right';
      div.appendChild(spine);

      const overlay = document.createElement('div');
      overlay.className = 'page-overlay';

      (page.interactions || []).forEach((inter, idxInter) => {{
        const iId = inter.id || `${{page.pageNumber}}-${{idxInter}}`;
        const leftVal = String(inter.x || '50%').includes('%') ? inter.x : (inter.x + '%');
        const topVal  = String(inter.y || '50%').includes('%') ? inter.y : (inter.y + '%');

        if (inter.type === 'audio') {{
          const btn = document.createElement('button');
          btn.className = 'audio-btn';
          btn.id = 'abtn-' + iId;
          btn.style.left = leftVal;
          btn.style.top  = topVal;
          if (inter.size) {{
            btn.style.width = inter.size + 'px';
            btn.style.height = inter.size + 'px';
            btn.style.fontSize = Math.max(12, inter.size * 0.45) + 'px';
          }}
          btn.setAttribute('aria-label', inter.title || "Écouter l'audio");
          btn.title = inter.title || '';
          btn.innerHTML = `${{AUDIO_ICON_SVG}}`;
          btn.addEventListener('click', (e) => {{
            e.stopPropagation();
            playAudio(iId, inter.src);
          }});
          overlay.appendChild(btn);
        }} else if (inter.type === 'tts') {{
          const btn = document.createElement('button');
          btn.className = 'audio-btn tts-btn';
          btn.id = 'tts-' + iId;
          btn.style.left = leftVal;
          btn.style.top  = topVal;
          if (inter.size) {{
            btn.style.width = inter.size + 'px';
            btn.style.height = inter.size + 'px';
            btn.style.fontSize = Math.max(12, inter.size * 0.45) + 'px';
          }}
          btn.setAttribute('aria-label', inter.title || "Écouter le texte");
          btn.title = inter.title || '';
          btn.innerHTML = `${{AUDIO_ICON_SVG}}`;
          btn.addEventListener('click', (e) => {{
            e.stopPropagation();
            playTTS(iId, inter.text, inter.lang, inter.karaoke !== false);
          }});
          overlay.appendChild(btn);
        }} else if (inter.type === 'video') {{
          const btn = document.createElement('button');
          btn.className = 'video-btn';
          btn.id = 'vbtn-' + iId;
          btn.style.left = leftVal;
          btn.style.top  = topVal;
          if (inter.size) {{
            btn.style.width = inter.size + 'px';
            btn.style.height = inter.size + 'px';
            btn.style.fontSize = Math.max(12, inter.size * 0.45) + 'px';
          }}
          btn.setAttribute('aria-label', inter.title || "Regarder la vidéo");
          btn.title = inter.title || 'Vidéo YouTube';
          btn.innerHTML = '▶';
          if (inter.title) {{
            const tip = document.createElement('span');
            tip.className = 'tooltip';
            tip.textContent = inter.title;
            btn.appendChild(tip);
          }}
          btn.addEventListener('click', (e) => {{
            e.stopPropagation();
            openVideoModal(inter.youtubeUrl, inter.title);
          }});
          overlay.appendChild(btn);
        }} else if (inter.type === 'zoom' || inter.type === 'modal') {{
          const widthVal  = String(inter.width || '40%').includes('%') ? inter.width : (inter.width + '%');
          const heightVal = String(inter.height || '30%').includes('%') ? inter.height : (inter.height + '%');
          const zone = document.createElement('div');
          zone.className = 'zoom-zone';
          zone.style.left   = leftVal;
          zone.style.top    = topVal;
          zone.style.width  = widthVal;
          zone.style.height = heightVal;
          zone.setAttribute('role', 'button');
          zone.setAttribute('aria-label', inter.title || "Agrandir l'image");
          zone.tabIndex = 0;
          zone.title = `🔍 ${{escapeHtml(inter.title || 'Zoom HD')}} (cliquer pour agrandir)`;
          zone.innerHTML = `<span class="zoom-badge">${{ZOOM_LOUPE_SVG}}</span>`;
          const openZ = (e) => {{
            e.stopPropagation();
            openModal(inter.hiresSrc || inter.imageSrc || page.imagePath, inter.title || 'Zoom HD');
          }};
          zone.addEventListener('click', openZ);
          zone.addEventListener('keydown', (e) => {{ if (e.key === 'Enter' || e.key === ' ') openZ(e); }});
          overlay.appendChild(zone);
        }} else if (inter.type === 'fill-blank' || inter.type === 'text-zone') {{
          // ── Widget Zone de Texte / Saisie ───────────────────────
          const wVal  = String(inter.width  || '15%').includes('%') ? inter.width  : (inter.width  + '%');
          const hVal  = String(inter.height || '5%').includes('%')  ? inter.height : (inter.height + '%');
          const wrap = document.createElement('div');
          wrap.className = 'widget-fill-blank';
          wrap.style.left = leftVal; wrap.style.top = topVal;
          wrap.style.width = wVal; wrap.style.height = hVal;

          const inp = inter.multiline ? document.createElement('textarea') : document.createElement('input');
          if (!inter.multiline) inp.type = 'text';
          inp.className = 'fb-input';
          inp.placeholder = inter.placeholder || (inter.multiline ? 'Écrivez ici...' : '...');
          inp.id = 'fb-' + iId;
          inp.dataset.answer = (inter.answer || '').trim();
          inp.dataset.alternatives = inter.acceptAlternatives || '';
          inp.dataset.caseSensitive = inter.caseSensitive ? '1' : '0';
          inp.dataset.groupId = inter.groupId || '';
          inp.setAttribute('autocomplete', 'off');

          // Local storage restoration
          const savedVal = localStorage.getItem('fb_text_' + iId);
          if (savedVal !== null) inp.value = savedVal;

          inp.addEventListener('click', e => e.stopPropagation());
          inp.addEventListener('input', e => {{
            inp.classList.remove('correct', 'incorrect');
            localStorage.setItem('fb_text_' + iId, inp.value);
          }});
          inp.addEventListener('keydown', e => {{
            e.stopPropagation();
            if (e.key === 'Enter' && !inter.multiline) FBEngine.checkOne(inp);
          }});
          wrap.appendChild(inp);

          if (inter.hint) {{
            const hBtn = document.createElement('button');
            hBtn.className = 'fb-hint-btn';
            hBtn.textContent = '?';
            hBtn.title = 'Indice';
            hBtn.addEventListener('click', (e) => {{
              e.stopPropagation();
              let tip = wrap.querySelector('.fb-hint-tooltip');
              if (tip) {{ tip.remove(); return; }}
              tip = document.createElement('div');
              tip.className = 'fb-hint-tooltip';
              tip.textContent = inter.hint;
              wrap.appendChild(tip);
              setTimeout(() => tip && tip.remove(), 3500);
            }});
            wrap.appendChild(hBtn);
          }}
          overlay.appendChild(wrap);
        }} else if (inter.type === 'paint-bucket') {{
          // ── Widget Paint Bucket (Coloriage) ──────────────────────
          const wVal  = String(inter.width  || '20%').includes('%') ? inter.width  : (inter.width  + '%');
          const hVal  = String(inter.height || '15%').includes('%') ? inter.height : (inter.height + '%');

          let paletteBar = document.getElementById('fb-active-paint-palette-' + pNum);
          if (!paletteBar) {{
            paletteBar = document.createElement('div');
            paletteBar.className = 'fb-paint-palette';
            paletteBar.id = 'fb-active-paint-palette-' + pNum;
            const colors = (inter.palette || '#ef4444;#f97316;#f59e0b;#10b981;#06b6d4;#3b82f6;#8b5cf6;#ec4899;#ffffff;#000000').split(';').map(c => c.trim()).filter(Boolean);
            paletteBar.dataset.activeColor = colors[0] || '#ef4444';
            colors.forEach((col, idx) => {{
              const swatch = document.createElement('div');
              swatch.className = 'fb-paint-swatch' + (idx === 0 ? ' active' : '');
              swatch.style.backgroundColor = col;
              swatch.title = col;
              swatch.addEventListener('click', (e) => {{
                e.stopPropagation();
                paletteBar.querySelectorAll('.fb-paint-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                paletteBar.dataset.activeColor = col;
              }});
              paletteBar.appendChild(swatch);
            }});
            overlay.appendChild(paletteBar);
          }}

          const pb = document.createElement('div');
          pb.className = 'widget-paint-bucket';
          pb.id = 'paint-' + iId;
          pb.style.left = leftVal; pb.style.top = topVal;
          pb.style.width = wVal; pb.style.height = hVal;

          const defaultColor = inter.defaultColor || 'transparent';
          const savedCol = localStorage.getItem('fb_paint_' + iId) || defaultColor;
          pb.style.backgroundColor = savedCol;
          pb.dataset.defaultColor = defaultColor;
          pb.dataset.currentColor = savedCol;
          pb.dataset.targetColor = (inter.targetColor || '#ef4444').trim();
          pb.dataset.groupId = inter.groupId || '';
          pb.title = `🪣 Cliquer pour colorier (${{escapeHtml(inter.title || 'Zone')}})`;

          pb.addEventListener('click', (e) => {{
            e.stopPropagation();
            const curPal = document.getElementById('fb-active-paint-palette-' + pNum);
            const chosen = (curPal && curPal.dataset.activeColor) || '#ef4444';
            pb.style.backgroundColor = chosen;
            pb.dataset.currentColor = chosen;
            localStorage.setItem('fb_paint_' + iId, chosen);
            pb.classList.remove('validated-correct', 'validated-wrong');
          }});
          overlay.appendChild(pb);
        }} else if (inter.type === 'drawing-pad') {{
          // ── Widget Drawing Pad (Dessin / Crayon) ──────────────────
          const wVal  = inter.isFullPage ? '100%' : (String(inter.width  || '40%').includes('%') ? inter.width  : (inter.width  + '%'));
          const hVal  = inter.isFullPage ? '100%' : (String(inter.height || '30%').includes('%') ? inter.height : (inter.height + '%'));
          const lVal  = inter.isFullPage ? '0%' : leftVal;
          const tVal  = inter.isFullPage ? '0%' : topVal;

          const padCanvas = document.createElement('canvas');
          padCanvas.className = 'widget-drawing-canvas';
          padCanvas.id = 'draw-' + iId;
          padCanvas.style.left = lVal; padCanvas.style.top = tVal;
          padCanvas.style.width = wVal; padCanvas.style.height = hVal;

          const toolBar = document.createElement('div');
          toolBar.className = 'fb-drawing-toolbar';
          toolBar.innerHTML = `
            <button class="fb-drawing-btn active" data-tool="pencil" type="button">✏️ Crayon</button>
            <button class="fb-drawing-btn" data-tool="highlighter" type="button">🖍️ Surligneur</button>
            <button class="fb-drawing-btn" data-tool="eraser" type="button">🧹 Gomme</button>
            <button class="fb-drawing-btn" data-tool="clear" type="button" style="color:#f87171;">🗑️</button>
          `;

          let currentTool = inter.defaultTool || 'pencil';
          let currentColor = inter.defaultColor || '#2563eb';
          let isPadDrawing = false;
          let padCtx = null;

          toolBar.querySelectorAll('.fb-drawing-btn').forEach(btn => {{
            btn.addEventListener('click', (e) => {{
              e.stopPropagation();
              const t = btn.dataset.tool;
              if (t === 'clear') {{
                if (padCtx) padCtx.clearRect(0, 0, padCanvas.width, padCanvas.height);
                try {{ localStorage.removeItem('fb_draw_' + iId); }} catch(err) {{}}
                return;
              }}
              toolBar.querySelectorAll('.fb-drawing-btn').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              currentTool = t;
            }});
          }});

          const initCanvasSize = () => {{
            const rect = padCanvas.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {{
              padCanvas.width = rect.width * (window.devicePixelRatio || 1);
              padCanvas.height = rect.height * (window.devicePixelRatio || 1);
              padCtx = padCanvas.getContext('2d');
              if (padCtx) {{
                padCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
                const savedImgData = localStorage.getItem('fb_draw_' + iId);
                if (savedImgData) {{
                  const img = new Image();
                  img.onload = () => {{ padCtx.drawImage(img, 0, 0, rect.width, rect.height); }};
                  img.src = savedImgData;
                }}
              }}
            }}
          }};
          setTimeout(initCanvasSize, 300);

          padCanvas.addEventListener('pointerdown', (e) => {{
            e.stopPropagation();
            if (!padCtx) return;
            isPadDrawing = true;
            try {{ padCanvas.setPointerCapture(e.pointerId); }} catch(err) {{}}
            const rect = padCanvas.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;

            if (currentTool === 'pencil') {{
              padCtx.globalCompositeOperation = 'source-over';
              padCtx.strokeStyle = currentColor;
              padCtx.lineWidth = inter.defaultStrokeWidth || 3;
              padCtx.lineCap = 'round'; padCtx.lineJoin = 'round';
              padCtx.beginPath(); padCtx.moveTo(px, py); padCtx.lineTo(px, py); padCtx.stroke();
            }} else if (currentTool === 'highlighter') {{
              padCtx.globalCompositeOperation = 'multiply';
              padCtx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
              padCtx.lineWidth = 14;
              padCtx.lineCap = 'square';
              padCtx.beginPath(); padCtx.moveTo(px, py); padCtx.lineTo(px, py); padCtx.stroke();
            }} else if (currentTool === 'eraser') {{
              padCtx.globalCompositeOperation = 'destination-out';
              padCtx.beginPath(); padCtx.arc(px, py, 14, 0, Math.PI * 2); padCtx.fill();
            }}
          }});

          padCanvas.addEventListener('pointermove', (e) => {{
            if (!isPadDrawing || !padCtx) return;
            e.stopPropagation();
            const rect = padCanvas.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;

            if (currentTool === 'pencil' || currentTool === 'highlighter') {{
              padCtx.lineTo(px, py); padCtx.stroke();
            }} else if (currentTool === 'eraser') {{
              padCtx.beginPath(); padCtx.arc(px, py, 14, 0, Math.PI * 2); padCtx.fill();
            }}
          }});

          const stopDraw = (e) => {{
            if (!isPadDrawing) return;
            isPadDrawing = false;
            try {{ localStorage.setItem('fb_draw_' + iId, padCanvas.toDataURL()); }} catch(err) {{}}
          }};
          padCanvas.addEventListener('pointerup', stopDraw);
          padCanvas.addEventListener('pointercancel', stopDraw);

          overlay.appendChild(padCanvas);
          overlay.appendChild(toolBar);
        }} else if (inter.type === 'reveal') {{
          // ── Widget Révélation au clic ─────────────────────────
          const wVal  = String(inter.width  || '25%').includes('%') ? inter.width  : (inter.width  + '%');
          const hVal  = String(inter.height || '5%').includes('%')  ? inter.height : (inter.height + '%');

          // Couche texte révélé (derrière le masque)
          if (inter.revealText) {{
            const textDiv = document.createElement('div');
            textDiv.className = 'widget-reveal-text';
            textDiv.id = 'rev-text-' + iId;
            textDiv.style.left = leftVal; textDiv.style.top = topVal;
            textDiv.style.width = wVal; textDiv.style.height = hVal;
            textDiv.textContent = inter.revealText;
            overlay.appendChild(textDiv);
          }}

          // Masque cliquable
          const mask = document.createElement('div');
          mask.className = 'widget-reveal';
          mask.id = 'rev-' + iId;
          mask.style.left = leftVal; mask.style.top = topVal;
          mask.style.width = wVal; mask.style.height = hVal;
          mask.style.background = inter.coverColor || '#f59e0b';
          mask.textContent = inter.coverLabel || '💡 Cliquer pour révéler';
          mask.addEventListener('click', (e) => {{
            e.stopPropagation();
            mask.classList.add('revealed');
            const rt = document.getElementById('rev-text-' + iId);
            if (rt) rt.classList.add('visible');
            if (inter.revealAudio) {{
              try {{ new Audio(inter.revealAudio).play().catch(()=>{{}}); }} catch(e) {{}}
            }}
          }});
          overlay.appendChild(mask);
        }} else if (inter.type === 'checkbox-task') {{
          // ── Widget Case à cocher Vrai/Faux ──────────────────
          const cb = document.createElement('div');
          cb.className = 'widget-checkbox';
          cb.id = 'chk-' + iId;
          cb.style.left = leftVal; cb.style.top = topVal;
          if (inter.size) {{
            cb.style.width = inter.size + 'px';
            cb.style.height = inter.size + 'px';
            cb.style.fontSize = Math.max(14, inter.size * 0.5) + 'px';
          }}
          cb.dataset.correct = inter.isCorrect ? '1' : '0';
          cb.dataset.groupId = inter.groupId || '';
          cb.dataset.checked = '0';
          cb.dataset.checked = '0';
          if (inter.hideLabel) {{
            cb.style.padding = '2px';
            cb.style.gap = '0';
            cb.innerHTML = `<div class="chk-box" id="chkbox-${{iId}}"></div>`;
          }} else {{
            cb.innerHTML = `<div class="chk-box" id="chkbox-${{iId}}"></div><span class="chk-label">${{escapeHtml(inter.label || '')}}</span>`;
          }}
          cb.addEventListener('click', (e) => {{
            e.stopPropagation();
            const isChecked = cb.dataset.checked === '1';
            cb.dataset.checked = isChecked ? '0' : '1';
            const box = cb.querySelector('.chk-box');
            if (box) {{
              box.textContent = isChecked ? '' : '✓';
              box.classList.toggle('checked', !isChecked);
            }}
          }});
          overlay.appendChild(cb);
        }}
      }});

      overlay.addEventListener('click', (e) => {{
        if (e.target === overlay) {{
          openModal(page.imagePath, page.title || `Page ${{page.pageNumber}}`);
        }}
      }});

      const num = document.createElement('div');
      num.className = 'page-num ' + (isLeft ? 'left' : 'right');
      num.textContent = page.pageNumber;
      div.appendChild(num);

      const annotCanvas = document.createElement('canvas');
      annotCanvas.className = 'page-annot-canvas';
      annotCanvas.setAttribute('data-page', page.pageNumber);
      div.appendChild(annotCanvas);

      div.appendChild(overlay);
      container.appendChild(div);
      pageElements.push(div);
    }});

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

    pageFlip.loadFromHTML(pageElements);

    pageFlip.on('flip', (e) => {{
      const newPage = e.data + 1;
      if (newPage !== currentPage) {{
        stopAllAudio();
        currentPage = newPage;
        playFlipSound();
        const pData = BOOK.pages[currentPage - 1];
        if (pData && pData.ambientAudio) {{
          playAudio('ambient-' + currentPage, pData.ambientAudio);
        }}
        updateUI();
      }}
    }});

    updateUI();
  }}

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

  // Navigation API
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

  // ── ANNOTATION & DYNAMIC LOUPE ENGINE (WHITEBOARD / LOUPE) ──
  let activeViewerTool = null; // 'pen', 'eraser', 'loupe', null
  let currentAnnotColor = '#0ea5e9';
  let currentAnnotSize = 2.5;
  const pageDrawingsCache = {{}}; // pageNum -> dataURL
  let isAnnotDrawing = false;
  let activeDrawingCanvas = null;
  let activeDrawingCtx = null;

  window.toggleViewerTool = function(tool) {{
    if (activeViewerTool === tool) {{
      activeViewerTool = null;
    }} else {{
      activeViewerTool = tool;
    }}
    applyViewerToolState();
  }};

  window.setAnnotColor = function(color, el, overrideSize) {{
    currentAnnotColor = color;
    if (overrideSize) currentAnnotSize = overrideSize;
    document.querySelectorAll('.palette-colors .color-dot').forEach(d => d.classList.remove('active'));
    if (el) el.classList.add('active');
  }};

  window.setAnnotSize = function(size, el) {{
    currentAnnotSize = size;
    document.querySelectorAll('.palette-sizes .size-dot').forEach(d => d.classList.remove('active'));
    if (el) el.classList.add('active');
  }};

  window.clearActivePageDrawing = function() {{
    const currentCanvases = document.querySelectorAll('.page-annot-canvas');
    currentCanvases.forEach(c => {{
      const pNum = c.getAttribute('data-page');
      const parentPage = c.closest('.page-content');
      if (parentPage && parentPage.offsetParent !== null) {{
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, c.width, c.height);
        delete pageDrawingsCache[pNum];
      }}
    }});
  }};

  function applyViewerToolState() {{
    document.body.classList.remove('annot-mode-pen', 'annot-mode-eraser', 'annot-mode-loupe');
    ['btn-pen', 'btn-eraser', 'btn-loupe'].forEach(bId => {{
      const b = document.getElementById(bId);
      if (b) b.classList.remove('active');
    }});

    const palette = document.getElementById('annot-palette');
    const lens = document.getElementById('circular-loupe-lens');
    if (lens) lens.style.display = 'none';

    if (activeViewerTool === 'pen') {{
      document.body.classList.add('annot-mode-pen');
      const b = document.getElementById('btn-pen');
      if (b) b.classList.add('active');
      if (palette) palette.style.display = 'flex';
      setupAllAnnotCanvases();
    }} else if (activeViewerTool === 'eraser') {{
      document.body.classList.add('annot-mode-eraser');
      const b = document.getElementById('btn-eraser');
      if (b) b.classList.add('active');
      if (palette) palette.style.display = 'flex';
      setupAllAnnotCanvases();
    }} else if (activeViewerTool === 'loupe') {{
      document.body.classList.add('annot-mode-loupe');
      const b = document.getElementById('btn-loupe');
      if (b) b.classList.add('active');
      if (palette) palette.style.display = 'none';
    }} else {{
      if (palette) palette.style.display = 'none';
    }}
  }}

  function setupAllAnnotCanvases() {{
    document.querySelectorAll('.page-annot-canvas').forEach(canvas => {{
      if (!canvas.getAttribute('data-initialized')) {{
        canvas.setAttribute('data-initialized', 'true');
        initCanvasListeners(canvas);
      }}
      refreshCanvasResolution(canvas);
    }});
  }}

  function refreshCanvasResolution(canvas) {{
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {{
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {{
        const pNum = canvas.getAttribute('data-page');
        const prevData = pageDrawingsCache[pNum];
        canvas.width = targetW;
        canvas.height = targetH;
        if (prevData) {{
          const img = new Image();
          img.onload = () => {{
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, targetW, targetH);
          }};
          img.src = prevData;
        }}
      }}
    }}
  }}

  function initCanvasListeners(canvas) {{
    const ctx = canvas.getContext('2d');
    const pNum = canvas.getAttribute('data-page');

    function getCoords(e) {{
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {{
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
        scaleRatio: scaleX
      }};
    }}

    canvas.addEventListener('pointerdown', (e) => {{
      if (activeViewerTool !== 'pen' && activeViewerTool !== 'eraser') return;
      e.preventDefault();
      e.stopPropagation();
      try {{ canvas.setPointerCapture(e.pointerId); }} catch(err) {{}}
      isAnnotDrawing = true;
      activeDrawingCanvas = canvas;
      activeDrawingCtx = ctx;

      const {{ x, y, scaleRatio }} = getCoords(e);
      if (activeViewerTool === 'pen') {{
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentAnnotColor;
        ctx.lineWidth = currentAnnotSize * scaleRatio;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }} else if (activeViewerTool === 'eraser') {{
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 16 * scaleRatio, 0, Math.PI * 2);
        ctx.fill();
      }}
    }});

    canvas.addEventListener('pointermove', (e) => {{
      if (!isAnnotDrawing || activeDrawingCanvas !== canvas) return;
      e.preventDefault();
      e.stopPropagation();
      const {{ x, y, scaleRatio }} = getCoords(e);
      if (activeViewerTool === 'pen') {{
        ctx.lineTo(x, y);
        ctx.stroke();
      }} else if (activeViewerTool === 'eraser') {{
        ctx.beginPath();
        ctx.arc(x, y, 16 * scaleRatio, 0, Math.PI * 2);
        ctx.fill();
      }}
    }});

    const finishDrawing = (e) => {{
      if (!isAnnotDrawing || activeDrawingCanvas !== canvas) return;
      isAnnotDrawing = false;
      activeDrawingCanvas = null;
      activeDrawingCtx = null;
      pageDrawingsCache[pNum] = canvas.toDataURL();
    }};

    canvas.addEventListener('pointerup', finishDrawing);
    canvas.addEventListener('pointercancel', finishDrawing);
  }}

  // ── Dynamic Circular Magnifier Lens (Loupe) ──
  (function initLoupe() {{
    const lens = document.getElementById('circular-loupe-lens');
    if (!lens) return;

    window.addEventListener('mousemove', (e) => {{
      if (activeViewerTool !== 'loupe') {{
        lens.style.display = 'none';
        return;
      }}

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const pageEl = el ? el.closest('.page-content') : null;
      const img = pageEl ? pageEl.querySelector('.page-img') : null;

      if (!img) {{
        lens.style.display = 'none';
        return;
      }}

      const rect = img.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {{
        lens.style.display = 'none';
        return;
      }}

      lens.style.display = 'block';
      lens.style.left = e.clientX + 'px';
      lens.style.top = e.clientY + 'px';

      const zoomFactor = 2.4;
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;

      const bgW = rect.width * zoomFactor;
      const bgH = rect.height * zoomFactor;
      const bgX = -(relX * bgW - 90);
      const bgY = -(relY * bgH - 90);

      lens.style.backgroundImage = `url("${{img.src}}")`;
      lens.style.backgroundSize = `${{bgW}}px ${{bgH}}px`;
      lens.style.backgroundPosition = `${{bgX}}px ${{bgY}}px`;
    }});

    window.addEventListener('mouseleave', () => {{
      if (lens) lens.style.display = 'none';
    }});
  }})();

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

  function playFlipSound() {{
    if (!soundEnabled) return;
    const s = new Audio('{audio_rel_path}');
    s.volume = 0.4;
    s.play().catch(() => {{}});
  }}

  window.toggleSound = () => {{
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('btn-sound');
    btn.textContent = soundEnabled ? '🔊' : '🔇';
    btn.classList.toggle('active', !soundEnabled);
  }};

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

  function openModal(src, alt) {{
    stopAllAudio();
    viewerWrap.classList.add('modal-active');
    modalImg.src = src;
    modalImg.alt = alt;
    modalEl.setAttribute('aria-label', alt);
    resetZoom();
    modalEl.classList.add('open');
    document.getElementById('btn-zoom-in').focus();
  }}

  function closeModal() {{
    stopAllAudio();
    modalEl.classList.remove('open');
    viewerWrap.classList.remove('modal-active');
    modalImg.src = '';
  }}
  window.openModal  = openModal;
  window.closeModal = closeModal;

  function getYouTubeEmbedUrl(url) {{
    if (!url || typeof url !== 'string') return null;
    const regExp = /(?:v=|\\/embed\\/|\\/shorts\\/|youtu\\.be\\/)([a-zA-Z0-9_-]{{11}})/;
    const match = url.match(regExp);
    if (match && match[1]) {{
      return `https://www.youtube-nocookie.com/embed/${{match[1]}}?autoplay=1&rel=0&modestbranding=1`;
    }}
    return null;
  }}

  function openVideoModal(url, title) {{
    stopAllAudio();
    const modal = document.getElementById('video-modal');
    const iframe = document.getElementById('video-modal-iframe');
    const titleEl = document.getElementById('video-modal-title');
    const ytBtn = document.getElementById('video-modal-yt-btn');
    const notice = document.getElementById('video-modal-notice');
    const fallbackLink = document.getElementById('video-modal-link-fallback');

    const embedUrl = getYouTubeEmbedUrl(url);
    if (!embedUrl) return;

    if (titleEl) {{
      titleEl.innerHTML = `<span style="color:#ef4444;">▶</span> ${{escapeHtml(title || 'Vidéo YouTube')}}`;
    }}
    if (ytBtn) {{
      ytBtn.href = url || '#';
    }}
    if (fallbackLink) {{
      fallbackLink.href = url || '#';
    }}
    if (notice) {{
      notice.style.display = (window.location.protocol === 'file:') ? 'block' : 'none';
    }}
    if (iframe) iframe.src = embedUrl;
    if (modal) modal.classList.add('open');

    // Basculer automatiquement en plein écran lors du clic
    const wrap = document.getElementById('video-modal-wrap');
    if (wrap) {{
      if (wrap.requestFullscreen) {{
        const p = wrap.requestFullscreen();
        if (p && typeof p.catch === 'function') p.catch(() => {{}});
      }} else if (wrap.webkitRequestFullscreen) {{
        wrap.webkitRequestFullscreen();
      }}
    }}
  }}

  function closeVideoModal() {{
    if (document.fullscreenElement) {{
      const p = document.exitFullscreen?.();
      if (p && typeof p.catch === 'function') p.catch(() => {{}});
    }} else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {{
      document.webkitExitFullscreen();
    }}
    const modal = document.getElementById('video-modal');
    const iframe = document.getElementById('video-modal-iframe');
    if (iframe) iframe.src = '';
    if (modal) modal.classList.remove('open');
  }}

  function toggleVideoFullscreen() {{
    const wrap = document.getElementById('video-modal-wrap');
    if (!wrap) return;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {{
      if (wrap.requestFullscreen) {{
        const p = wrap.requestFullscreen();
        if (p && typeof p.catch === 'function') p.catch(() => {{}});
      }} else if (wrap.webkitRequestFullscreen) {{
        wrap.webkitRequestFullscreen();
      }}
    }} else {{
      if (document.exitFullscreen) {{
        const p = document.exitFullscreen();
        if (p && typeof p.catch === 'function') p.catch(() => {{}});
      }} else if (document.webkitExitFullscreen) {{
        document.webkitExitFullscreen();
      }}
    }}
  }}

  document.addEventListener('fullscreenchange', () => {{
    const btn = document.getElementById('video-modal-fs-btn');
    if (btn) {{
      btn.innerHTML = (document.fullscreenElement || document.webkitFullscreenElement) ? '🗗' : '⛶';
      btn.title = (document.fullscreenElement || document.webkitFullscreenElement) ? 'Quitter le plein écran' : 'Plein écran';
    }}
  }});

  window.openVideoModal  = openVideoModal;
  window.closeVideoModal = closeVideoModal;
  window.toggleVideoFullscreen = toggleVideoFullscreen;

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

  document.getElementById('modal-img-wrap').addEventListener('wheel', (e) => {{
    e.preventDefault(); e.stopPropagation();
    const delta = -e.deltaY * 0.001 * modalZoom;
    modalZoom = parseFloat(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, modalZoom + delta)).toFixed(3));
    if (modalZoom <= 1) modalTranslate = {{ x: 0, y: 0 }};
    applyZoomTransform(false);
  }}, {{ passive: false }});

  document.getElementById('modal-img-wrap').addEventListener('dblclick', (e) => {{
    e.preventDefault(); e.stopPropagation();
    if (modalZoom > 1) {{
      window.resetZoom();
    }} else {{
      modalZoom = 2.2;
      applyZoomTransform(true);
    }}
  }});

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

  window.openHelp  = () => document.getElementById('help-modal').classList.add('open');
  window.closeHelp = () => document.getElementById('help-modal').classList.remove('open');

  document.addEventListener('keydown', (e) => {{
    const isModal = modalEl.classList.contains('open');
    const vModal  = document.getElementById('video-modal');
    if (vModal && vModal.classList.contains('open')) {{
      if (e.key === 'Escape') {{ e.stopPropagation(); closeVideoModal(); return; }}
    }}
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
      case 'p': case 'P': window.toggleViewerTool('pen'); break;
      case 'e': case 'E': window.toggleViewerTool('eraser'); break;
      case 'z': case 'Z': window.toggleViewerTool('loupe'); break;
      case '?': window.openHelp(); break;
    }}
  }}, true);

  buildThumbs();
  initFlipbook();
}})();
</script>
</body>
</html>
"""
    return html_template


def convert_pdf_to_flipbook(pdf_path, output_dir=None, title=None, subtitle=None, dpi=300, quality=85, pages_config=None, progress_callback=None):
    """Workflow complet de conversion d'un PDF en Flipbook offline avec configuration interactive."""
    def notify(pct, step, msg):
        if progress_callback:
            try:
                progress_callback(pct, step, msg)
            except Exception:
                pass

    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"Fichier PDF introuvable : {pdf_path}")

    notify(5, "Analyse", "Lecture du fichier PDF...")

    pdf_filename = os.path.basename(pdf_path)
    pdf_stem = os.path.splitext(pdf_filename)[0]

    if title is None or not title.strip():
        title = pdf_stem
    if subtitle is None or not subtitle.strip():
        subtitle = f"{title} · Flipbook interactif haute fidélité"
    if output_dir is None or not output_dir.strip():
        output_dir = os.path.join(os.path.dirname(pdf_path) or ".", f"flipbook_{pdf_stem}")

    output_dir = os.path.abspath(output_dir)
    pages_dir = os.path.join(output_dir, "public", "pages")
    thumbs_dir = os.path.join(pages_dir, "thumbs")
    audio_dir = os.path.join(output_dir, "public", "audio")
    modals_dir = os.path.join(output_dir, "public", "modals")

    os.makedirs(pages_dir, exist_ok=True)
    os.makedirs(thumbs_dir, exist_ok=True)
    os.makedirs(audio_dir, exist_ok=True)
    os.makedirs(modals_dir, exist_ok=True)
    assets_dir = os.path.join(output_dir, "public", "assets")
    os.makedirs(assets_dir, exist_ok=True)
    
    source_lottie = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "lottie-success.json")
    if os.path.exists(source_lottie):
        try: shutil.copy2(source_lottie, os.path.join(assets_dir, "lottie-success.json"))
        except: pass

    source_lottie_js = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "lottie.min.js")
    if os.path.exists(source_lottie_js):
        try: shutil.copy2(source_lottie_js, os.path.join(assets_dir, "lottie.min.js"))
        except: pass

    source_icon = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "livre", "icone.png")
    if os.path.exists(source_icon):
        try: shutil.copy2(source_icon, os.path.join(assets_dir, "icone.png"))
        except: pass

    # Organise pages_config by page number if provided
    cfg_by_num = {}
    if pages_config:
        if isinstance(pages_config, list):
            for p in pages_config:
                if isinstance(p, dict):
                    cfg_by_num[int(p.get("pageNumber", 0))] = p
        elif isinstance(pages_config, dict):
            for k, v in pages_config.items():
                try:
                    cfg_by_num[int(k)] = v
                except Exception:
                    pass

    print("=" * 60)
    print(f"CONVERSION DU PDF EN FLIPBOOK")
    print(f"Fichier source : {pdf_path}")
    print(f"Dossier sortie : {output_dir}")
    print(f"Resolution     : {dpi} DPI (Qualité WebP: {quality}%)")
    print("=" * 60)

    # 1. Chargement du document PDF
    print("\n[1/4] Chargement et analyse du PDF...")
    pdf = pdfium.PdfDocument(pdf_path)
    total_pages = len(pdf)
    print(f"      Nombre total de pages : {total_pages}")
    notify(10, "Rendu HD", f"Chargement réussi : {total_pages} pages détectées")

    # Facteurs d'échelle
    dpi_scale = dpi / 72.0
    thumb_scale = 72.0 / 72.0

    # 2. Rendu des pages et miniatures
    print(f"\n[2/4] Rendu des {total_pages} pages en WebP HD...")
    pages_data = []

    for i in range(total_pages):
        page_num = i + 1
        page_filename = f"page-{page_num:03d}.webp"
        page_img_path = os.path.join(pages_dir, page_filename)
        thumb_img_path = os.path.join(thumbs_dir, page_filename)

        page = pdf[i]

        # Rendu HD
        if not os.path.exists(page_img_path):
            pil_image = page.render(scale=dpi_scale).to_pil()
            pil_image.save(page_img_path, "WEBP", quality=quality, method=4)

        # Rendu Miniature
        if not os.path.exists(thumb_img_path):
            thumb_image = page.render(scale=thumb_scale).to_pil()
            w, h = thumb_image.size
            target_w = 240
            target_h = int(h * (target_w / w))
            thumb_resized = thumb_image.resize((target_w, target_h), Image.Resampling.LANCZOS)
            thumb_resized.save(thumb_img_path, "WEBP", quality=75)

        # Configuration spécifique de la page
        p_cfg = cfg_by_num.get(page_num, {})
        page_title = p_cfg.get("title") or f"Page {page_num}"
        raw_interactions = p_cfg.get("interactions", [])
        clean_interactions = []

        for idx_inter, inter in enumerate(raw_interactions):
            inter_id = inter.get("id") or f"inter-{page_num}-{idx_inter+1}"
            inter_type = inter.get("type", "audio")
            x = str(inter.get("x", "50%"))
            y = str(inter.get("y", "50%"))
            if not x.endswith("%"): x = f"{x}%"
            if not y.endswith("%"): y = f"{y}%"

            if inter_type == "tts":
                clean_interactions.append({
                    "id": inter_id,
                    "type": "tts",
                    "title": inter.get("title") or "Lecture du texte",
                    "text": inter.get("text", "").strip(),
                    "lang": inter.get("lang", "fr-FR"),
                    "x": x,
                    "y": y,
                    "size": inter.get("size")
                })
            elif inter_type == "audio":
                audio_src = inter.get("src", "")
                if audio_src and os.path.exists(audio_src):
                    base_audio = os.path.basename(audio_src)
                    dest_audio = os.path.join(audio_dir, base_audio)
                    if not os.path.exists(dest_audio):
                        try: shutil.copy2(audio_src, dest_audio)
                        except Exception: pass
                    audio_src = f"public/audio/{base_audio}"
                clean_interactions.append({
                    "id": inter_id,
                    "type": "audio",
                    "title": inter.get("title") or f"Piste audio {idx_inter+1}",
                    "src": audio_src,
                    "x": x,
                    "y": y,
                    "size": inter.get("size")
                })
            elif inter_type == "video":
                clean_interactions.append({
                    "id": inter_id,
                    "type": "video",
                    "title": inter.get("title") or "Vidéo YouTube",
                    "youtubeUrl": inter.get("youtubeUrl") or "",
                    "x": x,
                    "y": y,
                    "size": inter.get("size")
                })
            elif inter_type in ("zoom", "modal"):
                w = str(inter.get("width", "40%"))
                h = str(inter.get("height", "30%"))
                if not w.endswith("%"): w = f"{w}%"
                if not h.endswith("%"): h = f"{h}%"

                modal_img = inter.get("hiresSrc") or inter.get("imageSrc") or ""
                if modal_img and os.path.exists(modal_img):
                    base_img = os.path.basename(modal_img)
                    dest_img = os.path.join(modals_dir, base_img)
                    if not os.path.exists(dest_img):
                        try: shutil.copy2(modal_img, dest_img)
                        except Exception: pass
                    modal_img = f"public/modals/{base_img}"
                elif not modal_img:
                    crop_filename = f"crop_p{page_num}_{inter_id}.webp"
                    crop_dest = os.path.join(modals_dir, crop_filename)
                    try:
                        fx = float(str(x).replace("%", "").strip())
                        fy = float(str(y).replace("%", "").strip())
                        fw = float(str(w).replace("%", "").strip())
                        fh = float(str(h).replace("%", "").strip())
                        with Image.open(page_img_path) as full_img:
                            im_w, im_h = full_img.size
                            box = (
                                max(0, int(fx / 100.0 * im_w)),
                                max(0, int(fy / 100.0 * im_h)),
                                min(im_w, int((fx + fw) / 100.0 * im_w)),
                                min(im_h, int((fy + fh) / 100.0 * im_h))
                            )
                            cropped = full_img.crop(box)
                            cropped.save(crop_dest, "WEBP", quality=92)
                        modal_img = f"public/modals/{crop_filename}"
                    except Exception as e:
                        print(f"Erreur découpe modal zone: {e}")
                        modal_img = f"public/pages/{page_filename}"

                clean_interactions.append({
                    "id": inter_id,
                    "type": "zoom",
                    "title": inter.get("title") or "Zoom HD",
                    "hiresSrc": modal_img,
                    "x": x,
                    "y": y,
                    "width": w,
                    "height": h
                })
            elif inter_type in ("fill-blank", "text-zone"):
                w = str(inter.get("width", "15%"))
                h = str(inter.get("height", "5%"))
                if not w.endswith("%"): w = f"{w}%"
                if not h.endswith("%"): h = f"{h}%"
                clean_interactions.append({
                    "id": inter_id,
                    "type": "text-zone" if inter_type == "text-zone" else "fill-blank",
                    "title": inter.get("title") or "",
                    "answer": inter.get("answer") or "",
                    "acceptAlternatives": inter.get("acceptAlternatives") or "",
                    "placeholder": inter.get("placeholder") or "",
                    "multiline": bool(inter.get("multiline")),
                    "hint": inter.get("hint") or "",
                    "caseSensitive": inter.get("caseSensitive") or False,
                    "groupId": inter.get("groupId") or "",
                    "x": x,
                    "y": y,
                    "width": w,
                    "height": h
                })
            elif inter_type == "paint-bucket":
                w = str(inter.get("width", "20%"))
                h = str(inter.get("height", "15%"))
                if not w.endswith("%"): w = f"{w}%"
                if not h.endswith("%"): h = f"{h}%"
                clean_interactions.append({
                    "id": inter_id,
                    "type": "paint-bucket",
                    "title": inter.get("title") or "",
                    "defaultColor": inter.get("defaultColor") or "transparent",
                    "targetColor": inter.get("targetColor") or "#ef4444",
                    "palette": inter.get("palette") or "#ef4444;#f97316;#f59e0b;#10b981;#06b6d4;#3b82f6;#8b5cf6;#ec4899;#ffffff;#000000",
                    "shapeType": inter.get("shapeType") or "rect",
                    "groupId": inter.get("groupId") or "",
                    "x": x,
                    "y": y,
                    "width": w,
                    "height": h
                })
            elif inter_type == "drawing-pad":
                w = str(inter.get("width", "40%"))
                h = str(inter.get("height", "30%"))
                if not w.endswith("%"): w = f"{w}%"
                if not h.endswith("%"): h = f"{h}%"
                clean_interactions.append({
                    "id": inter_id,
                    "type": "drawing-pad",
                    "title": inter.get("title") or "",
                    "isFullPage": bool(inter.get("isFullPage")),
                    "defaultTool": inter.get("defaultTool") or "pencil",
                    "defaultColor": inter.get("defaultColor") or "#2563eb",
                    "defaultStrokeWidth": inter.get("defaultStrokeWidth") or 3,
                    "allowPencil": inter.get("allowPencil", True),
                    "allowHighlighter": inter.get("allowHighlighter", True),
                    "allowEraser": inter.get("allowEraser", True),
                    "x": x,
                    "y": y,
                    "width": w,
                    "height": h
                })
            elif inter_type == "reveal":
                w = str(inter.get("width", "25%"))
                h = str(inter.get("height", "5%"))
                if not w.endswith("%"): w = f"{w}%"
                if not h.endswith("%"): h = f"{h}%"
                reveal_audio = inter.get("revealAudio") or ""
                if reveal_audio and os.path.exists(reveal_audio):
                    base_audio = os.path.basename(reveal_audio)
                    dest_audio = os.path.join(audio_dir, base_audio)
                    if not os.path.exists(dest_audio):
                        try: shutil.copy2(reveal_audio, dest_audio)
                        except Exception: pass
                    reveal_audio = f"public/audio/{base_audio}"

                clean_interactions.append({
                    "id": inter_id,
                    "type": "reveal",
                    "title": inter.get("title") or "",
                    "coverLabel": inter.get("coverLabel") or "💡 Cliquer pour révéler",
                    "coverColor": inter.get("coverColor") or "#f59e0b",
                    "revealText": inter.get("revealText") or "",
                    "revealAudio": reveal_audio,
                    "x": x,
                    "y": y,
                    "width": w,
                    "height": h
                })
            elif inter_type == "checkbox-task":
                clean_interactions.append({
                    "id": inter_id,
                    "type": "checkbox-task",
                    "label": inter.get("label") or "",
                    "isCorrect": inter.get("isCorrect") or False,
                    "groupId": inter.get("groupId") or "",
                    "x": x,
                    "y": y,
                    "size": inter.get("size")
                })
            else:
                inter_copy = dict(inter)
                inter_copy["id"] = inter_id
                inter_copy["x"] = x
                inter_copy["y"] = y
                clean_interactions.append(inter_copy)

        ambient_audio = p_cfg.get("ambientAudio")
        if ambient_audio and os.path.exists(ambient_audio):
            base_amb = os.path.basename(ambient_audio)
            dest_amb = os.path.join(audio_dir, base_amb)
            if not os.path.exists(dest_amb):
                try: shutil.copy2(ambient_audio, dest_amb)
                except Exception: pass
            ambient_audio = f"public/audio/{base_amb}"
        else:
            ambient_audio = None

        page_record = {
            "pageNumber": page_num,
            "imagePath": f"public/pages/{page_filename}",
            "thumbPath": f"public/pages/thumbs/{page_filename}",
            "title": page_title,
            "interactions": clean_interactions
        }
        if ambient_audio:
            page_record["ambientAudio"] = ambient_audio

        pages_data.append(page_record)

        # Calcul pourcentage (10% à 85%)
        pct = int(10 + (i + 1) / total_pages * 75)
        notify(pct, "Rendu HD", f"Rendu page {page_num}/{total_pages} ({dpi} DPI)")

        if page_num % 5 == 0 or page_num == total_pages:
            print(f"      -> Page {page_num}/{total_pages} traitée...")

    # 3. Son de feuilletage
    print("\n[3/4] Traitement de l'effet sonore de feuilletage...")
    notify(88, "Audio", "Traitement du son de feuilletage...")
    audio_wav_path = os.path.join(audio_dir, "page-flip.wav")
    source_audio = r"D:\2026-2027\CONVERTISSEUR PDF FLIP BOOK\ressources\page-flip.wav"
    if os.path.exists(source_audio):
        shutil.copy2(source_audio, audio_wav_path)
        print("      -> page-flip.wav copié depuis les ressources externes.")
    elif not os.path.exists(audio_wav_path):
        generate_page_flip_audio(audio_wav_path)
        print("      -> page-flip.wav synthétisé avec succès.")
    else:
        print("      -> page-flip.wav déjà présent.")


    # 4. Génération du fichier HTML autonome
    print("\n[4/4] Assemblage du fichier HTML interactif...")
    notify(94, "Assemblage", "Création du Flipbook HTML5 autonome...")
    pageflip_code = get_pageflip_lib_code()
    html_content = build_flipbook_html(
        title=title,
        subtitle=subtitle,
        pages_data=pages_data,
        pageflip_js_code=pageflip_code,
        audio_rel_path="public/audio/page-flip.wav"
    )

    output_html_file = os.path.join(output_dir, "index.html")
    with open(output_html_file, "w", encoding="utf-8") as f:
        f.write(html_content)

    # Sauvegarde également du fichier JSON des interactions pour réutilisation
    interactions_file = os.path.join(output_dir, "interactions.json")
    with open(interactions_file, "w", encoding="utf-8") as f:
        json.dump({
            "title": title,
            "subtitle": subtitle,
            "totalPages": total_pages,
            "pages": pages_data
        }, f, ensure_ascii=False, indent=2)

    # Batch launcher pratique avec serveur local pour YouTube sans Erreur 153
    bat_file = os.path.join(output_dir, "Ouvrir_Flipbook.bat")
    with open(bat_file, "w", encoding="utf-8") as f:
        f.write(
            '@echo off\n'
            'chcp 65001 > nul\n'
            'title Flipbook Interactif\n'
            'cd /d "%~dp0"\n'
            'where python >nul 2>nul\n'
            'if %errorlevel% equ 0 (\n'
            '    echo ======================================================\n'
            '    echo   Lancement du Flipbook sur http://localhost:8585/\n'
            '    echo   (Serveur HTTP actif pour autoriser les videos YouTube)\n'
            '    echo   Fermez cette fenetre pour arreter le serveur.\n'
            '    echo ======================================================\n'
            '    start "" "http://localhost:8585/index.html"\n'
            '    python -m http.server 8585\n'
            '    exit /b\n'
            ')\n'
            'start "" "%~dp0index.html"\n'
        )

    notify(100, "Terminé", f"Flipbook généré avec succès dans {output_dir}")

    print("\n" + "=" * 60)
    print("CONVERSION TERMINEE AVEC SUCCES !")
    print(f"Flipbook prêt à l'emploi : {output_html_file}")
    print(f"Double-cliquez sur 'Ouvrir_Flipbook.bat' pour le visualiser !")
    print("=" * 60)
    return output_html_file


def main():
    parser = argparse.ArgumentParser(
        description="Convertisseur universel de fichiers PDF en Flipbook HTML5 offline."
    )
    parser.add_argument("pdf", help="Chemin du fichier PDF à convertir")
    parser.add_argument("--out", "-o", default=None, help="Dossier de destination (optionnel)")
    parser.add_argument("--title", "-t", default=None, help="Titre du livre (optionnel)")
    parser.add_argument("--subtitle", "-s", default=None, help="Sous-titre (optionnel)")
    parser.add_argument("--dpi", "-d", type=int, default=300, help="Résolution en DPI (défaut: 300)")
    parser.add_argument("--quality", "-q", type=int, default=85, help="Qualité WebP 1-100 (défaut: 85)")

    args = parser.parse_args()
    convert_pdf_to_flipbook(
        pdf_path=args.pdf,
        output_dir=args.out,
        title=args.title,
        subtitle=args.subtitle,
        dpi=args.dpi,
        quality=args.quality
    )


if __name__ == "__main__":
    main()
