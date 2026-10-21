// Viewer extrait de build_flipbook_html() (scripts/pdf2flipbook.py), en JavaScript simple.
// startViewer(project, { assetBase, root }) monte le livre dans la page.
import { PageFlip } from 'page-flip';
import lottie from 'lottie-web';
import iconUrl from './assets/icone.png';
import LOTTIE_SUCCESS_DATA from './assets/lottie-success.json';
import './viewer.css';

function esc(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function shellHtml(title, subtitle, total) {
    return `
<div class="app" id="app">
  <!-- ═══════════════════════════════════════════════════ TOP BAR -->
  <header class="top" id="topHeader">
    <div class="brand">
      <span class="mark">
        <svg class="i" viewBox="0 0 24 24"><path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13C17 4 14 4.5 12 6z"/><path d="M12 6v13"/></svg>
      </span>
      <div class="titles">
        <h1 id="bTitle">${esc(title)}</h1>
        <p id="bSub">${esc(subtitle)}</p>
      </div>
    </div>

    <div class="top-right">
      <!-- Segmented Mode Switcher (Flipbook / Diapositives) -->
      <div class="mode-switch" role="group" aria-label="Mode d'affichage">
        <button type="button" class="mode-btn active" id="btnModeFlipbook" onclick="setViewerMode('flipbook')" title="Mode Flipbook 3D (Livre interactif)">
          <svg class="i" viewBox="0 0 24 24"><path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13C17 4 14 4.5 12 6z"/><path d="M12 6v13"/></svg>
          <span>Flipbook</span>
        </button>
        <button type="button" class="mode-btn" id="btnModeSlides" onclick="setViewerMode('slides')" title="Mode Diapositives (1 page par écran)">
          <svg class="i" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
          <span>Diapositives</span>
        </button>
      </div>

      <span class="pill" id="topCount" aria-label="Page courante">Page 1 / ${total}</span>

      <button type="button" class="icon-btn fs-toggle" title="Plein écran (F)" aria-label="Plein écran" onclick="toggleFullscreen()">
        <svg class="i i-max" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
        <svg class="i i-min" viewBox="0 0 24 24"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/></svg>
      </button>
    </div>
  </header>

  <!-- ═══════════════════════════════════════════════════ STAGE -->
  <main class="stage" id="stage">
    <button type="button" class="nav prev" id="prev" title="Page précédente (←)" aria-label="Page précédente" onclick="goPrev()">
      <svg class="i" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <div id="viewer-wrap">
      <div id="flipbook-container"></div>
    </div>
    <button type="button" class="nav next" id="next" title="Page suivante (→)" aria-label="Page suivante" onclick="goNext()">
      <svg class="i" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  </main>

  <!-- ═══════════════════════════════════════════════════ TABLE OF CONTENTS -->
  <section class="toc" id="toc" aria-label="Table des matières">
    <div class="toc-head">
      <b>Table des matières</b>
      <span id="tocInfo">${total} pages</span>
    </div>
    <div class="strip" id="strip"></div>
  </section>

  <!-- ═══════════════════════════════════════════════════ DOCK -->
  <div class="dock" id="dock">
    <!-- Floating Pen & Eraser Palette -->
    <div class="pen-panel" id="penPanel" hidden data-tool="pen">
      <div class="colors" id="colors" role="group" aria-label="Couleur du crayon"></div>
      <div class="sizes" id="sizes" role="group" aria-label="Épaisseur du trait">
        <button type="button" class="sz" data-size="2" aria-label="Trait fin" onclick="setDrawingSize(2, this)"><i style="width:5px;height:5px"></i></button>
        <button type="button" class="sz" data-size="5" aria-label="Trait moyen" onclick="setDrawingSize(5, this)"><i style="width:10px;height:10px"></i></button>
        <button type="button" class="sz" data-size="12" aria-label="Trait épais" onclick="setDrawingSize(12, this)"><i style="width:17px;height:17px"></i></button>
      </div>
      <span class="sep"></span>
      <button type="button" class="mini" id="undo" title="Annuler le dernier trait" aria-label="Annuler le dernier trait" onclick="undoLastStroke()">
        <svg class="i" viewBox="0 0 24 24"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-15-6.7L3 13"/></svg>
      </button>
      <button type="button" class="mini" id="clearPages" title="Effacer les annotations de la page" aria-label="Effacer les annotations" onclick="clearActivePageDrawing()">
        <svg class="i" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
      </button>
    </div>

    <!-- Floating Paint Bucket Palette -->
    <div class="bucket-panel" id="bucketPanel" hidden data-tool="bucket">
      <div class="colors" id="bucketColors" role="group" aria-label="Palette du pot de peinture"></div>
      <span class="sep"></span>
      <button type="button" class="mini" id="undoBucketFill" title="Annuler le dernier coloriage" aria-label="Annuler le coloriage" onclick="undoLastFill()">
        <svg class="i" viewBox="0 0 24 24"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-15-6.7L3 13"/></svg>
      </button>
      <button type="button" class="mini" id="clearFills" title="Effacer les couleurs coloriées" aria-label="Effacer les couleurs" onclick="clearActivePageFill()">
        <svg class="i" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
      </button>
      <button type="button" class="mini-btn-validate" id="btnValidateColoring" onclick="validatePageDrawings()" title="Corriger l'exercice de coloriage">
        <svg class="i" viewBox="0 0 24 24" style="width:14px;height:14px;"><path d="M20 6L9 17l-5-5"/></svg>
        <span>Corriger</span>
      </button>
    </div>

    <!-- Floating Arrow Tool Panel -->
    <div class="arrow-panel" id="arrowPanel" hidden data-tool="arrow">
      <button type="button" class="mini-btn-validate" id="btnValidateArrows" onclick="validatePageArrows()" title="Corriger toutes les flèches de la page">
        <svg class="i" viewBox="0 0 24 24" style="width:14px;height:14px;"><path d="M20 6L9 17l-5-5"/></svg>
        <span>Corriger</span>
      </button>
      <span class="sep"></span>
      <button type="button" class="mini" id="undoArrow" title="Annuler la dernière flèche" aria-label="Annuler la flèche" onclick="undoLastArrow()">
        <svg class="i" viewBox="0 0 24 24"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-15-6.7L3 13"/></svg>
      </button>
      <button type="button" class="mini" id="clearArrows" title="Effacer toutes les flèches" aria-label="Effacer toutes les flèches" onclick="clearPageArrows()">
        <svg class="i" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
      </button>
    </div>

    <!-- Main Navigation & Tools Dock -->
    <nav class="tools" aria-label="Outils du flipbook">
      <button type="button" class="tb" id="tPrev" title="Page précédente (←)" aria-label="Page précédente" onclick="goPrev()">
        <svg class="i" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span class="count" id="toolCount" aria-live="polite" onclick="promptPage()" title="Cliquer pour aller à une page">1 / ${total}</span>
      <button type="button" class="tb" id="tNext" title="Page suivante (→)" aria-label="Page suivante" onclick="goNext()">
        <svg class="i" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
      </button>
      <span class="sep"></span>
      <button type="button" class="tb" id="penBtn" aria-pressed="false" title="Crayon (P)" aria-label="Crayon pour dessiner ou annoter" onclick="toggleViewerTool('pen')">
        <svg class="i" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>
      </button>
      <button type="button" class="tb" id="calligraphyBtn" aria-pressed="false" title="Plume calligraphique (K)" aria-label="Plume calligraphique pour écriture fluide et artistique" onclick="toggleViewerTool('calligraphy')">
        <svg class="i" viewBox="0 0 24 24"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
      </button>
      <button type="button" class="tb" id="eraserBtn" aria-pressed="false" title="Gomme (E)" aria-label="Gomme pour effacer" onclick="toggleViewerTool('eraser')">
        <svg class="i" viewBox="0 0 24 24"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
      </button>
      <button type="button" class="tb" id="bucketBtn" aria-pressed="false" title="Pot de peinture : colorier les zones" aria-label="Pot de peinture" onclick="toggleViewerTool('bucket')">
        <svg class="i" viewBox="0 0 24 24"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"/></svg>
      </button>
      <button type="button" class="tb" id="arrowToolBtn" aria-pressed="false" title="Tracer des flèches" aria-label="Tracer des flèches" onclick="toggleViewerTool('arrow')">
        <svg class="i" viewBox="0 0 24 24"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
      </button>
      <button type="button" class="tb" id="circleToolBtn" aria-pressed="false" title="Entourer la zone (C)" aria-label="Entourer la zone" onclick="toggleViewerTool('circle')">
        <svg class="i" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="8" ry="5.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button type="button" class="tb" id="loupeBtn" aria-pressed="false" title="Loupe (Z)" aria-label="Loupe grossissante" onclick="toggleViewerTool('loupe')">
        <svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      </button>
      <span class="sep"></span>
      <button type="button" class="tb" id="tocBtn" aria-expanded="false" aria-controls="toc" title="Table des matières (T)" aria-label="Table des matières" onclick="toggleToc()">
        <svg class="i" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
      </button>
      <button type="button" class="tb" id="soundBtn" title="Couper le son de page (M)" aria-label="Activer/désactiver le son" onclick="toggleSound()">
        <svg class="i i-sound-on" viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        <svg class="i i-sound-off" viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>
      </button>
      <span class="sep sep-fs"></span>
      <button type="button" class="tb tb-fs fs-toggle" title="Plein écran (F)" aria-label="Plein écran" onclick="toggleFullscreen()">
        <svg class="i i-max" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
        <svg class="i i-min" viewBox="0 0 24 24"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/></svg>
      </button>
    </nav>
  </div>

  <!-- ═══════════════════════════════════════════════════ TOAST NOTIFICATION -->
  <div class="toast" id="toast" role="status" aria-live="polite"></div>

  <!-- ═══════════════════════════════════════════════════ CIRCULAR LOUPE LENS -->
  <div id="circular-loupe-lens" class="circular-loupe-lens" style="display:none;"></div>

  <!-- ═══════════════════════════════════════════════════ ZOOM HD MODAL -->
  <div id="image-modal" role="dialog" aria-modal="true" aria-label="Agrandissement HD" onclick="closeModal()">
    <div class="modal-dialog" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3 id="zoom-modal-title"><span style="color:var(--brand);margin-right:6px">🔍</span>Zoom Haute Définition</h3>
        <div class="modal-header-actions">
          <div class="modal-zoom-controls" role="group" aria-label="Contrôles de zoom">
            <button type="button" class="modal-zoom-btn" id="btn-zoom-out" onclick="adjustZoom(-0.25)" title="Zoom arrière (-)">−</button>
            <span class="modal-zoom-level" id="zoom-level">100%</span>
            <button type="button" class="modal-zoom-btn" id="btn-zoom-in" onclick="adjustZoom(0.25)" title="Zoom avant (+)">+</button>
            <button type="button" class="modal-zoom-btn" id="btn-zoom-reset" onclick="resetZoom()" title="Réinitialiser (0)">1:1</button>
          </div>
          <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fermer (Échap)">✕</button>
        </div>
      </div>
      <div class="modal-body" id="modal-img-wrap">
        <div id="modal-viewport" class="modal-viewport">
          <img id="modal-img" src="" alt="Zoom HD" draggable="false" />
          <canvas id="modal-annot-canvas" class="modal-annot-canvas"></canvas>
          <svg id="modal-arrow-svg" class="modal-arrow-svg">
            <defs>
              <marker id="arrowhead-modal-draft" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <polygon points="0 0.5, 5 2.5, 0 4.5" fill="#3b82f6"/>
              </marker>
              <marker id="arrowhead-modal-student" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <polygon points="0 0.5, 5 2.5, 0 4.5" fill="#6366f1"/>
              </marker>
              <marker id="arrowhead-modal-correct" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <polygon points="0 0.5, 5 2.5, 0 4.5" fill="#22c55e"/>
              </marker>
              <marker id="arrowhead-modal-incorrect" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <polygon points="0 0.5, 5 2.5, 0 4.5" fill="#ef4444"/>
              </marker>
              <marker id="arrowhead-modal-expected" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <polygon points="0 0.5, 5 2.5, 0 4.5" fill="#0ea5e9"/>
              </marker>
              <marker id="arrowhead-modal-missing" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <polygon points="0 0.5, 5 2.5, 0 4.5" fill="#eab308"/>
              </marker>
            </defs>
            <g class="modal-arrow-renders-layer"></g>
            <g class="modal-arrow-draft-layer"></g>
          </svg>
          <div id="modal-overlay" class="modal-overlay"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════ VIDEO MODAL -->
  <div id="video-modal" role="dialog" aria-modal="true" aria-label="Vidéo YouTube" onclick="closeVideoModal()">
    <div class="modal-dialog" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3 id="video-modal-title"><span style="color:#ef4444;margin-right:6px">▶</span>Vidéo YouTube</h3>
        <div style="display:flex; align-items:center; gap:8px;">
          <a id="video-modal-yt-btn" href="#" target="_blank" rel="noopener noreferrer" style="font-size:12px; color:var(--brand); text-decoration:none; display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:8px; background:color-mix(in srgb,var(--brand) 15%,transparent); border:1px solid var(--line);" title="Ouvrir sur YouTube">↗ YouTube</a>
          <button type="button" class="modal-close-btn" onclick="closeVideoModal()" title="Fermer (Échap)">✕</button>
        </div>
      </div>
      <div class="modal-body">
        <div class="video-frame-container">
          <iframe id="video-modal-iframe" src="" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>
      </div>
    </div>
  </div>
</div>
`;
}


export function startViewer(project, options = {}) {
    const base = options.assetBase || '';
    const assetBase = base && !base.endsWith('/') ? base + '/' : base;
    const asset = (p) => (!p || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(p)) ? p : assetBase + String(p).replace(/^\.?\//, '');

    const title = project.title || 'Flipbook';
    const subtitle = project.subtitle || '';
    const total = (project.pages || []).length;
    document.title = title + ' — Flipbook Interactif';
    (options.root || document.body).insertAdjacentHTML('afterbegin', shellHtml(title, subtitle, total));
    const BOOK = project;
    const TOTAL = total;

    let currentPage = 1;
    let soundEnabled = true;
    let pageFlip = null;
    let thumbDrawerOpen = false;
    let currentMode = (project.startMode === 'slides') ? 'slides' : 'flipbook';

    // Audio & Speech State
    let currentAudio = null;
    let playingAudioId = null;
    let currentUtterance = null;

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    const AUDIO_ICON_SVG = `<img src="${iconUrl}" style="width:100%;height:100%;object-fit:contain;pointer-events:none;" alt="Audio"/>`;

    const ZOOM_LOUPE_SVG = `<svg class="zoom-loupe-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;

    let ttsKaraokeTimer = null;

    // ═══════════════════════════════════════════════════════════════
    // FBEngine — Moteur interactif TBI (fill-blank + checkbox + score)
    // ═══════════════════════════════════════════════════════════════
    const FBEngine = (function () {
        let scorePanel = null;

        function normalize(str, caseSensitive) {
            const s = str.trim().replace(/\s+/g, ' ');
            return caseSensitive ? s : s.toLowerCase();
        }

        function checkOne(inp) {
            if (!inp) return false;
            const answer = inp.dataset.answer || '';
            const alts = (inp.dataset.alternatives || '').split(';').map(s => s.trim()).filter(Boolean);
            const cs = inp.dataset.caseSensitive === '1';
            const userVal = normalize(inp.value, cs);
            const expected = [normalize(answer, cs), ...alts.map(a => normalize(a, cs))];
            const ok = expected.includes(userVal);
            inp.classList.remove('correct', 'incorrect');
            void inp.offsetWidth;
            inp.classList.add(ok ? 'correct' : 'incorrect');
            if (ok) inp.readOnly = true;
            return ok;
        }

        function validateGroup(groupId, targetPage) {
            const activePages = (targetPage !== undefined && targetPage !== null && targetPage !== '')
                ? [Number(targetPage)]
                : (typeof getActivePageNumbers === 'function' ? getActivePageNumbers() : []);

            const isPageActive = (el) => {
                if (activePages.length === 0) return true;
                const p = Number(el.dataset.page);
                return !p || activePages.includes(p);
            };

            const inputs = Array.from(document.querySelectorAll('.fb-input'))
                .filter(inp => (!groupId || inp.dataset.groupId === groupId) && isPageActive(inp));
            let correct = 0;
            inputs.forEach(inp => { if (checkOne(inp)) correct++; });

            const checkboxes = Array.from(document.querySelectorAll('.widget-checkbox'))
                .filter(cb => (!groupId || cb.dataset.groupId === groupId) && isPageActive(cb));

            let correctChecked = 0;
            let wrongChecked = 0;
            let missingChecked = 0;

            checkboxes.forEach(cb => {
                cb.querySelectorAll('.chk-feedback-badge').forEach(b => b.remove());
                const isChecked = cb.dataset.checked === '1';
                const isExpected = cb.dataset.correct === '1';

                const box = cb.querySelector('.chk-box');
                cb.classList.remove('validated-correct', 'validated-wrong', 'validated-missing');
                if (box) box.classList.remove('box-correct', 'box-wrong', 'box-missing');

                if (isChecked && isExpected) {
                    correct++;
                    correctChecked++;
                    cb.classList.add('validated-correct');
                    if (box) {
                        box.classList.add('box-correct');
                        box.textContent = '✓';
                    }
                    const badge = document.createElement('span');
                    badge.className = 'chk-feedback-badge chk-badge-correct';
                    badge.textContent = '✓';
                    cb.appendChild(badge);
                } else if (isChecked && !isExpected) {
                    wrongChecked++;
                    cb.classList.add('validated-wrong');
                    if (box) {
                        box.classList.add('box-wrong');
                        box.textContent = '✕';
                    }
                    const badge = document.createElement('span');
                    badge.className = 'chk-feedback-badge chk-badge-wrong';
                    badge.textContent = '✕';
                    cb.appendChild(badge);
                } else if (!isChecked && isExpected) {
                    missingChecked++;
                    cb.classList.add('validated-missing');
                    if (box) {
                        box.classList.add('box-missing');
                        box.textContent = '✓';
                    }
                } else {
                    correct++;
                }
            });

            if (typeof window.validatePageArrows === 'function') {
                window.validatePageArrows();
            }
            if (typeof window.validatePageDrawings === 'function') {
                window.validatePageDrawings();
            }
            if (typeof validatePageChoices === 'function') {
                activePages.forEach(pNum => validatePageChoices(pNum));
            }

            if (checkboxes.length > 0) {
                const isAllPerfect = (wrongChecked === 0 && missingChecked === 0);
                if (isAllPerfect) {
                    playCelebrationChime();
                    playLottieSuccess();
                    toast('Bravo ! Toutes les cases cochées sont correctes ! ⭐');
                } else {
                    toast(`Correction : ${correctChecked} bonne(s) réponse(s), ${wrongChecked + missingChecked} erreur(s).`);
                }
            }

            const totalItems = inputs.length + checkboxes.length;
            if (totalItems > 0) {
                showScore(correct, totalItems, targetPage);
            }
        }

        function revealAnswers(groupId, targetPage) {
            const activePages = (targetPage !== undefined && targetPage !== null && targetPage !== '')
                ? [Number(targetPage)]
                : (typeof getActivePageNumbers === 'function' ? getActivePageNumbers() : []);
            const isPageActive = (el) => {
                if (activePages.length === 0) return true;
                const p = Number(el.dataset.page);
                return !p || activePages.includes(p);
            };
            document.querySelectorAll('.fb-input').forEach(inp => {
                if ((!groupId || inp.dataset.groupId === groupId) && isPageActive(inp)) {
                    inp.value = inp.dataset.answer;
                    inp.classList.remove('incorrect'); inp.classList.add('correct');
                    inp.readOnly = true;
                }
            });
            document.querySelectorAll('.widget-checkbox').forEach(cb => {
                if ((!groupId || cb.dataset.groupId === groupId) && isPageActive(cb)) {
                    cb.querySelectorAll('.chk-feedback-badge').forEach(b => b.remove());
                    const isCorrect = cb.dataset.correct === '1';
                    cb.dataset.checked = isCorrect ? '1' : '0';
                    const box = cb.querySelector('.chk-box');
                    if (box) {
                        box.textContent = isCorrect ? '✓' : '';
                        box.classList.toggle('checked', isCorrect);
                        box.classList.remove('box-wrong', 'box-missing');
                        box.classList.toggle('box-correct', isCorrect);
                    }
                    cb.classList.remove('validated-wrong', 'validated-missing');
                    cb.classList.add('validated-correct');
                }
            });
        }

        function resetGroup(groupId, targetPage) {
            const activePages = (targetPage !== undefined && targetPage !== null && targetPage !== '')
                ? [Number(targetPage)]
                : (typeof getActivePageNumbers === 'function' ? getActivePageNumbers() : []);
            const isPageActive = (el) => {
                if (activePages.length === 0) return true;
                const p = Number(el.dataset.page);
                return !p || activePages.includes(p);
            };
            document.querySelectorAll('.fb-input').forEach(inp => {
                if ((!groupId || inp.dataset.groupId === groupId) && isPageActive(inp)) {
                    inp.value = ''; inp.classList.remove('correct', 'incorrect'); inp.readOnly = false;
                }
            });
            document.querySelectorAll('.widget-checkbox').forEach(cb => {
                if ((!groupId || cb.dataset.groupId === groupId) && isPageActive(cb)) {
                    cb.querySelectorAll('.chk-feedback-badge').forEach(b => b.remove());
                    cb.dataset.checked = '0';
                    const box = cb.querySelector('.chk-box');
                    if (box) {
                        box.textContent = '';
                        box.classList.remove('checked', 'box-correct', 'box-wrong', 'box-missing');
                    }
                    cb.classList.remove('validated-correct', 'validated-wrong', 'validated-missing');
                }
            });
            if (scorePanel) { scorePanel.remove(); scorePanel = null; }
        }


        function playCelebrationChime() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const notes = [523.25, 659.25, 783.99, 1046.50];
                notes.forEach((freq, idx) => {
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
                });
            } catch (e) { }
        }

        function playLottieSuccess() {
            const containerId = 'lottie-success-container';
            let c = document.getElementById(containerId);
            if (!c) {
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
            }
            c.innerHTML = '<div id="lottie-success-anim" style="width: 420px; height: 420px; filter: drop-shadow(0 12px 28px rgba(0,0,0,0.6));"></div>';

            playCelebrationChime();

            if (lottie && typeof LOTTIE_SUCCESS_DATA !== 'undefined') {
                try {
                    lottie.loadAnimation({
                        container: document.getElementById('lottie-success-anim'),
                        renderer: 'svg',
                        loop: false,
                        autoplay: true,
                        animationData: LOTTIE_SUCCESS_DATA
                    });
                    setTimeout(() => { if (c) c.innerHTML = ''; }, 3500);
                    return;
                } catch (err) {
                    console.error('Lottie inline error', err);
                }
            }

        }

        function showScore(correct, total, targetPage) {
            const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
            if (!scorePanel) {
                scorePanel = document.createElement('div');
                scorePanel.className = 'score-panel';
                document.body.appendChild(scorePanel);
            }
            const star = pct === 100 ? ' ⭐' : '';
            if (pct === 100 && total > 0) {
                playLottieSuccess();
            }
            const pageArg = (targetPage !== undefined && targetPage !== null && targetPage !== '') ? String(targetPage) : '';
            scorePanel.innerHTML =
                '<h4>📊 Score de la page</h4>' +
                '<span class="score-num">' + correct + ' / ' + total + star + '</span>' +
                '<span class="score-sub">' + pct + '% de bonnes réponses</span>' +
                '<div class="score-bar-wrap"><div class="score-bar" style="width:' + pct + '%"></div></div>' +
                '<div class="score-btns">' +
                `<button class="score-btn validate-btn" onclick="FBEngine.validateGroup('', '${pageArg}')">Corriger</button>` +
                `<button class="score-btn" onclick="FBEngine.revealAnswers('', '${pageArg}')">Réponses</button>` +
                `<button class="score-btn" onclick="FBEngine.resetGroup('', '${pageArg}')">Refaire</button>` +
                '</div>';
        }

        return { checkOne, validateGroup, revealAnswers, resetGroup, showScore };
    })();
    window.FBEngine = FBEngine;



    function stopAllAudio() {
        if (currentAudio) {
            try { currentAudio.pause(); currentAudio.currentTime = 0; } catch (e) { }
            currentAudio = null;
        }
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
            try { window.speechSynthesis.cancel(); } catch (e) { }
        }
        if (ttsKaraokeTimer) {
            clearInterval(ttsKaraokeTimer);
            ttsKaraokeTimer = null;
        }
        document.querySelectorAll('.tts-karaoke-bubble').forEach(b => b.remove());
        document.querySelectorAll('.audio-btn').forEach(b => b.classList.remove('playing'));
        playingAudioId = null;
    }

    function playAudio(id, src) {
        if (playingAudioId === id) {
            stopAllAudio();
            return;
        }
        stopAllAudio();
        try {
            const audio = new Audio(src);
            currentAudio = audio;
            playingAudioId = id;
            const btn = document.getElementById('abtn-' + id);
            if (btn) btn.classList.add('playing');
            audio.onended = () => stopAllAudio();
            audio.onerror = () => stopAllAudio();
            audio.play().catch(() => stopAllAudio());
        } catch (e) {
            stopAllAudio();
        }
    }

    function playTTS(id, text, lang) {
        if (playingAudioId === id) {
            stopAllAudio();
            return;
        }
        stopAllAudio();

        const cleanText = (text || '').trim();
        if (!cleanText) {
            return;
        }

        const btn = document.getElementById('tts-' + id);
        if (btn) btn.classList.add('playing');
        playingAudioId = id;

        const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(cleanText);
        const targetLang = (hasArabic || lang === 'ar-SA' || (lang && lang.startsWith('ar'))) ? 'ar-SA' : (lang || 'fr-FR');

        function speakWebSpeech() {
            if (!('speechSynthesis' in window)) {
                stopAllAudio();
                return;
            }
            try {
                window.speechSynthesis.cancel();
                if (typeof window.speechSynthesis.resume === 'function') {
                    window.speechSynthesis.resume();
                }
                const utt = new SpeechSynthesisUtterance(cleanText);
                utt.lang = targetLang;
                utt.rate = 0.90;
                utt.pitch = 1.0;
                currentUtterance = utt;

                function assignVoice() {
                    try {
                        const voices = window.speechSynthesis.getVoices();
                        if (voices && voices.length > 0) {
                            if (hasArabic || targetLang.startsWith('ar')) {
                                const arVoice = voices.find(v =>
                                    (v.lang && (v.lang.startsWith('ar') || v.lang === 'ar-SA' || v.lang === 'ar-EG')) ||
                                    (v.name && (v.name.toLowerCase().includes('arabic') || v.name.includes('عرب') || v.name.includes('Hoda') || v.name.includes('Naayf') || v.name.includes('Laila') || v.name.includes('Tarik') || v.name.includes('Maged')))
                                );
                                if (arVoice) utt.voice = arVoice;
                            } else if (targetLang) {
                                const exactVoice = voices.find(v => v.lang && v.lang.replace('_', '-').toLowerCase() === targetLang.toLowerCase());
                                const prefixVoice = voices.find(v => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith(targetLang.split('-')[0].toLowerCase()));
                                const match = exactVoice || prefixVoice;
                                if (match) utt.voice = match;
                            }
                        }
                    } catch (err) {}
                }

                assignVoice();
                utt.onend = () => stopAllAudio();
                utt.onerror = () => stopAllAudio();
                window.speechSynthesis.speak(utt);
            } catch (e) {
                stopAllAudio();
            }
        }

        // For Arabic: use high-quality native Arabic TTS audio stream
        if (hasArabic || targetLang.startsWith('ar')) {
            try {
                const chunks = [];
                let rem = cleanText;
                while (rem.length > 0) {
                    if (rem.length <= 180) {
                        chunks.push(rem);
                        break;
                    }
                    let splitIdx = rem.lastIndexOf(' ', 180);
                    if (splitIdx <= 0) splitIdx = 180;
                    chunks.push(rem.slice(0, splitIdx).trim());
                    rem = rem.slice(splitIdx).trim();
                }

                let chunkIdx = 0;
                function playNext() {
                    if (chunkIdx >= chunks.length || playingAudioId !== id) {
                        stopAllAudio();
                        return;
                    }
                    const textChunk = chunks[chunkIdx++];
                    const audioUrl = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q=' + encodeURIComponent(textChunk);
                    const audio = new Audio(audioUrl);
                    currentAudio = audio;
                    audio.onended = () => playNext();
                    audio.onerror = () => speakWebSpeech();
                    const p = audio.play();
                    if (p !== undefined) {
                        p.catch(() => speakWebSpeech());
                    }
                }

                playNext();
                return;
            } catch (e) {
                speakWebSpeech();
                return;
            }
        }

        speakWebSpeech();
    }

    // Modal zoom state
    let modalZoom = 1;
    let modalTranslate = { x: 0, y: 0 };
    let isDragging = false;
    let dragStart = null;
    let translateAtDrag = { x: 0, y: 0 };
    let pinchStartDist = null;
    let pinchStartZoom = 1;
    const MIN_ZOOM = 0.5, MAX_ZOOM = 5, ZOOM_STEP = 0.25;

    // DOM refs
    const viewerWrap = document.getElementById('viewer-wrap');
    let container = document.getElementById('flipbook-container');
    const modalEl = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');

    function calcDimensions() {
        const stage = document.getElementById('stage') || viewerWrap;
        const sRect = stage ? stage.getBoundingClientRect() : null;
        const winW = (sRect && sRect.width > 200) ? sRect.width : window.innerWidth;
        const winH = (sRect && sRect.height > 200) ? sRect.height : (window.innerHeight - 76);
        const narrow = winW < 768;
        // Keep clear of floating prev/next buttons (42px)
        const sideGap = narrow ? 16 : 84;
        const availW = Math.max(300, winW - sideGap);
        const availH = Math.max(380, winH - 12);
        const RATIO = 0.707;
        const maxByW = (availW - 12) / 2;
        const maxByH = availH * RATIO;
        const w = Math.max(260, Math.floor(Math.min(maxByW, maxByH)));
        const h = Math.max(368, Math.floor(w / RATIO));
        return { w, h };
    }

    function initFlipbook() {
        const { w, h } = calcDimensions();

        if (pageFlip) {
            try { pageFlip.destroy(); } catch (e) { }
            pageFlip = null;
        }

        viewerWrap.innerHTML = '<div id="flipbook-container"></div>';
        container = document.getElementById('flipbook-container');

        container.style.cssText = [
            'width:' + (w * 2) + 'px',
            'height:' + h + 'px',
            'position:relative',
            'margin:0 auto',
            'box-sizing:border-box',
        ].join(';');

        const pageElements = [];
        BOOK.pages.forEach((page, idx) => {
            const div = createPageElement(page, idx);
            container.appendChild(div);
            pageElements.push(div);
        });

        pageFlip = new PageFlip(container, {
            width: w, height: h,
            size: 'fixed',
            minWidth: 280, maxWidth: 1000,
            minHeight: 396, maxHeight: 1400,
            drawShadow: true,
            maxShadowOpacity: 0.45,
            showCover: true,
            usePortrait: false,
            startPage: Math.max(0, currentPage - 1),
            flippingTime: 650,
            disableFlipByClick: true,
            showPageCorners: false,
            mobileScrollSupport: false,
        });

        pageFlip.loadFromHTML(pageElements);

        pageFlip.on('flip', (e) => {
            const newPage = e.data + 1;
            if (newPage !== currentPage) {
                stopAllAudio();
                currentPage = newPage;
                playFlipSound();
                const pData = BOOK.pages[currentPage - 1];
                if (pData && pData.ambientAudio) {
                    playAudio('ambient-' + currentPage, asset(pData.ambientAudio));
                }
                updateUI();
                setTimeout(() => {
                    setupAllAnnotCanvases();
                }, 350);
            }
        });

        setupAllAnnotCanvases();
        setTimeout(setupAllAnnotCanvases, 150);
        setTimeout(setupAllAnnotCanvases, 600);
        updateUI();
    }

    function createPageElement(page, idx) {
        const isLeft = (page.pageNumber % 2 === 0);
        const div = document.createElement('div');
        div.className = 'page-item';
        div.dataset.density = (idx === 0 || idx === TOTAL - 1) ? 'hard' : 'soft';

        const pNum = page.pageNumber || (idx + 1);
        const pad3 = String(pNum).padStart(3, '0');

        const img = document.createElement('img');
        img.className = 'page-img';
        img.alt = page.title || `Page ${pNum}`;
        img.loading = 'lazy';

        const candidatePaths = [
            page.imagePath ? asset(page.imagePath) : null,
            asset(`public/pages/page-${pad3}.webp`),
            asset(`public/pages/page_${pNum}.webp`),
            asset(`public/pages/page-${pNum}.webp`),
            asset(`pages/page-${pad3}.webp`),
            asset(`pages/page_${pNum}.webp`),
            asset(`page-${pad3}.webp`),
            asset(`page_${pNum}.webp`),
        ].filter(Boolean);

        let cIdx = 0;
        img.src = candidatePaths[0];

        img.onerror = () => {
            cIdx++;
            if (cIdx < candidatePaths.length) {
                img.src = candidatePaths[cIdx];
            } else {
                if (!div.querySelector('.page-fallback')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'page-fallback';
                    fallback.innerHTML = `
                        <span class="page-fallback-badge">Page ${pNum}</span>
                        <h2 style="font-family:'Bricolage Grotesque',sans-serif;font-size:26px;margin:8px 0;">${esc(page.title || `Page ${pNum}`)}</h2>
                        <p style="color:var(--muted);font-size:14px;">${esc(BOOK.title || 'Flipbook')}</p>
                    `;
                    div.appendChild(fallback);
                }
            }
        };
        div.appendChild(img);

        const spine = document.createElement('div');
        spine.className = isLeft ? 'page-spine-left' : 'page-spine-right';
        div.appendChild(spine);

        const overlay = document.createElement('div');
        overlay.className = 'page-overlay';

        (page.interactions || []).forEach((inter, idxInter) => {
            const iId = inter.id || `${page.pageNumber}-${idxInter}`;
            const rawX = (inter.x !== undefined && inter.x !== null) ? inter.x : ((inter.left !== undefined && inter.left !== null) ? inter.left : '50%');
            const rawY = (inter.y !== undefined && inter.y !== null) ? inter.y : ((inter.top !== undefined && inter.top !== null) ? inter.top : '50%');
            const leftVal = String(rawX).includes('%') ? rawX : (rawX + '%');
            const topVal = String(rawY).includes('%') ? rawY : (rawY + '%');

            if (inter.type === 'audio') {
                const btn = document.createElement('button');
                btn.className = 'audio-btn';
                btn.id = 'abtn-' + iId;
                btn.style.left = leftVal;
                btn.style.top = topVal;
                if (inter.size) {
                    btn.style.width = inter.size + 'px';
                    btn.style.height = inter.size + 'px';
                    btn.style.fontSize = Math.max(12, inter.size * 0.45) + 'px';
                }
                btn.setAttribute('aria-label', inter.title || "Écouter l'audio");
                btn.title = inter.title || '';
                btn.innerHTML = `${AUDIO_ICON_SVG}`;
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    playAudio(iId, asset(inter.src));
                });
                overlay.appendChild(btn);
            } else if (inter.type === 'tts') {
                const btn = document.createElement('button');
                btn.className = 'audio-btn tts-btn';
                btn.id = 'tts-' + iId;
                btn.style.left = leftVal;
                btn.style.top = topVal;
                if (inter.size) {
                    btn.style.width = inter.size + 'px';
                    btn.style.height = inter.size + 'px';
                    btn.style.fontSize = Math.max(12, inter.size * 0.45) + 'px';
                }
                btn.setAttribute('aria-label', "Écouter le texte");
                btn.title = 'Écouter le texte';
                btn.innerHTML = `${AUDIO_ICON_SVG}`;
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    playTTS(iId, inter.text, inter.lang);
                });
                overlay.appendChild(btn);
            } else if (inter.type === 'video') {
                const btn = document.createElement('button');
                btn.className = 'video-btn';
                btn.id = 'vbtn-' + iId;
                btn.style.left = leftVal;
                btn.style.top = topVal;
                if (inter.size) {
                    btn.style.width = inter.size + 'px';
                    btn.style.height = inter.size + 'px';
                    btn.style.fontSize = Math.max(12, inter.size * 0.45) + 'px';
                }
                btn.setAttribute('aria-label', inter.title || "Regarder la vidéo");
                btn.title = inter.title || 'Vidéo YouTube';
                btn.innerHTML = '▶';
                if (inter.title) {
                    const tip = document.createElement('span');
                    tip.className = 'tooltip';
                    tip.textContent = inter.title;
                    btn.appendChild(tip);
                }
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openVideoModal(inter.youtubeUrl, inter.title);
                });
                overlay.appendChild(btn);
            } else if (inter.type === 'zoom' || inter.type === 'modal') {
                const widthVal = String(inter.width || '40%').includes('%') ? inter.width : (inter.width + '%');
                const heightVal = String(inter.height || '30%').includes('%') ? inter.height : (inter.height + '%');
                const zone = document.createElement('div');
                zone.className = 'zoom-zone';
                zone.style.left = leftVal;
                zone.style.top = topVal;
                zone.style.width = widthVal;
                zone.style.height = heightVal;
                zone.setAttribute('role', 'button');
                zone.setAttribute('aria-label', inter.title || "Agrandir l'image");
                zone.tabIndex = 0;
                zone.title = `🔍 ${escapeHtml(inter.title || 'Zoom HD')} (cliquer pour agrandir)`;
                zone.innerHTML = `<span class="zoom-badge">${ZOOM_LOUPE_SVG}</span>`;
                const openZ = (e) => {
                    e.stopPropagation();
                    const zX = parseFloat(String(inter.left ?? inter.x ?? 0).replace('%', '')) || 0;
                    const zY = parseFloat(String(inter.top ?? inter.y ?? 0).replace('%', '')) || 0;
                    const zW = parseFloat(String(inter.width || 40).replace('%', '')) || 40;
                    const zH = parseFloat(String(inter.height || 30).replace('%', '')) || 30;
                    openModal(
                        asset(inter.hiresSrc || inter.imageSrc || page.imagePath),
                        inter.title || 'Zoom HD',
                        pNum,
                        { x: zX, y: zY, width: zW, height: zH },
                        inter
                    );
                };
                zone.addEventListener('click', openZ);
                zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openZ(e); });
                overlay.appendChild(zone);
            } else if (inter.type === 'fill-blank') {
                const wVal = String(inter.width || '15%').includes('%') ? inter.width : (inter.width + '%');
                const hVal = String(inter.height || '5%').includes('%') ? inter.height : (inter.height + '%');
                const wrap = document.createElement('div');
                wrap.className = 'widget-fill-blank';
                wrap.style.left = leftVal; wrap.style.top = topVal;
                wrap.style.width = wVal; wrap.style.height = hVal;

                const inp = document.createElement('input');
                inp.type = 'text';
                inp.className = 'fb-input';
                inp.placeholder = '...';
                inp.id = 'fb-' + iId;
                inp.dataset.answer = (inter.answer || '').trim();
                inp.dataset.alternatives = inter.acceptAlternatives || '';
                inp.dataset.caseSensitive = inter.caseSensitive ? '1' : '0';
                inp.dataset.groupId = inter.groupId || '';
                inp.setAttribute('autocomplete', 'off');
                inp.addEventListener('click', e => e.stopPropagation());
                inp.addEventListener('keydown', e => {
                    e.stopPropagation();
                    if (e.key === 'Enter') FBEngine.checkOne(inp);
                });
                wrap.appendChild(inp);

                if (inter.hint) {
                    const hBtn = document.createElement('button');
                    hBtn.className = 'fb-hint-btn';
                    hBtn.textContent = '?';
                    hBtn.title = 'Indice';
                    hBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        let tip = wrap.querySelector('.fb-hint-tooltip');
                        if (tip) { tip.remove(); return; }
                        tip = document.createElement('div');
                        tip.className = 'fb-hint-tooltip';
                        tip.textContent = inter.hint;
                        wrap.appendChild(tip);
                        setTimeout(() => tip && tip.remove(), 3500);
                    });
                    wrap.appendChild(hBtn);
                }
                overlay.appendChild(wrap);
            } else if (inter.type === 'reveal') {
                const wVal = String(inter.width || '25%').includes('%') ? inter.width : (inter.width + '%');
                const hVal = String(inter.height || '5%').includes('%') ? inter.height : (inter.height + '%');

                if (inter.revealText) {
                    const textDiv = document.createElement('div');
                    textDiv.className = 'widget-reveal-text';
                    textDiv.id = 'rev-text-' + iId;
                    textDiv.style.left = leftVal; textDiv.style.top = topVal;
                    textDiv.style.width = wVal; textDiv.style.height = hVal;
                    textDiv.textContent = inter.revealText;
                    overlay.appendChild(textDiv);
                }

                const mask = document.createElement('div');
                mask.className = 'widget-reveal';
                mask.id = 'rev-' + iId;
                mask.style.left = leftVal; mask.style.top = topVal;
                mask.style.width = wVal; mask.style.height = hVal;
                mask.style.background = inter.coverColor || '#f59e0b';
                mask.textContent = inter.coverLabel || '💡 Cliquer pour révéler';
                mask.addEventListener('click', (e) => {
                    e.stopPropagation();
                    mask.classList.add('revealed');
                    const rt = document.getElementById('rev-text-' + iId);
                    if (rt) rt.classList.add('visible');
                    if (inter.revealAudio) {
                        try { new Audio(asset(inter.revealAudio)).play().catch(() => { }); } catch (e) { }
                    }
                });
                overlay.appendChild(mask);
            } else if (inter.type === 'checkbox-task' || inter.type === 'check') {
                const cb = document.createElement('div');
                cb.className = 'widget-checkbox';
                cb.id = 'chk-' + iId;
                cb.dataset.page = String(pNum);
                cb.style.left = leftVal; cb.style.top = topVal;
                if (inter.width && inter.height) {
                    cb.style.width = String(inter.width).includes('%') ? inter.width : (inter.width + '%');
                    cb.style.height = String(inter.height).includes('%') ? inter.height : (inter.height + '%');
                    cb.classList.add('has-custom-size');
                } else if (inter.size) {
                    cb.style.width = inter.size + 'px';
                    cb.style.height = inter.size + 'px';
                    cb.style.fontSize = Math.max(14, inter.size * 0.5) + 'px';
                }
                const isExpected = (inter.isCorrect === true || inter.isCorrect === '1' || inter.correct === true || inter.correct === '1');
                cb.dataset.correct = isExpected ? '1' : '0';
                cb.dataset.groupId = inter.groupId || '';
                cb.dataset.checked = '0';
                if (inter.hideLabel || (inter.width && inter.height)) {
                    cb.style.padding = '0';
                    cb.style.gap = '0';
                    cb.innerHTML = `<div class="chk-box" id="chkbox-${iId}"></div>`;
                } else {
                    cb.innerHTML = `<div class="chk-box" id="chkbox-${iId}"></div><span class="chk-label">${escapeHtml(inter.label || '')}</span>`;
                }
                cb.addEventListener('click', (e) => {
                    e.stopPropagation();
                    cb.classList.remove('validated-correct', 'validated-wrong', 'validated-missing');
                    cb.querySelectorAll('.chk-feedback-badge').forEach(b => b.remove());
                    const isChecked = cb.dataset.checked === '1';
                    cb.dataset.checked = isChecked ? '0' : '1';
                    const box = cb.querySelector('.chk-box');
                    if (box) {
                        box.textContent = isChecked ? '' : '✓';
                        box.classList.toggle('checked', !isChecked);
                        box.classList.remove('box-correct', 'box-wrong', 'box-missing');
                    }
                });
                overlay.appendChild(cb);
            } else if (inter.type === 'highlight') {
                const wVal = String(inter.width || '20%').includes('%') ? inter.width : (inter.width + '%');
                const hVal = String(inter.height || '4%').includes('%') ? inter.height : (inter.height + '%');
                const hDiv = document.createElement('div');
                hDiv.className = 'widget-highlight-zone';
                hDiv.id = 'hl-' + iId;
                hDiv.style.left = leftVal; hDiv.style.top = topVal;
                hDiv.style.width = wVal; hDiv.style.height = hVal;
                hDiv.style.position = 'absolute';
                hDiv.style.backgroundColor = inter.color || '#facc15';
                hDiv.style.borderRadius = '3px';
                hDiv.style.mixBlendMode = 'multiply';
                hDiv.style.opacity = '0.38';
                hDiv.style.pointerEvents = 'auto';
                if (inter.note) {
                    hDiv.title = inter.note;
                }
                overlay.appendChild(hDiv);
            } else if (inter.type === 'lasso') {
                const lDiv = document.createElement('div');
                lDiv.className = 'widget-lasso-zone';
                lDiv.id = 'lasso-' + iId;
                lDiv.style.left = leftVal; lDiv.style.top = topVal;
                const wVal = inter.width ? (String(inter.width).includes('%') ? inter.width : (inter.width + '%')) : '20%';
                const hVal = inter.height ? (String(inter.height).includes('%') ? inter.height : (inter.height + '%')) : '10%';
                lDiv.style.width = wVal; lDiv.style.height = hVal;
                lDiv.style.position = 'absolute';
                lDiv.style.border = `2px dashed ${inter.color || '#a78bfa'}`;
                lDiv.style.backgroundColor = 'rgba(167, 139, 250, 0.15)';
                lDiv.style.borderRadius = '8px';
                lDiv.style.pointerEvents = 'auto';
                if (inter.text) {
                    lDiv.title = inter.text;
                    lDiv.style.cursor = 'pointer';
                    lDiv.addEventListener('click', (e) => {
                        e.stopPropagation();
                        playTTS(iId, inter.text, inter.lang || 'fr-FR', true);
                    });
                }
                overlay.appendChild(lDiv);
            } else if (inter.type === 'score-button' || inter.type === 'button') {
                const btn = document.createElement('button');
                btn.className = 'widget-score-btn';
                btn.id = 'btn-score-' + iId;
                btn.dataset.page = String(pNum);
                btn.style.left = leftVal; btn.style.top = topVal;
                const wVal = inter.width ? (String(inter.width).includes('%') ? inter.width : (inter.width + '%')) : 'auto';
                const hVal = inter.height ? (String(inter.height).includes('%') ? inter.height : (inter.height + '%')) : 'auto';
                btn.style.width = wVal; btn.style.height = hVal;
                btn.style.position = 'absolute';
                btn.style.padding = '6px 14px';
                btn.style.borderRadius = '8px';
                btn.style.background = 'linear-gradient(135deg, #f97316, #ea580c)';
                btn.style.color = '#fff';
                btn.style.fontWeight = 'bold';
                btn.style.fontSize = '12px';
                btn.style.border = 'none';
                btn.style.cursor = 'pointer';
                btn.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.3)';
                btn.textContent = inter.label || 'Corriger';
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    FBEngine.validateGroup(inter.groupId || '', pNum);
                });
                overlay.appendChild(btn);
            } else if (inter.type === 'color-correct' || inter.type === 'colorCorrect') {
                pageExpectedDrawings[pNum] = pageExpectedDrawings[pNum] || [];
                const drawId = inter.drawingId || iId;
                if (!pageExpectedDrawings[pNum].some(d => d.id === iId)) {
                    pageExpectedDrawings[pNum].push({
                        id: iId,
                        drawingId: drawId,
                        isCorrect: inter.isCorrect !== false && inter.isCorrect !== '0',
                        label: inter.label || 'Dessin',
                    });
                }
                const dZone = document.createElement('div');
                dZone.className = 'widget-drawing-zone';
                dZone.id = 'draw-' + iId;
                dZone.dataset.drawingId = drawId;
                dZone.dataset.page = String(pNum);
                dZone.dataset.isCorrect = (inter.isCorrect !== false && inter.isCorrect !== '0') ? '1' : '0';
                dZone.style.position = 'absolute';
                dZone.style.left = leftVal;
                dZone.style.top = topVal;
                dZone.style.width = inter.width ? (String(inter.width).includes('%') ? inter.width : (inter.width + '%')) : '20%';
                dZone.style.height = inter.height ? (String(inter.height).includes('%') ? inter.height : (inter.height + '%')) : '15%';

                const hasMask = !!(inter.silhouetteMaskDataUrl && inter.silhouetteMaskDataUrl.length > 50);
                dZone.dataset.hasMask = hasMask ? '1' : '0';
                if (hasMask) {
                    dZone.dataset.maskDataUrl = inter.silhouetteMaskDataUrl;
                }

                // Dedicated fill canvas replicating Studio Pro source-in compositing
                const fillCanvas = document.createElement('canvas');
                fillCanvas.className = 'drawing-fill-canvas';
                fillCanvas.style.position = 'absolute';
                fillCanvas.style.inset = '0';
                fillCanvas.style.width = '100%';
                fillCanvas.style.height = '100%';
                fillCanvas.style.pointerEvents = 'none';
                fillCanvas.style.mixBlendMode = 'multiply';
                fillCanvas.style.transition = 'opacity 0.2s ease';
                dZone.appendChild(fillCanvas);

                dZone.addEventListener('click', (e) => {
                    if (activeViewerTool === 'bucket') {
                        e.stopPropagation();
                        handleDrawingClick(dZone, pNum, e);
                    }
                });
                overlay.appendChild(dZone);
            } else if (inter.type === 'free-coloring' || inter.type === 'freeColoring') {
                const fcZone = document.createElement('div');
                fcZone.className = 'widget-free-coloring-zone';
                fcZone.id = 'fc-' + iId;
                fcZone.dataset.page = String(pNum);
                fcZone.style.position = 'absolute';
                fcZone.style.left = leftVal;
                fcZone.style.top = topVal;
                fcZone.style.width = inter.width ? (String(inter.width).includes('%') ? inter.width : (inter.width + '%')) : '100%';
                fcZone.style.height = inter.height ? (String(inter.height).includes('%') ? inter.height : (inter.height + '%')) : '100%';

                if (inter.regions && inter.regions.length > 0) {
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('viewBox', '0 0 100 100');
                    svg.setAttribute('preserveAspectRatio', 'none');
                    svg.style.position = 'absolute';
                    svg.style.inset = '0';
                    svg.style.width = '100%';
                    svg.style.height = '100%';
                    svg.style.mixBlendMode = 'multiply';
                    svg.style.pointerEvents = 'auto';

                    inter.regions.forEach((reg) => {
                        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        path.setAttribute('d', reg.pathD);
                        path.setAttribute('data-region-id', reg.id);
                        path.style.fill = 'transparent';
                        path.style.cursor = 'crosshair';
                        path.style.pointerEvents = 'auto';
                        path.style.transition = 'fill 0.15s ease';

                        path.addEventListener('click', (e) => {
                            if (activeViewerTool === 'bucket') {
                                e.stopPropagation();
                                pageWidgetFillsHistory[pNum] = pageWidgetFillsHistory[pNum] || [];
                                pageWidgetFillsHistory[pNum].push({
                                    type: 'freeColoringPath',
                                    el: path,
                                    prevFill: path.style.fill || 'transparent',
                                });
                                path.style.fill = currentBucketColor;
                            }
                        });
                        svg.appendChild(path);
                    });
                    fcZone.appendChild(svg);
                } else if (inter.silhouetteMaskDataUrl) {
                    const fillLayer = document.createElement('div');
                    fillLayer.className = 'free-coloring-fill-layer';
                    fillLayer.style.position = 'absolute';
                    fillLayer.style.inset = '0';
                    fillLayer.style.pointerEvents = 'none';
                    fillLayer.style.mixBlendMode = 'multiply';
                    fillLayer.style.webkitMaskImage = `url("${inter.silhouetteMaskDataUrl}")`;
                    fillLayer.style.maskImage = `url("${inter.silhouetteMaskDataUrl}")`;
                    fillLayer.style.webkitMaskSize = '100% 100%';
                    fillLayer.style.maskSize = '100% 100%';
                    fillLayer.style.webkitMaskRepeat = 'no-repeat';
                    fillLayer.style.maskRepeat = 'no-repeat';
                    fcZone.appendChild(fillLayer);

                    fcZone.addEventListener('click', (e) => {
                        if (activeViewerTool === 'bucket') {
                            e.stopPropagation();
                            pageWidgetFillsHistory[pNum] = pageWidgetFillsHistory[pNum] || [];
                            pageWidgetFillsHistory[pNum].push({
                                type: 'freeColoringZone',
                                el: fillLayer,
                                prevColor: fillLayer.style.backgroundColor || '',
                            });
                            fillLayer.style.backgroundColor = currentBucketColor;
                        }
                    });
                } else if (inter.outerPolygonPoints && inter.outerPolygonPoints.length >= 3) {
                    const polyStr = inter.outerPolygonPoints.map(pt => Array.isArray(pt) ? `${pt[0]}% ${pt[1]}%` : `${pt.x}% ${pt.y}%`).join(', ');
                    fcZone.style.clipPath = `polygon(${polyStr})`;
                    fcZone.style.webkitClipPath = `polygon(${polyStr})`;
                    fcZone.addEventListener('click', (e) => {
                        if (activeViewerTool === 'bucket') {
                            e.stopPropagation();
                            pageWidgetFillsHistory[pNum] = pageWidgetFillsHistory[pNum] || [];
                            pageWidgetFillsHistory[pNum].push({
                                type: 'freeColoringZone',
                                el: fcZone,
                                prevColor: fcZone.style.backgroundColor || '',
                            });
                            fcZone.style.backgroundColor = currentBucketColor;
                            fcZone.style.mixBlendMode = 'multiply';
                        }
                    });
                }
                overlay.appendChild(fcZone);
            } else if (inter.type === 'paint-region' || inter.type === 'paint') {
                const pReg = document.createElement('div');
                pReg.className = 'widget-paint-region';
                pReg.id = 'paint-' + iId;
                pReg.dataset.regionId = inter.regionId || iId;
                pReg.dataset.page = String(pNum);
                pReg.dataset.defaultColor = inter.defaultColor || '';
                pReg.style.position = 'absolute';
                pReg.style.left = leftVal;
                pReg.style.top = topVal;
                const wVal = inter.width ? (String(inter.width).includes('%') ? inter.width : (inter.width + '%')) : '20%';
                const hVal = inter.height ? (String(inter.height).includes('%') ? inter.height : (inter.height + '%')) : '15%';
                pReg.style.width = wVal;
                pReg.style.height = hVal;
                if (inter.polygonPoints && inter.polygonPoints.length >= 3) {
                    const polyStr = inter.polygonPoints.map(pt => `${pt.x}% ${pt.y}%`).join(', ');
                    pReg.style.clipPath = `polygon(${polyStr})`;
                    pReg.style.webkitClipPath = `polygon(${polyStr})`;
                } else {
                    pReg.style.borderRadius = '4px';
                }
                const savedFill = studentPageColors[pNum]?.[inter.regionId || iId] || inter.defaultColor || '';
                if (savedFill) {
                    pReg.style.backgroundColor = savedFill;
                    pReg.classList.add('is-painted');
                }
                pReg.addEventListener('click', (e) => {
                    if (activeViewerTool === 'bucket') {
                        e.stopPropagation();
                        studentPageColors[pNum] = studentPageColors[pNum] || {};
                        studentPageColors[pNum][inter.regionId || iId] = currentBucketColor;
                        pReg.style.backgroundColor = currentBucketColor;
                        pReg.classList.add('is-painted');
                    }
                });
                overlay.appendChild(pReg);
            } else if (inter.type === 'choice-zone' || inter.type === 'choice') {
                const cZone = document.createElement('div');
                cZone.className = 'widget-choice-zone';
                cZone.id = 'choice-' + iId;
                cZone.dataset.choiceId = iId;
                cZone.dataset.questionId = inter.questionId || ('q-' + pNum);
                cZone.dataset.selectionMode = inter.selectionMode || 'single';
                cZone.dataset.isCorrect = (inter.isCorrect === true || inter.isCorrect === '1') ? '1' : '0';
                cZone.dataset.page = String(pNum);
                cZone.style.position = 'absolute';
                cZone.style.left = leftVal;
                cZone.style.top = topVal;
                const wVal = inter.width ? (String(inter.width).includes('%') ? inter.width : (inter.width + '%')) : '15%';
                const hVal = inter.height ? (String(inter.height).includes('%') ? inter.height : (inter.height + '%')) : '6%';
                cZone.style.width = wVal;
                cZone.style.height = hVal;
                if (inter.label) {
                    cZone.title = inter.label;
                }
                cZone.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleChoiceZoneClick(cZone, inter, pNum);
                });
                overlay.appendChild(cZone);
            } else if (inter.type === 'circle-zone' || inter.type === 'circleExercise') {
                const cZone = document.createElement('div');
                cZone.className = 'widget-circle-zone';
                cZone.id = 'circle-' + iId;
                cZone.dataset.circleId = iId;
                cZone.dataset.questionId = inter.questionId || ('cq-' + pNum);
                cZone.dataset.isCorrect = (inter.isCorrect === true || inter.isCorrect === '1') ? '1' : '0';
                cZone.dataset.page = String(pNum);
                cZone.style.position = 'absolute';
                cZone.style.left = leftVal;
                cZone.style.top = topVal;
                const wVal = inter.width ? (String(inter.width).includes('%') ? inter.width : (inter.width + '%')) : '15%';
                const hVal = inter.height ? (String(inter.height).includes('%') ? inter.height : (inter.height + '%')) : '6%';
                cZone.style.width = wVal;
                cZone.style.height = hVal;
                if (inter.label) {
                    cZone.title = inter.label;
                }
                cZone.addEventListener('click', (e) => {
                    if (activeViewerTool !== 'circle') {
                        return;
                    }
                    e.stopPropagation();
                    handleCircleZoneClick(cZone, inter, pNum);
                });
                overlay.appendChild(cZone);
            } else if (inter.type === 'drag-item') {
                const dragId = inter.dragId || iId;
                const wVal = inter.width ? (String(inter.width).includes('%') ? inter.width : (inter.width + '%')) : '15%';
                const hVal = inter.height ? (String(inter.height).includes('%') ? inter.height : (inter.height + '%')) : '10%';

                // 1. Background Mask / Patch: permanently covers the original printed element on static PDF page
                const bgPatch = document.createElement('div');
                bgPatch.className = 'drag-background-patch';
                bgPatch.id = 'bg-patch-' + iId;
                bgPatch.dataset.dragId = dragId;
                bgPatch.dataset.page = String(pNum);
                bgPatch.style.position = 'absolute';
                bgPatch.style.left = leftVal;
                bgPatch.style.top = topVal;
                bgPatch.style.width = wVal;
                bgPatch.style.height = hVal;
                bgPatch.style.backgroundColor = inter.maskColor || '#ffffff';
                bgPatch.style.zIndex = '5';
                bgPatch.style.pointerEvents = 'none';
                if (inter.maskPadding) {
                    bgPatch.style.transform = `scale(${(1 + (inter.maskPadding * 0.04)).toFixed(2)})`;
                }
                overlay.appendChild(bgPatch);

                // 2. Movable Draggable Element
                const dragItem = document.createElement('div');
                dragItem.className = 'widget-drag-item';
                dragItem.id = 'drag-' + iId;
                dragItem.dataset.dragId = dragId;
                dragItem.dataset.page = String(pNum);
                dragItem.dataset.initLeft = leftVal;
                dragItem.dataset.initTop = topVal;
                dragItem.style.position = 'absolute';
                dragItem.style.left = leftVal;
                dragItem.style.top = topVal;
                dragItem.style.width = wVal;
                dragItem.style.height = hVal;
                dragItem.style.zIndex = '15';
                dragItem.style.cursor = 'grab';
                dragItem.style.touchAction = 'none';

                if (inter.dragImageDataUrl) {
                    const img = document.createElement('img');
                    img.src = inter.dragImageDataUrl;
                    img.alt = dragId;
                    img.className = 'drag-item-img';
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'contain';
                    img.style.pointerEvents = 'none';
                    img.style.userSelect = 'none';
                    img.draggable = false;
                    dragItem.appendChild(img);
                }

                // Check persistent placement state
                const savedPlacement = studentDragPlacements[pNum]?.[dragId];
                if (savedPlacement && savedPlacement.isPlaced) {
                    dragItem.style.left = savedPlacement.left;
                    dragItem.style.top = savedPlacement.top;
                    dragItem.classList.add('drag-placed-correct');
                }

                initDragItemInteraction(dragItem, inter, pNum, overlay);
                overlay.appendChild(dragItem);
            } else if (inter.type === 'drop-target') {
                const dropId = inter.dropId || iId;
                const wVal = inter.width ? (String(inter.width).includes('%') ? inter.width : (inter.width + '%')) : '15%';
                const hVal = inter.height ? (String(inter.height).includes('%') ? inter.height : (inter.height + '%')) : '10%';

                const dropZone = document.createElement('div');
                dropZone.className = 'widget-drop-zone';
                dropZone.id = 'drop-' + iId;
                dropZone.dataset.dropId = dropId;
                dropZone.dataset.acceptedDragId = inter.targetDragId || '';
                dropZone.dataset.page = String(pNum);
                dropZone.style.position = 'absolute';
                dropZone.style.left = leftVal;
                dropZone.style.top = topVal;
                dropZone.style.width = wVal;
                dropZone.style.height = hVal;
                dropZone.style.zIndex = '6';

                if (inter.label) {
                    dropZone.title = inter.label;
                }
                overlay.appendChild(dropZone);
            } else if (inter.type === 'arrow-exercise' || inter.type === 'arrow') {
                pageExpectedArrows[pNum] = pageExpectedArrows[pNum] || [];
                if (!pageExpectedArrows[pNum].some(a => a.id === iId)) {
                    // Convert fractional coords (0-1) to percentage (0-100) to match student arrow coords
                    const toP = (v, fb) => v !== undefined ? (v <= 1 ? v * 100 : v) : fb;
                    const rawTol = inter.tolerance ?? 0.08;
                    pageExpectedArrows[pNum].push({
                        id: iId,
                        exerciseId: inter.exerciseId || ('ex-' + pNum),
                        startX: toP(inter.startX, 20),
                        startY: toP(inter.startY, 20),
                        endX: toP(inter.endX, 50),
                        endY: toP(inter.endY, 50),
                        tolerance: rawTol <= 1 ? rawTol * 100 : rawTol,
                        bidirectional: !!inter.bidirectional,
                        label: inter.label || ''
                    });
                }
            }
        });

        overlay.addEventListener('click', (e) => {
            if (activeViewerTool === 'bucket') {
                handleColoringClickAt(pNum, e);
                return;
            }
            if (activeViewerTool === 'arrow' || activeViewerTool === 'pen' || activeViewerTool === 'eraser' || activeViewerTool === 'loupe' || activeViewerTool === 'circle') {
                return;
            }
            if (e.target === overlay) {
                openModal(asset(page.imagePath), page.title || `Page ${page.pageNumber}`, pNum, { x: 0, y: 0, width: 100, height: 100 }, null);
            }
        });

        const num = document.createElement('div');
        num.className = 'page-num ' + (isLeft ? 'left' : 'right');
        num.textContent = page.pageNumber;
        div.appendChild(num);

        const annotCanvas = document.createElement('canvas');
        annotCanvas.className = 'page-annot-canvas';
        annotCanvas.setAttribute('data-page', page.pageNumber);
        div.appendChild(annotCanvas);

        const colorCanvas = document.createElement('canvas');
        colorCanvas.className = 'page-coloring-canvas';
        colorCanvas.setAttribute('data-page', String(pNum));
        div.appendChild(colorCanvas);

        const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        arrowSvg.setAttribute('class', 'page-arrow-svg');
        arrowSvg.setAttribute('data-page', String(pNum));
        arrowSvg.innerHTML = `
          <defs>
            <marker id="arrowhead-draft-${pNum}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <polygon points="0 0.5, 5 2.5, 0 4.5" fill="#3b82f6"/>
            </marker>
            <marker id="arrowhead-student-${pNum}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <polygon points="0 0.5, 5 2.5, 0 4.5" fill="#6366f1"/>
            </marker>
            <marker id="arrowhead-correct-${pNum}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <polygon points="0 0.5, 5 2.5, 0 4.5" fill="#22c55e"/>
            </marker>
            <marker id="arrowhead-incorrect-${pNum}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <polygon points="0 0.5, 5 2.5, 0 4.5" fill="#ef4444"/>
            </marker>
            <marker id="arrowhead-expected-${pNum}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <polygon points="0 0.5, 5 2.5, 0 4.5" fill="#0ea5e9"/>
            </marker>
            <marker id="arrowhead-missing-${pNum}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <polygon points="0 0.5, 5 2.5, 0 4.5" fill="#eab308"/>
            </marker>
          </defs>
          <g class="arrow-renders-layer"></g>
          <g class="arrow-draft-layer"></g>
        `;
        div.appendChild(arrowSvg);
        initArrowLayer(arrowSvg, pNum);

        div.appendChild(overlay);
        return div;
    }

    function initSlidesView() {
        const stage = document.getElementById('stage') || viewerWrap;
        const r = stage ? stage.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight - 76 };
        const narrow = r.width < 700;
        const side = narrow ? 16 : 56;
        const availW = Math.max(280, r.width - side * 2);
        const availH = Math.max(360, r.height - (narrow ? 12 : 20));
        const RATIO = 0.707;
        const slideW = Math.max(280, Math.min(availW, Math.floor(availH * RATIO)));
        const slideH = Math.floor(slideW / RATIO);

        if (pageFlip) {
            try { pageFlip.destroy(); } catch (e) { }
            pageFlip = null;
        }

        viewerWrap.innerHTML = '<div id="flipbook-container" class="slides-container"></div>';
        container = document.getElementById('flipbook-container');
        container.style.width = slideW + 'px';
        container.style.height = slideH + 'px';
        container.style.position = 'relative';
        container.style.margin = '0 auto';

        const targetPage = BOOK.pages[currentPage - 1] || BOOK.pages[0];
        if (targetPage) {
            const div = createPageElement(targetPage, currentPage - 1);
            div.style.width = '100%';
            div.style.height = '100%';
            div.style.position = 'relative';
            div.style.display = 'block';
            div.style.visibility = 'visible';
            container.appendChild(div);
            setupAllAnnotCanvases();
        }

        updateUI();
    }

    function syncModeButtons() {
        const btnF = document.getElementById('btnModeFlipbook');
        const btnS = document.getElementById('btnModeSlides');
        if (btnF) btnF.classList.toggle('active', currentMode === 'flipbook');
        if (btnS) btnS.classList.toggle('active', currentMode === 'slides');
    }

    window.setViewerMode = function (mode) {
        if (mode === currentMode) return;
        currentMode = mode;
        stopAllAudio();
        syncModeButtons();
        if (currentMode === 'slides') {
            initSlidesView();
            toast('Mode Diapositives activé (1 page par écran)');
        } else {
            initFlipbook();
            toast('Mode Flipbook activé (Livre 3D interactif)');
        }
        updateUI();
    };

    window.toggleViewMode = () => {
        window.setViewerMode(currentMode === 'flipbook' ? 'slides' : 'flipbook');
    };

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const savedPage = currentPage;
            if (currentMode === 'slides') {
                initSlidesView();
            } else {
                initFlipbook();
                if (pageFlip && savedPage > 1) {
                    if (savedPage >= TOTAL) {
                        pageFlip.flip(TOTAL - 1);
                    } else {
                        const targetIdx = (savedPage % 2 === 0) ? (savedPage - 1) : (savedPage - 2);
                        pageFlip.flip(Math.max(0, targetIdx));
                    }
                }
            }
        }, 250);
    });

    // Navigation API
    window.goPrev = () => {
        if (currentMode === 'slides') {
            if (currentPage > 1) window.goToPage(currentPage - 1);
        } else {
            pageFlip && pageFlip.flipPrev();
        }
    };
    window.goNext = () => {
        if (currentMode === 'slides') {
            if (currentPage < TOTAL) window.goToPage(currentPage + 1);
        } else {
            pageFlip && pageFlip.flipNext();
        }
    };
    window.goFirst = () => {
        if (currentMode === 'slides') {
            window.goToPage(1);
        } else {
            pageFlip && pageFlip.flip(0);
        }
    };
    window.goLast = () => {
        if (currentMode === 'slides') {
            window.goToPage(TOTAL);
        } else {
            pageFlip && pageFlip.flip(TOTAL - 1);
        }
    };
    window.goToPage = (pageNum) => {
        pageNum = Math.max(1, Math.min(TOTAL, parseInt(pageNum, 10) || 1));
        if (currentMode === 'slides') {
            if (pageNum !== currentPage) {
                stopAllAudio();
                currentPage = pageNum;
                playFlipSound();
                initSlidesView();
                const pData = BOOK.pages[currentPage - 1];
                if (pData && pData.ambientAudio) {
                    playAudio('ambient-' + currentPage, asset(pData.ambientAudio));
                }
            }
            return;
        }
        if (!pageFlip) return;
        if (pageNum === 1) {
            pageFlip.flip(0);
        } else if (pageNum === TOTAL) {
            pageFlip.flip(TOTAL - 1);
        } else {
            const targetIdx = (pageNum % 2 === 0) ? (pageNum - 1) : (pageNum - 2);
            pageFlip.flip(Math.max(0, Math.min(TOTAL - 1, targetIdx)));
        }
    };
    window.promptPage = () => {
        const val = prompt(`Go to page (1 - ${TOTAL}) / Aller à la page (1 - ${TOTAL}) :`, currentPage);
        if (val === null) return;
        const n = parseInt(val, 10);
        if (!isNaN(n) && n >= 1 && n <= TOTAL) window.goToPage(n);
    };

    // ── ANNOTATION, PAINT BUCKET & ARROW EXERCISE ENGINES ──
    let activeViewerTool = null; // 'pen', 'eraser', 'loupe', 'bucket', 'arrow', null
    let currentAnnotColor = '#17143F';
    let currentAnnotSize = 5;
    const pageDrawingsCache = {}; // pageNum -> dataURL
    let isAnnotDrawing = false;
    let activeDrawingCanvas = null;
    let activeDrawingCtx = null;
    let annotStartX = 0;
    let annotStartY = 0;
    let annotLastTime = 0;
    let annotLastX = 0;
    let annotLastY = 0;
    let annotLastW = 5;
    const CALLIGRAPHY_NIB_ANGLE = -Math.PI / 4.2; // ~-43° chiseled nib angle

    // ── FEATURE 1 & 2: COLORING & DRAWING ENGINE ──
    let currentBucketColor = 'rgba(239, 68, 68, 0.65)';
    const studentPageColors = {}; // pNum -> { regionId: color }
    const studentDragPlacements = {}; // pNum -> { dragId: { isPlaced, left, top } }
    const pageColoringHistory = {}; // pNum -> Array of ImageData
    const pageExpectedDrawings = {}; // pNum -> Array of { id, drawingId, isCorrect, label }
    const pageSelectedDrawings = {}; // pNum -> Set of drawingIds colored by student
    const pageWidgetFillsHistory = {}; // pNum -> Array of { type, el, prevColor/prevFill }

    const BUCKET_COLORS = [
        ['rgba(239, 68, 68, 0.65)', '#ef4444', 'Rouge'],
        ['rgba(249, 115, 22, 0.65)', '#f97316', 'Orange'],
        ['rgba(234, 179, 8, 0.65)', '#eab308', 'Jaune'],
        ['rgba(34, 197, 94, 0.65)', '#22c55e', 'Vert'],
        ['rgba(14, 165, 233, 0.65)', '#0ea5e9', 'Bleu ciel'],
        ['rgba(59, 130, 246, 0.65)', '#3b82f6', 'Bleu'],
        ['rgba(168, 85, 247, 0.65)', '#a855f7', 'Violet'],
        ['rgba(236, 72, 153, 0.65)', '#ec4899', 'Rose'],
        ['rgba(120, 53, 15, 0.65)', '#78350f', 'Marron'],
        ['rgba(15, 23, 42, 0.65)', '#0f172a', 'Noir']
    ];

    function parseCssColor(col) {
        if (!col) return [239, 68, 68, 180];
        if (col.startsWith('rgba') || col.startsWith('rgb')) {
            const parts = col.match(/\d+(\.\d+)?/g);
            if (parts && parts.length >= 3) {
                return [
                    parseInt(parts[0], 10),
                    parseInt(parts[1], 10),
                    parseInt(parts[2], 10),
                    parts[3] !== undefined ? Math.round(parseFloat(parts[3]) * 255) : 180
                ];
            }
        }
        if (col.startsWith('#')) {
            let hex = col.slice(1);
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            const num = parseInt(hex, 16);
            return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 180];
        }
        return [239, 68, 68, 180];
    }

    function initColoringCanvas(canvas, pNum) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.max(300, Math.floor((rect.width || 500) * dpr));
        canvas.height = Math.max(400, Math.floor((rect.height || 700) * dpr));
    }

    function handleDrawingClick(dZone, pNum, e) {
        const drawId = dZone.dataset.drawingId;
        const hasMask = dZone.dataset.hasMask === '1';
        const maskDataUrl = dZone.dataset.maskDataUrl;

        // Strictly respect constraint: Never color the rectangle if mask is missing
        if (!hasMask || !maskDataUrl) {
            console.warn(`[Dessin ${drawId}] Masque de contour manquant. Le remplissage rectangulaire est bloqué.`);
            toast('Masque de contour manquant pour ce dessin.');
            return;
        }

        pageSelectedDrawings[pNum] = pageSelectedDrawings[pNum] || new Set();
        pageSelectedDrawings[pNum].add(drawId);
        clearDrawingFeedback(pNum);

        const fillCanvas = dZone.querySelector('.drawing-fill-canvas');
        if (!fillCanvas) return;

        let prevImageData = null;
        if (fillCanvas.width > 0 && fillCanvas.height > 0) {
            try {
                prevImageData = fillCanvas.getContext('2d')?.getImageData(0, 0, fillCanvas.width, fillCanvas.height);
            } catch (err) {}
        }

        pageWidgetFillsHistory[pNum] = pageWidgetFillsHistory[pNum] || [];
        pageWidgetFillsHistory[pNum].push({
            type: 'drawing',
            el: dZone,
            fillCanvas: fillCanvas,
            prevImageData: prevImageData,
            prevColored: dZone.classList.contains('is-colored'),
            drawId: drawId,
        });

        // Exact same source-in compositing as Studio Pro
        const maskImg = new Image();
        maskImg.onload = () => {
            fillCanvas.width = maskImg.naturalWidth || 400;
            fillCanvas.height = maskImg.naturalHeight || 400;
            const ctx = fillCanvas.getContext('2d');
            if (!ctx) return;
            ctx.clearRect(0, 0, fillCanvas.width, fillCanvas.height);
            ctx.save();
            ctx.drawImage(maskImg, 0, 0, fillCanvas.width, fillCanvas.height);
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = currentBucketColor;
            ctx.fillRect(0, 0, fillCanvas.width, fillCanvas.height);
            ctx.restore();
        };
        maskImg.src = maskDataUrl;

        dZone.classList.add('is-colored');
    }

    function handleColoringClickAt(pNum, e) {
        const canvas = document.querySelector(`.page-coloring-canvas[data-page="${pNum}"]`);
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        if (canvas.width === 0 || canvas.height === 0) {
            initColoringCanvas(canvas, pNum);
        }
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;
        floodFillOnCanvas(canvas, clickX, clickY, currentBucketColor, pNum);
    }

    function floodFillOnCanvas(canvas, startX, startY, fillColor, pNum) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        if (width === 0 || height === 0) return;

        pageColoringHistory[pNum] = pageColoringHistory[pNum] || [];
        try {
            pageColoringHistory[pNum].push(ctx.getImageData(0, 0, width, height));
            if (pageColoringHistory[pNum].length > 25) pageColoringHistory[pNum].shift();
        } catch (err) {}

        const pageImg = canvas.parentElement.querySelector('.page-img');
        let imgData = null;

        if (pageImg && pageImg.complete && pageImg.naturalWidth > 0) {
            try {
                const sampleCanvas = document.createElement('canvas');
                sampleCanvas.width = width;
                sampleCanvas.height = height;
                const sCtx = sampleCanvas.getContext('2d');
                sCtx.drawImage(pageImg, 0, 0, width, height);
                imgData = sCtx.getImageData(0, 0, width, height);
            } catch (err) {
                imgData = null;
            }
        }

        const sx = Math.round(Math.max(0, Math.min(width - 1, startX)));
        const sy = Math.round(Math.max(0, Math.min(height - 1, startY)));
        const fillRgba = parseCssColor(fillColor);

        if (imgData) {
            const pixels = imgData.data;
            const targetIdx = (sy * width + sx) * 4;
            const startLuma = 0.299 * pixels[targetIdx] + 0.587 * pixels[targetIdx + 1] + 0.114 * pixels[targetIdx + 2];

            if (startLuma < 70) return;

            let canvasImgData;
            try {
                canvasImgData = ctx.getImageData(0, 0, width, height);
            } catch (e) {
                return;
            }
            const outPixels = canvasImgData.data;
            const visited = new Uint8Array(width * height);

            const queueX = new Int32Array(width * height);
            const queueY = new Int32Array(width * height);
            let qHead = 0;
            let qTail = 0;

            queueX[qTail] = sx;
            queueY[qTail] = sy;
            qTail++;
            visited[sy * width + sx] = 1;

            const LINE_LUMA_THRESHOLD = 80;

            while (qHead < qTail) {
                const x = queueX[qHead];
                const y = queueY[qHead];
                qHead++;

                const idx = (y * width + x) * 4;
                outPixels[idx] = fillRgba[0];
                outPixels[idx + 1] = fillRgba[1];
                outPixels[idx + 2] = fillRgba[2];
                outPixels[idx + 3] = fillRgba[3];

                const nbs = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
                for (let i = 0; i < 4; i++) {
                    const nx = nbs[i][0];
                    const ny = nbs[i][1];
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nPos = ny * width + nx;
                        if (!visited[nPos]) {
                            visited[nPos] = 1;
                            const nIdx = nPos * 4;
                            const nLuma = 0.299 * pixels[nIdx] + 0.587 * pixels[nIdx + 1] + 0.114 * pixels[nIdx + 2];
                            if (nLuma >= LINE_LUMA_THRESHOLD) {
                                queueX[qTail] = nx;
                                queueY[qTail] = ny;
                                qTail++;
                            }
                        }
                    }
                }
            }
            ctx.putImageData(canvasImgData, 0, 0);
        } else {
            // Intentionally no-op: do not draw deformed oval blobs when pixels cannot be read.
            // Coloring is now handled accurately via masks on drawing zones.
            return;
        }
    }

    window.undoLastFill = function () {
        const activePages = getActivePageNumbers();
        let undone = false;
        activePages.forEach(pNum => {
            const wHistory = pageWidgetFillsHistory[pNum];
            if (wHistory && wHistory.length > 0) {
                const lastW = wHistory.pop();
                if (lastW.type === 'drawing') {
                    if (lastW.fillCanvas) {
                        const ctx = lastW.fillCanvas.getContext('2d');
                        if (ctx && lastW.fillCanvas.width > 0 && lastW.fillCanvas.height > 0) {
                            ctx.clearRect(0, 0, lastW.fillCanvas.width, lastW.fillCanvas.height);
                            if (lastW.prevImageData) {
                                ctx.putImageData(lastW.prevImageData, 0, 0);
                            }
                        }
                    }
                    if (!lastW.prevColored) {
                        lastW.el.classList.remove('is-colored');
                        if (pageSelectedDrawings[pNum]) {
                            pageSelectedDrawings[pNum].delete(lastW.drawId);
                        }
                    }
                } else if (lastW.type === 'freeColoringPath') {
                    lastW.el.style.fill = lastW.prevFill;
                } else if (lastW.type === 'freeColoringZone') {
                    lastW.el.style.backgroundColor = lastW.prevColor;
                }
                undone = true;
            }
            const history = pageColoringHistory[pNum];
            if (history && history.length > 0) {
                const lastState = history.pop();
                const canvas = document.querySelector(`.page-coloring-canvas[data-page="${pNum}"]`);
                if (canvas && lastState) {
                    const ctx = canvas.getContext('2d');
                    ctx.putImageData(lastState, 0, 0);
                    undone = true;
                }
            }
        });
        toast(undone ? 'Dernier coloriage annulé.' : 'Rien à annuler.');
    };

    function clearDrawingFeedback(pNum) {
        document.querySelectorAll(`.widget-drawing-zone[data-page="${pNum}"]`).forEach(d => {
            d.classList.remove('drawing-correct', 'drawing-incorrect', 'drawing-missing');
        });
    }

    function buildBucketColors() {
        const bucketEl = document.getElementById('bucketColors');
        if (!bucketEl) return;
        bucketEl.innerHTML = '';
        BUCKET_COLORS.forEach(([rgba, solidHex, name]) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'sw';
            b.style.background = solidHex;
            b.title = name;
            b.setAttribute('aria-label', name);
            b.setAttribute('aria-pressed', rgba === currentBucketColor ? 'true' : 'false');
            if (rgba === currentBucketColor) b.classList.add('sw-active');
            b.addEventListener('click', () => {
                currentBucketColor = rgba;
                [...bucketEl.children].forEach(x => {
                    const isCur = (x === b);
                    x.setAttribute('aria-pressed', isCur ? 'true' : 'false');
                    x.classList.toggle('sw-active', isCur);
                });
            });
            bucketEl.appendChild(b);
        });
    }

    function getActivePageNumbers() {
        if (modalEl && modalEl.classList.contains('open') && activeModalPageNum) {
            return [activeModalPageNum];
        }
        if (currentMode === 'slides') {
            return [currentPage];
        }
        if (currentPage === 1) {
            return [1];
        }
        if (currentPage >= TOTAL) {
            return [TOTAL];
        }
        const left = (currentPage % 2 === 0) ? currentPage : (currentPage - 1);
        const right = Math.min(TOTAL, left + 1);
        return [left, right].filter(p => p >= 1 && p <= TOTAL);
    }

    window.clearActivePageFill = function () {
        const activePages = getActivePageNumbers();
        activePages.forEach(pNum => {
            delete studentPageColors[pNum];
            if (pageSelectedDrawings[pNum]) pageSelectedDrawings[pNum].clear();
            delete pageColoringHistory[pNum];
            delete pageWidgetFillsHistory[pNum];
            const canvas = document.querySelector(`.page-coloring-canvas[data-page="${pNum}"]`);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            clearDrawingFeedback(pNum);
            document.querySelectorAll(`.widget-drawing-zone[data-page="${pNum}"]`).forEach(d => {
                d.classList.remove('is-colored');
                const cv = d.querySelector('.drawing-fill-canvas');
                if (cv) {
                    const ctx = cv.getContext('2d');
                    if (ctx && cv.width > 0 && cv.height > 0) {
                        ctx.clearRect(0, 0, cv.width, cv.height);
                    }
                }
            });
            document.querySelectorAll(`.widget-free-coloring-zone[data-page="${pNum}"] path`).forEach(p => {
                p.style.fill = 'transparent';
            });
            document.querySelectorAll(`.widget-free-coloring-zone[data-page="${pNum}"]`).forEach(fc => {
                fc.style.backgroundColor = '';
                const fl = fc.querySelector('.free-coloring-fill-layer');
                if (fl) fl.style.backgroundColor = '';
            });
            document.querySelectorAll(`.widget-paint-region[data-page="${pNum}"]`).forEach(reg => {
                reg.style.backgroundColor = reg.dataset.defaultColor || '';
                reg.classList.remove('is-painted');
            });
        });
        toast('Coloriages de la page effacés.');
    };

    window.validatePageDrawings = function (targetPageNum) {
        const activePages = targetPageNum ? [targetPageNum] : getActivePageNumbers();
        let totalExercises = 0;
        let totalCorrect = 0;
        let totalIncorrect = 0;
        let totalMissing = 0;

        activePages.forEach(pNum => {
            const expected = pageExpectedDrawings[pNum] || [];
            if (expected.length === 0) return;

            const byDrawId = {};
            expected.forEach(d => {
                byDrawId[d.drawingId] = byDrawId[d.drawingId] || [];
                byDrawId[d.drawingId].push(d);
            });

            const selected = pageSelectedDrawings[pNum] || new Set();

            Object.keys(byDrawId).forEach(drawId => {
                totalExercises++;
                const drawings = byDrawId[drawId];
                const isExpected = drawings[0].isCorrect;
                const isColored = selected.has(drawId);

                const domZones = document.querySelectorAll(`.widget-drawing-zone[data-page="${pNum}"][data-drawing-id="${drawId}"]`);

                domZones.forEach(dz => {
                    dz.classList.remove('drawing-correct', 'drawing-incorrect', 'drawing-missing');
                    if (isColored && isExpected) {
                        dz.classList.add('drawing-correct');
                    } else if (isColored && !isExpected) {
                        dz.classList.add('drawing-incorrect');
                    } else if (!isColored && isExpected) {
                        dz.classList.add('drawing-missing');
                    }
                });

                if (isColored && isExpected) totalCorrect++;
                else if (isColored && !isExpected) totalIncorrect++;
                else if (!isColored && isExpected) totalMissing++;
            });
        });

        if (totalExercises > 0) {
            if (totalCorrect > 0 && totalIncorrect === 0 && totalMissing === 0) {
                FBEngine.playCelebrationChime();
                toast('Bravo ! Tous les bons dessins sont coloriés ! ⭐');
            } else {
                toast(`Correction coloriage : ${totalCorrect} correct(s), ${totalIncorrect} incorrect(s), ${totalMissing} oublié(s).`);
            }
        }
    };

    // Feature 2 — Arrow Drawing state
    const pageExpectedArrows = {}; // pNum -> Array of { id, exerciseId, startX, startY, endX, endY, tolerance, bidirectional, label }
    const pageStudentArrows = {};  // pNum -> Array of { id, startX, startY, endX, endY }
    const pageArrowEvaluations = {}; // pNum -> Array of { studentArrow, expectedArrow, status }
    let activeArrowPageNum = null;
    let activeArrowStart = null;

    function initArrowLayer(svg, pNum) {
        function getCoords(e) {
            const rect = svg.getBoundingClientRect();
            const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
            return { x, y };
        }

        svg.addEventListener('pointerdown', (e) => {
            if (activeViewerTool !== 'arrow') return;
            e.preventDefault();
            e.stopPropagation();
            try { svg.setPointerCapture(e.pointerId); } catch (err) {}
            const { x, y } = getCoords(e);
            activeArrowPageNum = pNum;
            activeArrowStart = { x, y };
            // Clear prior evaluation results when answer changes
            delete pageArrowEvaluations[pNum];
            renderPageArrows(pNum);
            renderDraftArrow(svg, x, y, x, y);
        });

        svg.addEventListener('pointermove', (e) => {
            if (activeArrowPageNum !== pNum || !activeArrowStart) return;
            e.preventDefault();
            e.stopPropagation();
            const { x, y } = getCoords(e);
            renderDraftArrow(svg, activeArrowStart.x, activeArrowStart.y, x, y);
        });

        const finishArrow = (e) => {
            if (activeArrowPageNum !== pNum || !activeArrowStart) return;
            const { x, y } = getCoords(e);
            const dist = Math.hypot(x - activeArrowStart.x, y - activeArrowStart.y);
            if (dist >= 2.5) {
                pageStudentArrows[pNum] = pageStudentArrows[pNum] || [];
                pageStudentArrows[pNum].push({
                    id: 'sarr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                    startX: activeArrowStart.x,
                    startY: activeArrowStart.y,
                    endX: x,
                    endY: y
                });
            }
            activeArrowPageNum = null;
            activeArrowStart = null;
            renderDraftArrow(svg, null);
            renderPageArrows(pNum);
        };

        svg.addEventListener('pointerup', finishArrow);
        svg.addEventListener('pointercancel', finishArrow);
    }

    function renderDraftArrow(svg, sx, sy, ex, ey) {
        const draftG = svg.querySelector('.arrow-draft-layer');
        if (!draftG) return;
        draftG.innerHTML = '';
        if (sx === null || sy === null || ex === null || ey === null) return;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', sx + '%');
        line.setAttribute('y1', sy + '%');
        line.setAttribute('x2', ex + '%');
        line.setAttribute('y2', ey + '%');
        line.setAttribute('stroke', '#3b82f6');
        line.setAttribute('stroke-width', '1.8');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('marker-end', `url(#arrowhead-draft-${svg.dataset.page})`);
        draftG.appendChild(line);
    }

    function renderPageArrows(pNum) {
        const svg = document.querySelector(`.page-arrow-svg[data-page="${pNum}"]`);
        if (!svg) return;
        const rendersG = svg.querySelector('.arrow-renders-layer');
        if (!rendersG) return;
        rendersG.innerHTML = '';

        const evals = pageArrowEvaluations[pNum];
        const studentArrows = pageStudentArrows[pNum] || [];

        if (evals && evals.length > 0) {
            evals.forEach(ev => {
                if (ev.studentArrow) {
                    const isCorrect = ev.status === 'correct';
                    const color = isCorrect ? '#22c55e' : '#ef4444';
                    const markerId = isCorrect ? `arrowhead-correct-${pNum}` : `arrowhead-incorrect-${pNum}`;
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', ev.studentArrow.startX + '%');
                    line.setAttribute('y1', ev.studentArrow.startY + '%');
                    line.setAttribute('x2', ev.studentArrow.endX + '%');
                    line.setAttribute('y2', ev.studentArrow.endY + '%');
                    line.setAttribute('stroke', color);
                    line.setAttribute('stroke-width', '2');
                    line.setAttribute('stroke-linecap', 'round');
                    line.setAttribute('marker-end', `url(#${markerId})`);
                    line.setAttribute('class', isCorrect ? 'arrow-correct' : 'arrow-incorrect');
                    rendersG.appendChild(line);

                    // If incorrect, reveal expected arrow in dashed blue
                    if (!isCorrect && ev.expectedArrow) {
                        const expLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        expLine.setAttribute('x1', ev.expectedArrow.startX + '%');
                        expLine.setAttribute('y1', ev.expectedArrow.startY + '%');
                        expLine.setAttribute('x2', ev.expectedArrow.endX + '%');
                        expLine.setAttribute('y2', ev.expectedArrow.endY + '%');
                        expLine.setAttribute('stroke', '#0ea5e9');
                        expLine.setAttribute('stroke-width', '1.6');
                        expLine.setAttribute('stroke-dasharray', '4,3');
                        expLine.setAttribute('marker-end', `url(#arrowhead-expected-${pNum})`);
                        rendersG.appendChild(expLine);
                    }
                } else if (ev.status === 'missing' && ev.expectedArrow) {
                    const expLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    expLine.setAttribute('x1', ev.expectedArrow.startX + '%');
                    expLine.setAttribute('y1', ev.expectedArrow.startY + '%');
                    expLine.setAttribute('x2', ev.expectedArrow.endX + '%');
                    expLine.setAttribute('y2', ev.expectedArrow.endY + '%');
                    expLine.setAttribute('stroke', '#eab308');
                    expLine.setAttribute('stroke-width', '1.8');
                    expLine.setAttribute('stroke-dasharray', '4,3');
                    expLine.setAttribute('marker-end', `url(#arrowhead-missing-${pNum})`);
                    rendersG.appendChild(expLine);

                    const midX = (ev.expectedArrow.startX + ev.expectedArrow.endX) / 2;
                    const midY = (ev.expectedArrow.startY + ev.expectedArrow.endY) / 2;
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.setAttribute('x', midX + '%');
                    text.setAttribute('y', (midY - 2) + '%');
                    text.setAttribute('fill', '#ca8a04');
                    text.setAttribute('font-size', '9');
                    text.setAttribute('font-weight', 'bold');
                    text.setAttribute('text-anchor', 'middle');
                    text.textContent = 'Manquante';
                    rendersG.appendChild(text);
                }
            });
        } else {
            studentArrows.forEach(sArr => {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', sArr.startX + '%');
                line.setAttribute('y1', sArr.startY + '%');
                line.setAttribute('x2', sArr.endX + '%');
                line.setAttribute('y2', sArr.endY + '%');
                line.setAttribute('stroke', '#6366f1');
                line.setAttribute('stroke-width', '1.8');
                line.setAttribute('stroke-linecap', 'round');
                line.setAttribute('marker-end', `url(#arrowhead-student-${pNum})`);
                rendersG.appendChild(line);
            });
        }
        if (typeof renderModalArrows === 'function' && modalEl && modalEl.classList.contains('open') && activeModalPageNum === pNum) {
            renderModalArrows();
        }
    }

    window.undoLastArrow = function () {
        const activePages = getActivePageNumbers();
        activePages.forEach(pNum => {
            if (pageStudentArrows[pNum] && pageStudentArrows[pNum].length > 0) {
                pageStudentArrows[pNum].pop();
                delete pageArrowEvaluations[pNum];
                renderPageArrows(pNum);
            }
        });
        toast('Dernière flèche annulée.');
    };

    window.clearPageArrows = function () {
        const activePages = getActivePageNumbers();
        activePages.forEach(pNum => {
            delete pageStudentArrows[pNum];
            delete pageArrowEvaluations[pNum];
            renderPageArrows(pNum);
        });
        toast('Toutes les flèches effacées.');
    };

    window.validatePageArrows = function () {
        const activePages = getActivePageNumbers();
        let totalExp = 0;
        let totalCorrect = 0;
        let totalIncorrect = 0;
        let totalMissing = 0;

        activePages.forEach(pNum => {
            const expected = pageExpectedArrows[pNum] || [];
            const student = pageStudentArrows[pNum] || [];

            totalExp += expected.length;
            const evaluations = [];
            const matchedExpIds = new Set();
            const assignedStudentIds = new Set();

            // 1. Collect all candidate matches within strict configured tolerance
            const candidates = [];
            student.forEach(sArr => {
                expected.forEach(eArr => {
                    const tol = Number(eArr.tolerance) > 0 ? Number(eArr.tolerance) : 6;
                    const dStart = Math.hypot(sArr.startX - eArr.startX, sArr.startY - eArr.startY);
                    const dEnd = Math.hypot(sArr.endX - eArr.endX, sArr.endY - eArr.endY);
                    const fwdMatch = (dStart <= tol && dEnd <= tol);

                    let revMatch = false;
                    let dStartRev = 0;
                    let dEndRev = 0;
                    if (eArr.bidirectional) {
                        dStartRev = Math.hypot(sArr.startX - eArr.endX, sArr.startY - eArr.endY);
                        dEndRev = Math.hypot(sArr.endX - eArr.startX, sArr.endY - eArr.startY);
                        revMatch = (dStartRev <= tol && dEndRev <= tol);
                    }

                    if (fwdMatch || revMatch) {
                        const dist = fwdMatch && revMatch
                            ? Math.min(dStart + dEnd, dStartRev + dEndRev)
                            : fwdMatch
                            ? (dStart + dEnd)
                            : (dStartRev + dEndRev);
                        candidates.push({ sArr, eArr, dist });
                    }
                });
            });

            // Sort candidate matches by distance ascending for optimal pairing
            candidates.sort((a, b) => a.dist - b.dist);

            candidates.forEach(({ sArr, eArr }) => {
                if (assignedStudentIds.has(sArr.id) || matchedExpIds.has(eArr.id)) return;
                assignedStudentIds.add(sArr.id);
                matchedExpIds.add(eArr.id);
                totalCorrect++;
                evaluations.push({ studentArrow: sArr, expectedArrow: eArr, status: 'correct' });
            });

            // 2. Any student arrow NOT matched within tolerance is strictly incorrect
            const attemptedExpIds = new Set(matchedExpIds);
            student.forEach(sArr => {
                if (assignedStudentIds.has(sArr.id)) return;

                let closestExp = null;
                let minD = Infinity;

                expected.forEach(eArr => {
                    if (attemptedExpIds.has(eArr.id)) return;
                    const d = Math.hypot(sArr.startX - eArr.startX, sArr.startY - eArr.startY);
                    if (d < minD) {
                        minD = d;
                        closestExp = eArr;
                    }
                });

                if (closestExp) {
                    attemptedExpIds.add(closestExp.id);
                }
                totalIncorrect++;
                evaluations.push({ studentArrow: sArr, expectedArrow: closestExp, status: 'incorrect' });
            });

            // 3. Only expected arrows that were never attempted are truly missing
            expected.forEach(eArr => {
                if (!attemptedExpIds.has(eArr.id)) {
                    totalMissing++;
                    evaluations.push({ studentArrow: null, expectedArrow: eArr, status: 'missing' });
                }
            });

            pageArrowEvaluations[pNum] = evaluations;
            renderPageArrows(pNum);

            // Also evaluate multiple-choice questions on this page
            validatePageChoices(pNum);
        });

        if (totalExp > 0) {
            if (totalCorrect === totalExp && totalIncorrect === 0) {
                FBEngine.playCelebrationChime();
                toast(`Toutes les flèches sont correctes ! (${totalCorrect}/${totalExp}) ⭐`);
            } else {
                const parts = [`${totalCorrect} correcte(s)`, `${totalIncorrect} incorrecte(s)`];
                if (totalMissing > 0) parts.push(`${totalMissing} manquante(s)`);
                toast(`Correction flèches : ${parts.join(', ')}.`);
            }
        }
    };

    // Feature 3 — Interactive Choice Zones handlers
    function makeChoiceBadge(text, className) {
        const bd = document.createElement('span');
        bd.className = 'choice-ext-badge ' + className;
        bd.textContent = text;
        return bd;
    }

    function handleChoiceZoneClick(cZone, inter, pNum) {
        const qId = cZone.dataset.questionId;
        const mode = cZone.dataset.selectionMode || 'single';
        const pageChoices = document.querySelectorAll(`.widget-choice-zone[data-page="${pNum}"][data-question-id="${qId}"]`);

        if (mode === 'single') {
            // Immediate evaluation upon selection
            const isCorrect = cZone.dataset.isCorrect === '1';
            pageChoices.forEach(cz => {
                cz.classList.remove('choice-correct', 'choice-incorrect', 'choice-neutral', 'choice-missing');
                cz.querySelectorAll('.choice-ext-badge').forEach(b => b.remove());
            });

            if (isCorrect) {
                cZone.classList.add('choice-correct');
                cZone.appendChild(makeChoiceBadge('✓', 'correct'));
                FBEngine.playCelebrationChime();
                toast('Bonne réponse ! ⭐');
            } else {
                cZone.classList.add('choice-incorrect');
                cZone.appendChild(makeChoiceBadge('✕', 'incorrect'));
                toast('Réponse incorrecte. Essayez encore !');
            }
        } else {
            // Multiple choice: clear previous evaluation results when editing resumes
            pageChoices.forEach(cz => {
                if (cz.classList.contains('choice-correct') || cz.classList.contains('choice-incorrect') || cz.classList.contains('choice-missing')) {
                    cz.classList.remove('choice-correct', 'choice-incorrect', 'choice-missing');
                    cz.querySelectorAll('.choice-ext-badge').forEach(b => b.remove());
                }
            });
            // Toggle selection — NO dot badge, just color change is enough
            cZone.classList.toggle('choice-neutral');
        }
    }

    function validatePageChoices(pNum) {
        const pageChoices = Array.from(document.querySelectorAll(`.widget-choice-zone[data-page="${pNum}"]`));
        if (pageChoices.length === 0) return { totalQuestions: 0, correctQuestions: 0 };

        const byQ = {};
        pageChoices.forEach(cz => {
            const qId = cz.dataset.questionId || 'q';
            byQ[qId] = byQ[qId] || [];
            byQ[qId].push(cz);
        });

        let totalQuestions = 0;
        let correctQuestions = 0;

        Object.keys(byQ).forEach(qId => {
            const choices = byQ[qId];
            const mode = choices[0].dataset.selectionMode || 'single';
            if (mode !== 'multiple') return;

            totalQuestions++;
            let qFullyCorrect = true;

            choices.forEach(cz => {
                const isSelected = cz.classList.contains('choice-neutral') || cz.classList.contains('choice-correct');
                const isExpected = cz.dataset.isCorrect === '1';

                cz.classList.remove('choice-neutral', 'choice-correct', 'choice-incorrect', 'choice-missing');
                cz.querySelectorAll('.choice-ext-badge').forEach(b => b.remove());

                if (isSelected && isExpected) {
                    cz.classList.add('choice-correct');
                    cz.appendChild(makeChoiceBadge('✓', 'correct'));
                } else if (isSelected && !isExpected) {
                    cz.classList.add('choice-incorrect');
                    cz.appendChild(makeChoiceBadge('✕', 'incorrect'));
                    qFullyCorrect = false;
                } else if (!isSelected && isExpected) {
                    cz.classList.add('choice-missing');
                    cz.appendChild(makeChoiceBadge('✕', 'missing'));
                    qFullyCorrect = false;
                }
            });

            if (qFullyCorrect) correctQuestions++;
        });

        return { totalQuestions, correctQuestions };
    }

    // Feature: Entourer la zone (Circle Exercise) handlers
    function createCircleRingSvg(isCorrect) {
        const strokeColor = isCorrect ? '#22c55e' : '#ef4444';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'circle-svg-ring' + (isCorrect ? ' circle-ring-correct' : ' circle-ring-incorrect'));
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');

        const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        ellipse.setAttribute('cx', '50');
        ellipse.setAttribute('cy', '50');
        ellipse.setAttribute('rx', '47');
        ellipse.setAttribute('ry', '44');
        ellipse.setAttribute('fill', 'none');
        ellipse.setAttribute('stroke', strokeColor);
        ellipse.setAttribute('stroke-width', '3.5');
        ellipse.setAttribute('stroke-linecap', 'round');
        ellipse.setAttribute('vector-effect', 'non-scaling-stroke');
        svg.appendChild(ellipse);

        return svg;
    }

    function handleCircleZoneClick(cZone, inter, pNum) {
        const qId = cZone.dataset.questionId;
        const pageCircles = document.querySelectorAll(`.widget-circle-zone[data-page="${pNum}"][data-question-id="${qId}"]`);
        const isCorrect = cZone.dataset.isCorrect === '1';

        // Clear previous selection for this sub-question only
        pageCircles.forEach(cz => {
            cz.classList.remove('circle-selected', 'circle-correct', 'circle-incorrect', 'circle-anim-pop', 'circle-anim-shake');
            cz.querySelectorAll('.circle-svg-ring, .circle-feedback-badge').forEach(el => el.remove());
        });

        cZone.classList.add('circle-selected');
        const ringSvg = createCircleRingSvg(isCorrect);
        cZone.appendChild(ringSvg);

        // Immediate feedback
        if (isCorrect) {
            cZone.classList.add('circle-correct', 'circle-anim-pop');
            try {
                if (typeof FBEngine !== 'undefined' && FBEngine.playCelebrationChime) {
                    FBEngine.playCelebrationChime();
                }
            } catch (err) { }
            toast('Bonne réponse ! ⭐');
        } else {
            cZone.classList.add('circle-incorrect', 'circle-anim-shake');
            toast('Réponse incorrecte. Essayez encore !');
        }
    }

    // Feature: Glisser-Déposer (Drag and Drop Exercise) interaction handler
    function initDragItemInteraction(dragItem, inter, pNum, overlay) {
        let isDragging = false;
        let startClientX = 0;
        let startClientY = 0;

        dragItem.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            try { dragItem.setPointerCapture(e.pointerId); } catch (err) { }

            isDragging = true;
            dragItem.classList.add('is-dragging');
            dragItem.classList.remove('drag-error-shake', 'drag-snap-pop');
            dragItem.style.cursor = 'grabbing';
            dragItem.style.zIndex = '1000';

            startClientX = e.clientX;
            startClientY = e.clientY;

            // Highlight receptive drop zones on current page
            const dropZones = overlay.querySelectorAll('.widget-drop-zone');
            dropZones.forEach(dz => dz.classList.add('drop-target-active'));
        });

        dragItem.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            e.stopPropagation();
            e.preventDefault();

            const dx = e.clientX - startClientX;
            const dy = e.clientY - startClientY;

            dragItem.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.05)`;

            // Hit test drop zones for visual hover highlight
            const currentItemRect = dragItem.getBoundingClientRect();
            const centerX = currentItemRect.left + currentItemRect.width / 2;
            const centerY = currentItemRect.top + currentItemRect.height / 2;

            const dropZones = overlay.querySelectorAll('.widget-drop-zone');
            dropZones.forEach(dz => {
                const dzRect = dz.getBoundingClientRect();
                const isHovered = (
                    centerX >= dzRect.left &&
                    centerX <= dzRect.right &&
                    centerY >= dzRect.top &&
                    centerY <= dzRect.bottom
                );
                dz.classList.toggle('drop-hover', isHovered);
            });
        });

        const finishDrag = (e) => {
            if (!isDragging) return;
            isDragging = false;
            try { dragItem.releasePointerCapture(e.pointerId); } catch (err) { }

            dragItem.classList.remove('is-dragging');
            dragItem.style.cursor = 'grab';
            dragItem.style.zIndex = '15';

            const dropZones = overlay.querySelectorAll('.widget-drop-zone');
            dropZones.forEach(dz => {
                dz.classList.remove('drop-target-active', 'drop-hover');
            });

            // Find matching drop zone under center of dragged item
            const currentItemRect = dragItem.getBoundingClientRect();
            const centerX = currentItemRect.left + currentItemRect.width / 2;
            const centerY = currentItemRect.top + currentItemRect.height / 2;

            let hitDropZone = null;
            dropZones.forEach(dz => {
                const dzRect = dz.getBoundingClientRect();
                if (
                    centerX >= dzRect.left &&
                    centerX <= dzRect.right &&
                    centerY >= dzRect.top &&
                    centerY <= dzRect.bottom
                ) {
                    hitDropZone = dz;
                }
            });

            const dragId = dragItem.dataset.dragId;

            if (hitDropZone) {
                const acceptedId = hitDropZone.dataset.acceptedDragId;
                if (acceptedId && acceptedId === dragId) {
                    // Correct placement! Snap into target
                    dragItem.style.transition = 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    dragItem.style.left = hitDropZone.style.left;
                    dragItem.style.top = hitDropZone.style.top;
                    dragItem.style.transform = 'none';

                    dragItem.classList.add('drag-placed-correct', 'drag-snap-pop');
                    hitDropZone.classList.add('target-matched');

                    // Store persistence
                    studentDragPlacements[pNum] = studentDragPlacements[pNum] || {};
                    studentDragPlacements[pNum][dragId] = {
                        isPlaced: true,
                        left: hitDropZone.style.left,
                        top: hitDropZone.style.top,
                    };

                    try {
                        if (typeof FBEngine !== 'undefined' && FBEngine.playCelebrationChime) {
                            FBEngine.playCelebrationChime();
                        }
                    } catch (err) {}
                    toast('Élément bien placé ! ⭐');

                    setTimeout(() => {
                        dragItem.style.transition = '';
                        dragItem.classList.remove('drag-snap-pop');
                    }, 350);
                    return;
                } else {
                    // Wrong drop target!
                    dragItem.classList.add('drag-error-shake');
                    toast('Mauvais emplacement. Essayez encore !');
                }
            } else {
                // Dropped outside any target
                dragItem.classList.add('drag-error-shake');
            }

            // Animate smoothly back to initial starting coordinates
            dragItem.style.transition = 'transform 0.3s ease-out';
            dragItem.style.transform = 'none';

            // Clean up stored state if previously placed
            if (studentDragPlacements[pNum]?.[dragId]) {
                delete studentDragPlacements[pNum][dragId];
            }
            dragItem.classList.remove('drag-placed-correct');

            setTimeout(() => {
                dragItem.style.transition = '';
                dragItem.classList.remove('drag-error-shake');
                dragItem.style.left = dragItem.dataset.initLeft;
                dragItem.style.top = dragItem.dataset.initTop;
            }, 350);
        };

        dragItem.addEventListener('pointerup', finishDrag);
        dragItem.addEventListener('pointercancel', finishDrag);
    }

    window.toggleViewerTool = function (tool) {
        if (activeViewerTool === tool) {
            activeViewerTool = null;
        } else {
            activeViewerTool = tool;
        }
        applyViewerToolState();
    };

    window.setAnnotColor = function (color, el, overrideSize) {
        currentAnnotColor = color;
        if (overrideSize) currentAnnotSize = overrideSize;
        document.querySelectorAll('.palette-colors .color-dot').forEach(d => d.classList.remove('active'));
        if (el) el.classList.add('active');
    };

    window.setAnnotSize = function (size, el) {
        currentAnnotSize = size;
        document.querySelectorAll('.palette-sizes .size-dot').forEach(d => d.classList.remove('active'));
        if (el) el.classList.add('active');
    };

    window.clearActivePageDrawing = function () {
        const pNum = (modalEl && modalEl.classList.contains('open') && activeModalPageNum) ? activeModalPageNum : currentPage;
        if (typeof saveAnnotUndoState === 'function') {
            saveAnnotUndoState(pNum);
        }
        const currentCanvases = document.querySelectorAll('.page-annot-canvas');
        currentCanvases.forEach(c => {
            const num = c.getAttribute('data-page');
            const parentPage = c.closest('.page-item');
            if (String(num) === String(pNum) || (parentPage && parentPage.offsetParent !== null)) {
                const ctx = c.getContext('2d');
                ctx.clearRect(0, 0, c.width, c.height);
                delete pageDrawingsCache[num];
            }
        });
        if (modalEl && modalEl.classList.contains('open')) {
            const mCanvas = document.getElementById('modal-annot-canvas');
            if (mCanvas) {
                const mCtx = mCanvas.getContext('2d');
                mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);
            }
        }
        toast('Annotations effacées.');
    };

    function applyViewerToolState() {
        document.body.dataset.tool = activeViewerTool || 'none';
        ['penBtn', 'calligraphyBtn', 'eraserBtn', 'loupeBtn', 'bucketBtn', 'arrowToolBtn', 'circleToolBtn', 'btn-pen', 'btn-calligraphy', 'btn-eraser', 'btn-loupe'].forEach(bId => {
            const b = document.getElementById(bId);
            if (b) {
                b.setAttribute('aria-pressed', 'false');
                b.classList.remove('active');
            }
        });

        const penPanel = document.getElementById('penPanel');
        const bucketPanel = document.getElementById('bucketPanel');
        const arrowPanel = document.getElementById('arrowPanel');
        const lens = document.getElementById('circular-loupe-lens');

        if (lens && activeViewerTool !== 'loupe') lens.style.display = 'none';
        if (penPanel) penPanel.hidden = (activeViewerTool !== 'pen' && activeViewerTool !== 'calligraphy' && activeViewerTool !== 'eraser');
        if (bucketPanel) bucketPanel.hidden = (activeViewerTool !== 'bucket');
        if (arrowPanel) arrowPanel.hidden = (activeViewerTool !== 'arrow');

        if (activeViewerTool === 'pen') {
            const b1 = document.getElementById('penBtn');
            const b2 = document.getElementById('btn-pen');
            if (b1) { b1.setAttribute('aria-pressed', 'true'); b1.classList.add('active'); }
            if (b2) b2.classList.add('active');
            if (penPanel) { penPanel.dataset.tool = 'pen'; }
            toast('Crayon actif : dessinez ou écrivez sur les pages.');
            setupAllAnnotCanvases();
        } else if (activeViewerTool === 'calligraphy') {
            const b1 = document.getElementById('calligraphyBtn');
            const b2 = document.getElementById('btn-calligraphy');
            if (b1) { b1.setAttribute('aria-pressed', 'true'); b1.classList.add('active'); }
            if (b2) b2.classList.add('active');
            if (penPanel) { penPanel.dataset.tool = 'calligraphy'; }
            toast('Plume calligraphique active : écriture fluide et artistique.');
            setupAllAnnotCanvases();
        } else if (activeViewerTool === 'eraser') {
            const b1 = document.getElementById('eraserBtn');
            const b2 = document.getElementById('btn-eraser');
            if (b1) { b1.setAttribute('aria-pressed', 'true'); b1.classList.add('active'); }
            if (b2) b2.classList.add('active');
            if (penPanel) { penPanel.dataset.tool = 'eraser'; }
            toast('Gomme active : passez sur vos annotations pour les effacer.');
            setupAllAnnotCanvases();
        } else if (activeViewerTool === 'bucket') {
            const b1 = document.getElementById('bucketBtn');
            if (b1) { b1.setAttribute('aria-pressed', 'true'); b1.classList.add('active'); }
            toast('Pot de peinture actif : choisissez une couleur et cliquez sur une zone à colorier.');
        } else if (activeViewerTool === 'arrow') {
            const b1 = document.getElementById('arrowToolBtn');
            if (b1) { b1.setAttribute('aria-pressed', 'true'); b1.classList.add('active'); }
            toast('Outil Flèche actif : glissez pour tracer une flèche de départ à arrivée.');
        } else if (activeViewerTool === 'circle') {
            const b1 = document.getElementById('circleToolBtn');
            if (b1) { b1.setAttribute('aria-pressed', 'true'); b1.classList.add('active'); }
            toast('Entourer la zone actif : cliquez sur une option pour l\'entourer.');
        } else if (activeViewerTool === 'loupe') {
            const b1 = document.getElementById('loupeBtn');
            const b2 = document.getElementById('btn-loupe');
            if (b1) { b1.setAttribute('aria-pressed', 'true'); b1.classList.add('active'); }
            if (b2) b2.classList.add('active');
            toast('Loupe active : survolez la page pour agrandir les détails.');
        }
        if (typeof updateModalToolMode === 'function') {
            updateModalToolMode();
        }
    }

    function setupAllAnnotCanvases() {
        document.querySelectorAll('.page-annot-canvas').forEach(canvas => {
            if (!canvas.getAttribute('data-initialized')) {
                canvas.setAttribute('data-initialized', 'true');
                initCanvasListeners(canvas);
            }
            refreshCanvasResolution(canvas);
        });
    }

    function refreshCanvasResolution(canvas) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            const dpr = window.devicePixelRatio || 1;
            const targetW = Math.round(rect.width * dpr);
            const targetH = Math.round(rect.height * dpr);
            if (canvas.width !== targetW || canvas.height !== targetH) {
                const pNum = canvas.getAttribute('data-page');
                const prevData = pageDrawingsCache[pNum];
                let tempCanvas = null;
                if (!prevData && canvas.width > 0 && canvas.height > 0) {
                    tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    const tCtx = tempCanvas.getContext('2d');
                    tCtx.drawImage(canvas, 0, 0);
                }
                canvas.width = targetW;
                canvas.height = targetH;
                if (prevData) {
                    const img = new Image();
                    img.onload = () => {
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, targetW, targetH);
                    };
                    img.src = prevData;
                } else if (tempCanvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(tempCanvas, 0, 0, targetW, targetH);
                }
            }
        }
    }

    function initCanvasListeners(canvas) {
        const ctx = canvas.getContext('2d');
        const pNum = canvas.getAttribute('data-page');

        function getCoords(e) {
            const rect = canvas.getBoundingClientRect();
            const w = rect.width > 0 ? rect.width : (canvas.width || 800);
            const h = rect.height > 0 ? rect.height : (canvas.height || 600);
            const scaleX = canvas.width / w;
            const scaleY = canvas.height / h;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
                scaleRatio: scaleX
            };
        }

        canvas.addEventListener('pointerdown', (e) => {
            if (!['pen', 'eraser', 'brush', 'calligraphy'].includes(activeViewerTool)) return;
            e.preventDefault();
            e.stopPropagation();
            try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
            refreshCanvasResolution(canvas);
            if (typeof saveAnnotUndoState === 'function') saveAnnotUndoState(pNum);
            isAnnotDrawing = true;
            activeDrawingCanvas = canvas;
            activeDrawingCtx = ctx;

            const { x, y, scaleRatio } = getCoords(e);
            annotStartX = x;
            annotStartY = y;
            annotLastX = x;
            annotLastY = y;
            annotLastTime = performance.now();

            if (activeViewerTool === 'pen' || activeViewerTool === 'brush') {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = currentAnnotColor || '#17143F';
                ctx.fillStyle = currentAnnotColor || '#17143F';
                const penWidth = activeViewerTool === 'brush' ? (currentAnnotSize * scaleRatio * 3) : (currentAnnotSize * scaleRatio);
                ctx.lineWidth = penWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                if (activeViewerTool === 'brush') ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.arc(x, y, penWidth / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            } else if (activeViewerTool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                const eraserSize = Math.max(16, (currentAnnotSize || 5) * 4) * scaleRatio;
                ctx.beginPath();
                ctx.arc(x, y, eraserSize / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (activeViewerTool === 'calligraphy') {
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = currentAnnotColor || '#17143F';
                let pMod = 1.0;
                if (typeof e.pressure === 'number' && e.pressure > 0.02 && e.pressure !== 0.5) {
                    pMod = 0.45 + e.pressure * 1.1;
                }
                const baseW = (currentAnnotSize || 5) * scaleRatio * 2.4 * pMod;
                annotLastW = baseW;
                ctx.beginPath();
                ctx.ellipse(x, y, Math.max(1, baseW / 2), Math.max(0.8, baseW / 7), CALLIGRAPHY_NIB_ANGLE, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        canvas.addEventListener('pointermove', (e) => {
            if (!isAnnotDrawing || activeDrawingCanvas !== canvas) return;
            e.preventDefault();
            e.stopPropagation();
            const { x, y, scaleRatio } = getCoords(e);

            if (activeViewerTool === 'pen' || activeViewerTool === 'brush') {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = currentAnnotColor || '#17143F';
                ctx.lineWidth = activeViewerTool === 'brush' ? (currentAnnotSize * scaleRatio * 3) : (currentAnnotSize * scaleRatio);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                if (activeViewerTool === 'brush') ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.moveTo(annotLastX, annotLastY);
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
                annotLastX = x;
                annotLastY = y;
            } else if (activeViewerTool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                const eraserSize = Math.max(16, (currentAnnotSize || 5) * 4) * scaleRatio;
                ctx.lineWidth = eraserSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(annotLastX, annotLastY);
                ctx.lineTo(x, y);
                ctx.stroke();
                annotLastX = x;
                annotLastY = y;
            } else if (activeViewerTool === 'circle') {
                const img = new Image();
                img.src = pageDrawingsCache[pNum] || '';
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (img.src) ctx.drawImage(img, 0, 0);
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = currentAnnotColor || '#17143F';
                ctx.lineWidth = currentAnnotSize * scaleRatio;
                ctx.beginPath();
                ctx.ellipse((annotStartX + x) / 2, (annotStartY + y) / 2, Math.abs(x - annotStartX) / 2, Math.abs(y - annotStartY) / 2, 0, 0, 2 * Math.PI);
                ctx.stroke();
            } else if (activeViewerTool === 'calligraphy') {
                const now = performance.now();
                const dt = Math.max(1, now - annotLastTime);
                const rawDist = Math.hypot(x - annotLastX, y - annotLastY);
                if (rawDist < 0.5) return;

                // Smooth pointer points to reduce jagged/staircase lines
                const smoothX = annotLastX + (x - annotLastX) * 0.72;
                const smoothY = annotLastY + (y - annotLastY) * 0.72;

                // Optional pressure sensitivity with velocity fallback
                let pMod = 1.0;
                if (typeof e.pressure === 'number' && e.pressure > 0.02 && e.pressure !== 0.5) {
                    pMod = 0.45 + e.pressure * 1.1;
                } else {
                    const speed = rawDist / dt;
                    pMod = Math.max(0.65, Math.min(1.4, 1.25 - speed * 0.08));
                }

                const targetW = (currentAnnotSize || 5) * scaleRatio * 2.4 * pMod;
                const dist = Math.hypot(smoothX - annotLastX, smoothY - annotLastY);
                const steps = Math.max(1, Math.ceil(dist / 1.5));

                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = currentAnnotColor || '#17143F';

                for (let i = 1; i <= steps; i++) {
                    const t = i / steps;
                    const ix = annotLastX + (smoothX - annotLastX) * t;
                    const iy = annotLastY + (smoothY - annotLastY) * t;
                    const iw = annotLastW + (targetW - annotLastW) * t;
                    ctx.beginPath();
                    ctx.ellipse(ix, iy, Math.max(1, iw / 2), Math.max(0.8, iw / 7), CALLIGRAPHY_NIB_ANGLE, 0, Math.PI * 2);
                    ctx.fill();
                }

                annotLastX = smoothX;
                annotLastY = smoothY;
                annotLastW = targetW;
                annotLastTime = now;
            }
        });

        const finishDrawing = (e) => {
            if (!isAnnotDrawing || activeDrawingCanvas !== canvas) return;
            isAnnotDrawing = false;
            activeDrawingCanvas = null;
            activeDrawingCtx = null;
            try { if (e && e.pointerId) canvas.releasePointerCapture(e.pointerId); } catch (err) { }
            pageDrawingsCache[pNum] = canvas.toDataURL();
        };

        canvas.addEventListener('pointerup', finishDrawing);
        canvas.addEventListener('pointercancel', finishDrawing);

        canvas.addEventListener('mousedown', (e) => {
            if (['pen', 'eraser', 'brush', 'calligraphy'].includes(activeViewerTool)) {
                e.stopPropagation();
            }
        });
        canvas.addEventListener('touchstart', (e) => {
            if (['pen', 'eraser', 'brush', 'calligraphy'].includes(activeViewerTool)) {
                e.stopPropagation();
            }
        }, { passive: false });
    }

    // ── Dynamic Circular Magnifier Lens (Loupe) ──
    (function initLoupe() {
        const lens = document.getElementById('circular-loupe-lens');
        if (!lens) return;

        window.addEventListener('mousemove', (e) => {
            if (activeViewerTool !== 'loupe') {
                lens.style.display = 'none';
                return;
            }

            const el = document.elementFromPoint(e.clientX, e.clientY);
            const pageEl = el ? el.closest('.page-item') : null;
            const img = pageEl ? pageEl.querySelector('.page-img') : null;

            if (!img) {
                lens.style.display = 'none';
                return;
            }

            const rect = img.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
                lens.style.display = 'none';
                return;
            }

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

            lens.style.backgroundImage = `url("${img.src}")`;
            lens.style.backgroundSize = `${bgW}px ${bgH}px`;
            lens.style.backgroundPosition = `${bgX}px ${bgY}px`;
        });

        window.addEventListener('mouseleave', () => {
            if (lens) lens.style.display = 'none';
        });
    })();

    function updateUI() {
        syncModeButtons();

        const topCount = document.getElementById('topCount');
        const toolCount = document.getElementById('toolCount');

        let displayLabel = '';
        if (currentMode === 'slides') {
            displayLabel = String(currentPage);
        } else {
            const isCover = (currentPage === 1);
            const isBackCover = (currentPage === TOTAL);
            if (isCover) {
                displayLabel = '1';
            } else if (isBackCover) {
                displayLabel = String(TOTAL);
            } else {
                const left = (currentPage % 2 === 0) ? currentPage : (currentPage - 1);
                const right = Math.min(TOTAL, left + 1);
                displayLabel = `${left}–${right}`;
            }
        }

        if (topCount) topCount.textContent = `Page ${displayLabel} / ${TOTAL}`;
        if (toolCount) toolCount.textContent = `${displayLabel} / ${TOTAL}`;

        const isAtStart = currentPage <= 1;
        const isAtEnd = currentPage >= TOTAL;

        const navPrev = document.getElementById('prev');
        const navNext = document.getElementById('next');
        const tPrev = document.getElementById('tPrev');
        const tNext = document.getElementById('tNext');

        if (navPrev) navPrev.disabled = isAtStart;
        if (tPrev) tPrev.disabled = isAtStart;
        if (navNext) navNext.disabled = isAtEnd;
        if (tNext) tNext.disabled = isAtEnd;

        // Active thumbnails in TOC strip
        document.querySelectorAll('.thumb').forEach(t => {
            const n = parseInt(t.dataset.page, 10);
            if (currentMode === 'slides') {
                t.classList.toggle('active', n === currentPage);
            } else {
                if (currentPage === 1) {
                    t.classList.toggle('active', n === 1);
                } else if (currentPage === TOTAL) {
                    t.classList.toggle('active', n === TOTAL);
                } else {
                    const left = (currentPage % 2 === 0) ? currentPage : (currentPage - 1);
                    const right = Math.min(TOTAL, left + 1);
                    t.classList.toggle('active', n === left || n === right);
                }
            }
        });

        // Auto scroll TOC strip if open
        const toc = document.getElementById('toc');
        if (toc && toc.classList.contains('open')) {
            const activeThumb = document.querySelector('.thumb.active');
            const strip = document.getElementById('strip');
            if (activeThumb && strip) {
                strip.scrollTo({
                    left: activeThumb.offsetLeft - strip.clientWidth / 2 + activeThumb.offsetWidth / 2,
                    behavior: 'smooth'
                });
            }
        }
    }

    function playFlipSound() {
        if (!soundEnabled) return;
        const s = new Audio(asset('public/audio/page-flip.wav'));
        s.volume = 0.4;
        s.play().catch(() => { });
    }

    window.toggleSound = () => {
        soundEnabled = !soundEnabled;
        const btn = document.getElementById('soundBtn');
        if (btn) {
            btn.classList.toggle('muted', !soundEnabled);
            btn.classList.toggle('active', !soundEnabled);
            btn.setAttribute('aria-pressed', soundEnabled ? 'false' : 'true');
            btn.title = soundEnabled ? 'Couper le son de page (M)' : 'Activer le son de page (M)';
        }
        toast(soundEnabled ? 'Son activé 🔊' : 'Son coupé 🔇');
    };

    window.toggleFullscreen = async () => {
        const app = document.getElementById('app');
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            if (app) {
                const on = app.classList.toggle('immersive');
                app.classList.toggle('is-fs', on);
                toast(on ? 'Plein écran immersif activé.' : 'Mode immersif désactivé.');
            }
        }
    };
    document.addEventListener('fullscreenchange', () => {
        const isFS = !!document.fullscreenElement;
        const app = document.getElementById('app');
        if (app) app.classList.toggle('is-fs', isFS);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
    });

    function buildThumbs() {
        const strip = document.getElementById('strip');
        if (!strip) return;
        strip.innerHTML = '';
        BOOK.pages.forEach((page, idx) => {
            const pNum = page.pageNumber || (idx + 1);
            const pad3 = String(pNum).padStart(3, '0');
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'thumb';
            b.dataset.page = pNum;
            b.setAttribute('aria-label', `Aller à la page ${pNum}`);

            const tpg = document.createElement('span');
            tpg.className = 'tpg';
            const img = document.createElement('img');
            const primaryThumb = page.thumbPath ? asset(page.thumbPath) : (page.imagePath ? asset(page.imagePath) : asset(`public/pages/thumbs/page-${pad3}.webp`));
            img.src = primaryThumb;
            img.alt = `Miniature ${pNum}`;
            img.loading = 'lazy';
            img.onerror = () => {
                img.src = page.imagePath ? asset(page.imagePath) : asset(`public/pages/page-${pad3}.webp`);
            };
            tpg.appendChild(img);

            const tn = document.createElement('span');
            tn.className = 'tn';
            tn.textContent = pNum;

            b.appendChild(tpg);
            b.appendChild(tn);
            b.addEventListener('click', () => {
                window.goToPage(pNum);
            });
            strip.appendChild(b);
        });
    }

    window.toggleToc = function () {
        const toc = document.getElementById('toc');
        const tocBtn = document.getElementById('tocBtn');
        if (!toc) return;
        const isOpen = toc.classList.toggle('open');
        if (tocBtn) tocBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (isOpen) {
            updateUI();
        }
    };
    window.openThumbDrawer = window.toggleToc;
    window.closeThumbDrawer = () => {
        const toc = document.getElementById('toc');
        const tocBtn = document.getElementById('tocBtn');
        if (toc) toc.classList.remove('open');
        if (tocBtn) tocBtn.setAttribute('aria-expanded', 'false');
    };

    let toastTimer = null;
    function toast(msg) {
        const t = document.getElementById('toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
    }
    window.toast = toast;

    const COLORS = [
        ['#17143F', 'Encre'],
        ['#0ea5e9', 'Bleu ciel'],
        ['#7B6DFF', 'Violet'],
        ['#FF3D81', 'Rose'],
        ['#12A37A', 'Vert'],
        ['#FFD84D', 'Ambre'],
        ['#FFFFFF', 'Blanc'],
    ];

    function buildColors() {
        const colorsEl = document.getElementById('colors');
        if (!colorsEl) return;
        colorsEl.innerHTML = '';
        COLORS.forEach(([hex, name]) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'sw';
            b.style.background = hex;
            b.title = name;
            b.setAttribute('aria-label', name);
            b.setAttribute('aria-pressed', hex.toLowerCase() === currentAnnotColor.toLowerCase() ? 'true' : 'false');
            b.addEventListener('click', () => {
                currentAnnotColor = hex;
                [...colorsEl.children].forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
            });
            colorsEl.appendChild(b);
        });

        const defSz = document.querySelector(`#sizes .sz[data-size="${currentAnnotSize}"]`);
        if (defSz) {
            document.querySelectorAll('#sizes .sz').forEach(b => b.setAttribute('aria-pressed', b === defSz ? 'true' : 'false'));
        }
    }

    window.setDrawingSize = function (size, el) {
        currentAnnotSize = size;
        document.querySelectorAll('#sizes .sz').forEach(b => b.setAttribute('aria-pressed', b === el ? 'true' : 'false'));
    };

    const pageUndoStacks = {};

    function saveAnnotUndoState(pNum) {
        if (!pNum) return;
        if (!pageUndoStacks[pNum]) pageUndoStacks[pNum] = [];
        const pCanvas = document.querySelector(`.page-annot-canvas[data-page="${pNum}"]`);
        if (pCanvas && pCanvas.width > 0 && pCanvas.height > 0) {
            pageUndoStacks[pNum].push(pCanvas.toDataURL());
            if (pageUndoStacks[pNum].length > 25) pageUndoStacks[pNum].shift();
        }
    }

    window.undoLastStroke = function () {
        const pNum = (modalEl && modalEl.classList.contains('open') && activeModalPageNum) ? activeModalPageNum : currentPage;
        const stack = pageUndoStacks[pNum];
        if (stack && stack.length > 0) {
            const prevData = stack.pop();
            const pCanvas = document.querySelector(`.page-annot-canvas[data-page="${pNum}"]`);
            if (pCanvas) {
                const ctx = pCanvas.getContext('2d');
                ctx.clearRect(0, 0, pCanvas.width, pCanvas.height);
                if (prevData) {
                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, pCanvas.width, pCanvas.height);
                        pageDrawingsCache[pNum] = prevData;
                        if (modalEl && modalEl.classList.contains('open') && activeModalPageNum === pNum) {
                            initModalAnnotCanvas();
                        }
                    };
                    img.src = prevData;
                } else {
                    delete pageDrawingsCache[pNum];
                    if (modalEl && modalEl.classList.contains('open') && activeModalPageNum === pNum) {
                        initModalAnnotCanvas();
                    }
                }
                toast('Dernier trait annulé.');
                return;
            }
        }
        toast('Rien à annuler.');
    };

    let activeModalPageNum = null;
    let activeModalZoneRect = { x: 0, y: 0, width: 100, height: 100 };
    let activeModalInter = null;

    function initModalAnnotCanvas() {
        const modalAnnotCanvas = document.getElementById('modal-annot-canvas');
        if (!modalAnnotCanvas || !activeModalPageNum) return;
        const img = document.getElementById('modal-img');
        if (!img) return;

        const w = img.clientWidth || img.naturalWidth || 800;
        const h = img.clientHeight || img.naturalHeight || 600;
        const dpr = window.devicePixelRatio || 1;
        modalAnnotCanvas.width = Math.round(w * dpr);
        modalAnnotCanvas.height = Math.round(h * dpr);

        const mCtx = modalAnnotCanvas.getContext('2d');
        mCtx.clearRect(0, 0, modalAnnotCanvas.width, modalAnnotCanvas.height);

        const pCanvas = document.querySelector(`.page-annot-canvas[data-page="${activeModalPageNum}"]`);
        if (pCanvas && pCanvas.width > 0 && pCanvas.height > 0) {
            const sx = Math.round(pCanvas.width * (activeModalZoneRect.x / 100));
            const sy = Math.round(pCanvas.height * (activeModalZoneRect.y / 100));
            const sw = Math.round(pCanvas.width * (activeModalZoneRect.width / 100));
            const sh = Math.round(pCanvas.height * (activeModalZoneRect.height / 100));
            if (sw > 0 && sh > 0) {
                mCtx.drawImage(pCanvas, sx, sy, sw, sh, 0, 0, modalAnnotCanvas.width, modalAnnotCanvas.height);
            }
        } else if (pageDrawingsCache[activeModalPageNum]) {
            const tempImg = new Image();
            tempImg.onload = () => {
                const sx = Math.round(tempImg.naturalWidth * (activeModalZoneRect.x / 100));
                const sy = Math.round(tempImg.naturalHeight * (activeModalZoneRect.y / 100));
                const sw = Math.round(tempImg.naturalWidth * (activeModalZoneRect.width / 100));
                const sh = Math.round(tempImg.naturalHeight * (activeModalZoneRect.height / 100));
                if (sw > 0 && sh > 0) {
                    mCtx.drawImage(tempImg, sx, sy, sw, sh, 0, 0, modalAnnotCanvas.width, modalAnnotCanvas.height);
                }
            };
            tempImg.src = pageDrawingsCache[activeModalPageNum];
        }
    }

    let isModalAnnotDrawing = false;
    let modalAnnotStartX = 0, modalAnnotStartY = 0, modalAnnotLastX = 0, modalAnnotLastY = 0;
    let modalAnnotLastTime = 0;

    function setupModalAnnotListeners() {
        const canvas = document.getElementById('modal-annot-canvas');
        if (!canvas || canvas.dataset.initialized) return;
        canvas.dataset.initialized = 'true';
        const ctx = canvas.getContext('2d');

        function getCoords(e) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
                scaleRatio: scaleX
            };
        }

        canvas.addEventListener('pointerdown', (e) => {
            if (!['pen', 'eraser', 'brush', 'calligraphy'].includes(activeViewerTool)) return;
            e.preventDefault();
            e.stopPropagation();
            try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
            if (activeModalPageNum) {
                saveAnnotUndoState(activeModalPageNum);
            }
            isModalAnnotDrawing = true;
            const { x, y, scaleRatio } = getCoords(e);
            modalAnnotStartX = x;
            modalAnnotStartY = y;
            modalAnnotLastX = x;
            modalAnnotLastY = y;
            modalAnnotLastTime = performance.now();

            if (activeViewerTool === 'pen' || activeViewerTool === 'brush') {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = currentAnnotColor || '#17143F';
                ctx.fillStyle = currentAnnotColor || '#17143F';
                const penWidth = activeViewerTool === 'brush' ? (currentAnnotSize * scaleRatio * 3) : (currentAnnotSize * scaleRatio);
                ctx.lineWidth = penWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                if (activeViewerTool === 'brush') ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.arc(x, y, penWidth / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            } else if (activeViewerTool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                const eraserSize = Math.max(16, (currentAnnotSize || 5) * 4) * scaleRatio;
                ctx.beginPath();
                ctx.arc(x, y, eraserSize / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (activeViewerTool === 'calligraphy') {
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = currentAnnotColor || '#17143F';
                let pMod = 1.0;
                if (typeof e.pressure === 'number' && e.pressure > 0.02 && e.pressure !== 0.5) {
                    pMod = 0.45 + e.pressure * 1.1;
                }
                const baseW = (currentAnnotSize || 5) * scaleRatio * 2.4 * pMod;
                modalAnnotLastW = baseW;
                ctx.beginPath();
                ctx.ellipse(x, y, Math.max(1, baseW / 2), Math.max(0.8, baseW / 7), CALLIGRAPHY_NIB_ANGLE, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        canvas.addEventListener('pointermove', (e) => {
            if (!isModalAnnotDrawing) return;
            e.preventDefault();
            e.stopPropagation();
            const { x, y, scaleRatio } = getCoords(e);

            if (activeViewerTool === 'pen' || activeViewerTool === 'brush') {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = currentAnnotColor || '#17143F';
                ctx.lineWidth = activeViewerTool === 'brush' ? (currentAnnotSize * scaleRatio * 3) : (currentAnnotSize * scaleRatio);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                if (activeViewerTool === 'brush') ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.moveTo(modalAnnotLastX, modalAnnotLastY);
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
                modalAnnotLastX = x;
                modalAnnotLastY = y;
            } else if (activeViewerTool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                const eraserSize = Math.max(16, (currentAnnotSize || 5) * 4) * scaleRatio;
                ctx.lineWidth = eraserSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(modalAnnotLastX, modalAnnotLastY);
                ctx.lineTo(x, y);
                ctx.stroke();
                modalAnnotLastX = x;
                modalAnnotLastY = y;
            } else if (activeViewerTool === 'calligraphy') {
                const now = performance.now();
                const dt = Math.max(1, now - modalAnnotLastTime);
                const rawDist = Math.hypot(x - modalAnnotLastX, y - modalAnnotLastY);
                if (rawDist < 0.5) return;

                const smoothX = modalAnnotLastX + (x - modalAnnotLastX) * 0.72;
                const smoothY = modalAnnotLastY + (y - modalAnnotLastY) * 0.72;

                let pMod = 1.0;
                if (typeof e.pressure === 'number' && e.pressure > 0.02 && e.pressure !== 0.5) {
                    pMod = 0.45 + e.pressure * 1.1;
                } else {
                    const speed = rawDist / dt;
                    pMod = Math.max(0.65, Math.min(1.4, 1.25 - speed * 0.08));
                }

                const targetW = (currentAnnotSize || 5) * scaleRatio * 2.4 * pMod;
                const dist = Math.hypot(smoothX - modalAnnotLastX, smoothY - modalAnnotLastY);
                const steps = Math.max(1, Math.ceil(dist / 1.5));

                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = currentAnnotColor || '#17143F';

                for (let i = 1; i <= steps; i++) {
                    const t = i / steps;
                    const ix = modalAnnotLastX + (smoothX - modalAnnotLastX) * t;
                    const iy = modalAnnotLastY + (smoothY - modalAnnotLastY) * t;
                    const iw = modalAnnotLastW + (targetW - modalAnnotLastW) * t;
                    ctx.beginPath();
                    ctx.ellipse(ix, iy, Math.max(1, iw / 2), Math.max(0.8, iw / 7), CALLIGRAPHY_NIB_ANGLE, 0, Math.PI * 2);
                    ctx.fill();
                }

                modalAnnotLastX = smoothX;
                modalAnnotLastY = smoothY;
                modalAnnotLastW = targetW;
                modalAnnotLastTime = now;
            }
        });

        const finishModalDrawing = (e) => {
            if (!isModalAnnotDrawing) return;
            isModalAnnotDrawing = false;
            try { if (e && e.pointerId) canvas.releasePointerCapture(e.pointerId); } catch (err) { }
            syncModalAnnotToPage();
        };

        canvas.addEventListener('pointerup', finishModalDrawing);
        canvas.addEventListener('pointercancel', finishModalDrawing);
    }

    function syncModalAnnotToPage() {
        if (!activeModalPageNum) return;
        const modalAnnotCanvas = document.getElementById('modal-annot-canvas');
        if (!modalAnnotCanvas) return;
        const pCanvas = document.querySelector(`.page-annot-canvas[data-page="${activeModalPageNum}"]`);
        if (!pCanvas) return;
        const pCtx = pCanvas.getContext('2d');

        const dx = Math.round(pCanvas.width * (activeModalZoneRect.x / 100));
        const dy = Math.round(pCanvas.height * (activeModalZoneRect.y / 100));
        const dw = Math.round(pCanvas.width * (activeModalZoneRect.width / 100));
        const dh = Math.round(pCanvas.height * (activeModalZoneRect.height / 100));

        pCtx.save();
        if (activeModalZoneRect.width < 99 || activeModalZoneRect.height < 99) {
            pCtx.clearRect(dx, dy, dw, dh);
            pCtx.drawImage(modalAnnotCanvas, 0, 0, modalAnnotCanvas.width, modalAnnotCanvas.height, dx, dy, dw, dh);
        } else {
            pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
            pCtx.drawImage(modalAnnotCanvas, 0, 0, pCanvas.width, pCanvas.height);
        }
        pCtx.restore();

        pageDrawingsCache[activeModalPageNum] = pCanvas.toDataURL();
    }

    let isModalDraggingArrow = false;
    let modalArrowStart = null;

    function renderModalArrows() {
        const modalArrowSvg = document.getElementById('modal-arrow-svg');
        if (!modalArrowSvg || !activeModalPageNum) return;
        const rendersGroup = modalArrowSvg.querySelector('.modal-arrow-renders-layer');
        if (!rendersGroup) return;
        rendersGroup.innerHTML = '';

        const arrows = pageStudentArrows[activeModalPageNum] || [];
        const evals = pageArrowEvaluations[activeModalPageNum] || [];
        const evalMap = {};
        evals.forEach(ev => {
            if (ev.studentArrow && ev.studentArrow.id) evalMap[ev.studentArrow.id] = ev;
        });

        arrows.forEach(arrow => {
            const smx = ((arrow.startX - activeModalZoneRect.x) / activeModalZoneRect.width) * 100;
            const smy = ((arrow.startY - activeModalZoneRect.y) / activeModalZoneRect.height) * 100;
            const emx = ((arrow.endX - activeModalZoneRect.x) / activeModalZoneRect.width) * 100;
            const emy = ((arrow.endY - activeModalZoneRect.y) / activeModalZoneRect.height) * 100;

            const ev = evalMap[arrow.id];
            let strokeColor = '#6366f1';
            let markerId = 'arrowhead-modal-student';
            let animClass = '';
            if (ev) {
                if (ev.status === 'correct') {
                    strokeColor = '#22c55e';
                    markerId = 'arrowhead-modal-correct';
                    animClass = 'arrow-correct';
                } else if (ev.status === 'incorrect') {
                    strokeColor = '#ef4444';
                    markerId = 'arrowhead-modal-incorrect';
                    animClass = 'arrow-incorrect';
                }
            }

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', `${smx}%`);
            line.setAttribute('y1', `${smy}%`);
            line.setAttribute('x2', `${emx}%`);
            line.setAttribute('y2', `${emy}%`);
            line.setAttribute('stroke', strokeColor);
            line.setAttribute('stroke-width', '3');
            line.setAttribute('marker-end', `url(#${markerId})`);
            line.setAttribute('stroke-linecap', 'round');
            if (animClass) line.setAttribute('class', animClass);
            rendersGroup.appendChild(line);
        });
    }

    function setupModalArrowListeners() {
        const modalArrowSvg = document.getElementById('modal-arrow-svg');
        if (!modalArrowSvg || modalArrowSvg.dataset.initialized) return;
        modalArrowSvg.dataset.initialized = 'true';
        const draftGroup = modalArrowSvg.querySelector('.modal-arrow-draft-layer');

        function getModalRel(e) {
            const rect = modalArrowSvg.getBoundingClientRect();
            return {
                x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
                y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
            };
        }

        modalArrowSvg.addEventListener('pointerdown', (e) => {
            if (activeViewerTool !== 'arrow') return;
            e.preventDefault();
            e.stopPropagation();
            try { modalArrowSvg.setPointerCapture(e.pointerId); } catch (err) { }
            isModalDraggingArrow = true;
            modalArrowStart = getModalRel(e);
        });

        modalArrowSvg.addEventListener('pointermove', (e) => {
            if (!isModalDraggingArrow || !modalArrowStart || !draftGroup) return;
            e.preventDefault();
            e.stopPropagation();
            const cur = getModalRel(e);
            draftGroup.innerHTML = `
              <line x1="${modalArrowStart.x * 100}%" y1="${modalArrowStart.y * 100}%"
                    x2="${cur.x * 100}%" y2="${cur.y * 100}%"
                    stroke="#3b82f6" stroke-width="3" stroke-dasharray="5,4"
                    marker-end="url(#arrowhead-modal-draft)" stroke-linecap="round"/>
            `;
        });

        const finishModalArrow = (e) => {
            if (!isModalDraggingArrow || !modalArrowStart) return;
            isModalDraggingArrow = false;
            if (draftGroup) draftGroup.innerHTML = '';
            const end = getModalRel(e);
            const dist = Math.hypot(end.x - modalArrowStart.x, end.y - modalArrowStart.y);
            if (dist >= 0.02 && activeModalPageNum) {
                const pageStartX = activeModalZoneRect.x + modalArrowStart.x * activeModalZoneRect.width;
                const pageStartY = activeModalZoneRect.y + modalArrowStart.y * activeModalZoneRect.height;
                const pageEndX = activeModalZoneRect.x + end.x * activeModalZoneRect.width;
                const pageEndY = activeModalZoneRect.y + end.y * activeModalZoneRect.height;

                if (!pageStudentArrows[activeModalPageNum]) pageStudentArrows[activeModalPageNum] = [];
                delete pageArrowEvaluations[activeModalPageNum];
                pageStudentArrows[activeModalPageNum].push({
                    id: 'student_arrow_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                    startX: pageStartX,
                    startY: pageStartY,
                    endX: pageEndX,
                    endY: pageEndY
                });
                renderPageArrows(activeModalPageNum);
                renderModalArrows();
                toast('Flèche tracée.');
            }
            modalArrowStart = null;
        };

        modalArrowSvg.addEventListener('pointerup', finishModalArrow);
        modalArrowSvg.addEventListener('pointercancel', finishModalArrow);
    }

    function setupModalInteractiveLayers() {
        const modalOverlay = document.getElementById('modal-overlay');
        if (!modalOverlay || !activeModalPageNum) return;
        modalOverlay.innerHTML = '';

        const pageContainer = document.querySelector(`.page-item[data-page="${activeModalPageNum}"]`);
        if (!pageContainer) return;
        const pageOverlay = pageContainer.querySelector('.page-overlay');
        if (!pageOverlay) return;

        const zx1 = activeModalZoneRect.x;
        const zy1 = activeModalZoneRect.y;
        const zx2 = zx1 + activeModalZoneRect.width;
        const zy2 = zy1 + activeModalZoneRect.height;

        function getPct(val, def) {
            if (val == null) return def;
            const n = parseFloat(String(val).replace('%', ''));
            return isNaN(n) ? def : n;
        }

        // 1. Color-the-correct drawings (widget-drawing-zone)
        pageOverlay.querySelectorAll('.widget-drawing-zone').forEach(pageDrawing => {
            const left = getPct(pageDrawing.style.left, 0);
            const top = getPct(pageDrawing.style.top, 0);
            const width = getPct(pageDrawing.style.width, 20);
            const height = getPct(pageDrawing.style.height, 20);

            if (left + width < zx1 || left > zx2 || top + height < zy1 || top > zy2) return;

            const mLeft = ((left - zx1) / activeModalZoneRect.width) * 100;
            const mTop = ((top - zy1) / activeModalZoneRect.height) * 100;
            const mWidth = (width / activeModalZoneRect.width) * 100;
            const mHeight = (height / activeModalZoneRect.height) * 100;

            const mZone = document.createElement('div');
            mZone.className = pageDrawing.className;
            mZone.style.left = `${mLeft}%`;
            mZone.style.top = `${mTop}%`;
            mZone.style.width = `${mWidth}%`;
            mZone.style.height = `${mHeight}%`;
            mZone.dataset.drawingId = pageDrawing.dataset.drawingId || '';
            mZone.dataset.page = String(activeModalPageNum);
            mZone.dataset.isCorrect = pageDrawing.dataset.isCorrect || '';
            mZone.dataset.contourMask = pageDrawing.dataset.contourMask || '';
            mZone.title = pageDrawing.title || '';

            const pageCanvas = pageDrawing.querySelector('.drawing-fill-canvas');
            if (pageCanvas) {
                const mFillCanvas = document.createElement('canvas');
                mFillCanvas.className = pageCanvas.className;
                mFillCanvas.width = pageCanvas.width;
                mFillCanvas.height = pageCanvas.height;
                const mCtx = mFillCanvas.getContext('2d');
                mCtx.drawImage(pageCanvas, 0, 0);
                mZone.appendChild(mFillCanvas);
            }

            mZone.addEventListener('click', (e) => {
                if (activeViewerTool !== 'bucket') return;
                e.stopPropagation();
                pageDrawing.click();
                setTimeout(() => {
                    const updatedPageCanvas = pageDrawing.querySelector('.drawing-fill-canvas');
                    let curMCanvas = mZone.querySelector('.drawing-fill-canvas');
                    if (updatedPageCanvas) {
                        if (!curMCanvas) {
                            curMCanvas = document.createElement('canvas');
                            curMCanvas.className = updatedPageCanvas.className;
                            mZone.appendChild(curMCanvas);
                        }
                        curMCanvas.width = updatedPageCanvas.width;
                        curMCanvas.height = updatedPageCanvas.height;
                        const ctx = curMCanvas.getContext('2d');
                        ctx.drawImage(updatedPageCanvas, 0, 0);
                    }
                    mZone.className = pageDrawing.className;
                }, 50);
            });

            modalOverlay.appendChild(mZone);
        });

        // 2. Free coloring zones (widget-free-coloring-zone)
        pageOverlay.querySelectorAll('.widget-free-coloring-zone').forEach(pageFree => {
            const left = getPct(pageFree.style.left, 0);
            const top = getPct(pageFree.style.top, 0);
            const width = getPct(pageFree.style.width, 30);
            const height = getPct(pageFree.style.height, 30);

            if (left + width < zx1 || left > zx2 || top + height < zy1 || top > zy2) return;

            const mLeft = ((left - zx1) / activeModalZoneRect.width) * 100;
            const mTop = ((top - zy1) / activeModalZoneRect.height) * 100;
            const mWidth = (width / activeModalZoneRect.width) * 100;
            const mHeight = (height / activeModalZoneRect.height) * 100;

            const mFree = pageFree.cloneNode(true);
            mFree.style.left = `${mLeft}%`;
            mFree.style.top = `${mTop}%`;
            mFree.style.width = `${mWidth}%`;
            mFree.style.height = `${mHeight}%`;

            mFree.querySelectorAll('path').forEach((p, idx) => {
                p.addEventListener('click', (e) => {
                    if (activeViewerTool !== 'bucket') return;
                    e.stopPropagation();
                    const pagePaths = pageFree.querySelectorAll('path');
                    if (pagePaths[idx]) pagePaths[idx].dispatchEvent(new MouseEvent('click', { bubbles: true }));
                    p.setAttribute('fill', currentBucketColor);
                    p.setAttribute('fill-opacity', '0.72');
                });
            });
            modalOverlay.appendChild(mFree);
        });

        // 3. Fill-in-the-blank inputs (widget-fill-blank)
        pageOverlay.querySelectorAll('.widget-fill-blank').forEach(pageWrap => {
            const left = getPct(pageWrap.style.left, 0);
            const top = getPct(pageWrap.style.top, 0);
            const width = getPct(pageWrap.style.width, 15);
            const height = getPct(pageWrap.style.height, 5);

            if (left + width < zx1 || left > zx2 || top + height < zy1 || top > zy2) return;

            const mLeft = ((left - zx1) / activeModalZoneRect.width) * 100;
            const mTop = ((top - zy1) / activeModalZoneRect.height) * 100;
            const mWidth = (width / activeModalZoneRect.width) * 100;
            const mHeight = (height / activeModalZoneRect.height) * 100;

            const mWrap = document.createElement('div');
            mWrap.className = pageWrap.className;
            mWrap.style.left = `${mLeft}%`;
            mWrap.style.top = `${mTop}%`;
            mWrap.style.width = `${mWidth}%`;
            mWrap.style.height = `${mHeight}%`;

            const pageInp = pageWrap.querySelector('input');
            if (pageInp) {
                const mInp = document.createElement('input');
                mInp.type = 'text';
                mInp.className = pageInp.className;
                mInp.placeholder = pageInp.placeholder;
                mInp.value = pageInp.value;
                mInp.addEventListener('click', e => e.stopPropagation());
                mInp.addEventListener('input', () => {
                    pageInp.value = mInp.value;
                });
                mInp.addEventListener('keydown', (e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                        if (window.FBEngine && window.FBEngine.checkOne) {
                            window.FBEngine.checkOne(pageInp);
                            mInp.className = pageInp.className;
                        }
                    }
                });
                mWrap.appendChild(mInp);
            }
            modalOverlay.appendChild(mWrap);
        });

        // 4. Checkboxes (widget-checkbox)
        pageOverlay.querySelectorAll('.widget-checkbox').forEach(pageChk => {
            const left = getPct(pageChk.style.left, 0);
            const top = getPct(pageChk.style.top, 0);
            const width = getPct(pageChk.style.width, 5);
            const height = getPct(pageChk.style.height, 5);

            if (left + width < zx1 || left > zx2 || top + height < zy1 || top > zy2) return;

            const mLeft = ((left - zx1) / activeModalZoneRect.width) * 100;
            const mTop = ((top - zy1) / activeModalZoneRect.height) * 100;
            const mWidth = (width / activeModalZoneRect.width) * 100;
            const mHeight = (height / activeModalZoneRect.height) * 100;

            const mChk = pageChk.cloneNode(true);
            mChk.style.left = `${mLeft}%`;
            mChk.style.top = `${mTop}%`;
            mChk.style.width = `${mWidth}%`;
            mChk.style.height = `${mHeight}%`;

            mChk.addEventListener('click', (e) => {
                e.stopPropagation();
                pageChk.click();
                const pageInput = pageChk.querySelector('input[type="checkbox"]');
                const mInput = mChk.querySelector('input[type="checkbox"]');
                if (pageInput && mInput) mInput.checked = pageInput.checked;
                mChk.className = pageChk.className;
            });
            modalOverlay.appendChild(mChk);
        });

        // 5. Choice zones (widget-choice-zone)
        pageOverlay.querySelectorAll('.widget-choice-zone').forEach(pageChoice => {
            const left = getPct(pageChoice.style.left, 0);
            const top = getPct(pageChoice.style.top, 0);
            const width = getPct(pageChoice.style.width, 25);
            const height = getPct(pageChoice.style.height, 6);

            if (left + width < zx1 || left > zx2 || top + height < zy1 || top > zy2) return;

            const mLeft = ((left - zx1) / activeModalZoneRect.width) * 100;
            const mTop = ((top - zy1) / activeModalZoneRect.height) * 100;
            const mWidth = (width / activeModalZoneRect.width) * 100;
            const mHeight = (height / activeModalZoneRect.height) * 100;

            const mChoice = pageChoice.cloneNode(true);
            mChoice.style.left = `${mLeft}%`;
            mChoice.style.top = `${mTop}%`;
            mChoice.style.width = `${mWidth}%`;
            mChoice.style.height = `${mHeight}%`;

            mChoice.addEventListener('click', (e) => {
                e.stopPropagation();
                pageChoice.click();
                mChoice.className = pageChoice.className;
                const pageBadge = pageChoice.querySelector('.choice-badge-indicator');
                const mBadge = mChoice.querySelector('.choice-badge-indicator');
                if (pageBadge && mBadge) {
                    mBadge.className = pageBadge.className;
                    mBadge.textContent = pageBadge.textContent;
                }
            });
            modalOverlay.appendChild(mChoice);
        });

        // 6. Circle zones (widget-circle-zone)
        pageOverlay.querySelectorAll('.widget-circle-zone').forEach(pageCircle => {
            const left = getPct(pageCircle.style.left, 0);
            const top = getPct(pageCircle.style.top, 0);
            const width = getPct(pageCircle.style.width, 25);
            const height = getPct(pageCircle.style.height, 6);

            if (left + width < zx1 || left > zx2 || top + height < zy1 || top > zy2) return;

            const mLeft = ((left - zx1) / activeModalZoneRect.width) * 100;
            const mTop = ((top - zy1) / activeModalZoneRect.height) * 100;
            const mWidth = (width / activeModalZoneRect.width) * 100;
            const mHeight = (height / activeModalZoneRect.height) * 100;

            const mCircle = pageCircle.cloneNode(true);
            mCircle.style.left = `${mLeft}%`;
            mCircle.style.top = `${mTop}%`;
            mCircle.style.width = `${mWidth}%`;
            mCircle.style.height = `${mHeight}%`;

            mCircle.addEventListener('click', (e) => {
                e.stopPropagation();
                if (activeViewerTool !== 'circle') return;
                pageCircle.click();
                mCircle.className = pageCircle.className;
                mCircle.innerHTML = pageCircle.innerHTML;
            });
            modalOverlay.appendChild(mCircle);
        });
    }

    function updateModalToolMode() {
        const vp = document.getElementById('modal-viewport');
        const mCanvas = document.getElementById('modal-annot-canvas');
        const mArrow = document.getElementById('modal-arrow-svg');
        const mOverlay = document.getElementById('modal-overlay');
        if (!vp || !modalEl || !modalEl.classList.contains('open')) return;

        if (activeViewerTool === 'pen' || activeViewerTool === 'eraser') {
            if (mCanvas) mCanvas.style.pointerEvents = 'auto';
            if (mArrow) mArrow.style.pointerEvents = 'none';
            if (mOverlay) mOverlay.style.pointerEvents = 'none';
            vp.style.cursor = 'crosshair';
        } else if (activeViewerTool === 'arrow') {
            if (mCanvas) mCanvas.style.pointerEvents = 'none';
            if (mArrow) mArrow.style.pointerEvents = 'auto';
            if (mOverlay) mOverlay.style.pointerEvents = 'none';
            vp.style.cursor = 'crosshair';
        } else if (activeViewerTool === 'bucket') {
            if (mCanvas) mCanvas.style.pointerEvents = 'none';
            if (mArrow) mArrow.style.pointerEvents = 'none';
            if (mOverlay) mOverlay.style.pointerEvents = 'auto';
            vp.style.cursor = 'crosshair';
        } else if (activeViewerTool === 'circle') {
            if (mCanvas) mCanvas.style.pointerEvents = 'none';
            if (mArrow) mArrow.style.pointerEvents = 'none';
            if (mOverlay) mOverlay.style.pointerEvents = 'auto';
            vp.style.cursor = 'crosshair';
        } else {
            if (mCanvas) mCanvas.style.pointerEvents = 'none';
            if (mArrow) mArrow.style.pointerEvents = 'none';
            if (mOverlay) mOverlay.style.pointerEvents = 'none';
            vp.style.cursor = modalZoom > 1 ? 'grab' : 'zoom-in';
        }
    }

    function openModal(src, alt, pNum, zoneRect, inter) {
        stopAllAudio();
        viewerWrap.classList.add('modal-active');
        activeModalPageNum = (pNum != null) ? pNum : currentPage;
        activeModalZoneRect = zoneRect || { x: 0, y: 0, width: 100, height: 100 };
        activeModalInter = inter || null;

        modalEl.setAttribute('aria-label', alt || 'Zoom HD');
        const titleEl = document.getElementById('zoom-modal-title');
        if (titleEl) {
            titleEl.innerHTML = `<span style="color:var(--brand);margin-right:6px">🔍</span>${escapeHtml(alt || 'Zoom Haute Définition')}`;
        }

        const isCroppedSubzone = activeModalZoneRect.width < 99 || activeModalZoneRect.height < 99;
        const hasCustomHires = inter && (inter.hiresSrc || inter.imageSrc);

        const onImageReady = () => {
            initModalAnnotCanvas();
            setupModalAnnotListeners();
            renderModalArrows();
            setupModalArrowListeners();
            setupModalInteractiveLayers();
            updateModalToolMode();
            resetZoom();
        };

        if (isCroppedSubzone && !hasCustomHires) {
            const pageImgEl = document.querySelector(`.page-item[data-page="${activeModalPageNum}"] .page-img`);
            if (pageImgEl && (pageImgEl.naturalWidth || pageImgEl.width)) {
                const nw = pageImgEl.naturalWidth || pageImgEl.width;
                const nh = pageImgEl.naturalHeight || pageImgEl.height;
                const sx = Math.round(nw * (activeModalZoneRect.x / 100));
                const sy = Math.round(nh * (activeModalZoneRect.y / 100));
                const sw = Math.round(nw * (activeModalZoneRect.width / 100));
                const sh = Math.round(nh * (activeModalZoneRect.height / 100));
                const cropCanvas = document.createElement('canvas');
                cropCanvas.width = sw;
                cropCanvas.height = sh;
                const ctx = cropCanvas.getContext('2d');
                ctx.drawImage(pageImgEl, sx, sy, sw, sh, 0, 0, sw, sh);
                modalImg.src = cropCanvas.toDataURL();
            } else {
                modalImg.src = src;
            }
        } else {
            modalImg.src = src;
        }

        modalImg.alt = alt || 'Zoom HD';

        if (modalImg.complete && modalImg.naturalWidth) {
            setTimeout(onImageReady, 20);
        } else {
            modalImg.onload = () => {
                setTimeout(onImageReady, 20);
            };
        }

        modalEl.classList.add('open');
        document.body.classList.add('modal-open');
        const closeBtn = modalEl.querySelector('.modal-close-btn');
        if (closeBtn) closeBtn.focus();
    }

    function closeModal() {
        stopAllAudio();
        syncModalAnnotToPage();
        modalEl.classList.remove('open');
        document.body.classList.remove('modal-open');
        viewerWrap.classList.remove('modal-active');
        activeModalPageNum = null;
        activeModalZoneRect = { x: 0, y: 0, width: 100, height: 100 };
        activeModalInter = null;
        modalImg.src = '';
        const mOverlay = document.getElementById('modal-overlay');
        if (mOverlay) mOverlay.innerHTML = '';
        const mArrowG = document.querySelector('#modal-arrow-svg .modal-arrow-renders-layer');
        if (mArrowG) mArrowG.innerHTML = '';
        const mDraftG = document.querySelector('#modal-arrow-svg .modal-arrow-draft-layer');
        if (mDraftG) mDraftG.innerHTML = '';
    }
    window.openModal = openModal;
    window.closeModal = closeModal;

    function getYouTubeEmbedUrl(url) {
        if (!url || typeof url !== 'string') return null;
        const regExp = /(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(regExp);
        if (match && match[1]) {
            return `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&rel=0&modestbranding=1`;
        }
        return null;
    }

    function openVideoModal(url, title) {
        stopAllAudio();
        const modal = document.getElementById('video-modal');
        const iframe = document.getElementById('video-modal-iframe');
        const titleEl = document.getElementById('video-modal-title');
        const ytBtn = document.getElementById('video-modal-yt-btn');
        const notice = document.getElementById('video-modal-notice');
        const fallbackLink = document.getElementById('video-modal-link-fallback');

        const embedUrl = getYouTubeEmbedUrl(url);
        if (!embedUrl) return;

        if (titleEl) {
            titleEl.innerHTML = `<span style="color:#ef4444;">▶</span> ${escapeHtml(title || 'Vidéo YouTube')}`;
        }
        if (ytBtn) {
            ytBtn.href = url || '#';
        }
        if (fallbackLink) {
            fallbackLink.href = url || '#';
        }
        if (notice) {
            notice.style.display = (window.location.protocol === 'file:') ? 'block' : 'none';
        }
        if (iframe) iframe.src = embedUrl;
        if (modal) modal.classList.add('open');

        // Basculer automatiquement en plein écran lors du clic
        const wrap = document.getElementById('video-modal-wrap');
        if (wrap) {
            if (wrap.requestFullscreen) {
                const p = wrap.requestFullscreen();
                if (p && typeof p.catch === 'function') p.catch(() => { });
            } else if (wrap.webkitRequestFullscreen) {
                wrap.webkitRequestFullscreen();
            }
        }
    }

    function closeVideoModal() {
        if (document.fullscreenElement) {
            const p = document.exitFullscreen?.();
            if (p && typeof p.catch === 'function') p.catch(() => { });
        } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
        const modal = document.getElementById('video-modal');
        const iframe = document.getElementById('video-modal-iframe');
        if (iframe) iframe.src = '';
        if (modal) modal.classList.remove('open');
    }

    function toggleVideoFullscreen() {
        const wrap = document.getElementById('video-modal-wrap');
        if (!wrap) return;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (wrap.requestFullscreen) {
                const p = wrap.requestFullscreen();
                if (p && typeof p.catch === 'function') p.catch(() => { });
            } else if (wrap.webkitRequestFullscreen) {
                wrap.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                const p = document.exitFullscreen();
                if (p && typeof p.catch === 'function') p.catch(() => { });
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    document.addEventListener('fullscreenchange', () => {
        const btn = document.getElementById('video-modal-fs-btn');
        if (btn) {
            btn.innerHTML = (document.fullscreenElement || document.webkitFullscreenElement) ? '🗗' : '⛶';
            btn.title = (document.fullscreenElement || document.webkitFullscreenElement) ? 'Quitter le plein écran' : 'Plein écran';
        }
    });

    window.openVideoModal = openVideoModal;
    window.closeVideoModal = closeVideoModal;
    window.toggleVideoFullscreen = toggleVideoFullscreen;

    function applyZoomTransform(transition) {
        const t = transition !== false ? 'transform 0.08s ease-out' : 'none';
        const vp = document.getElementById('modal-viewport') || modalImg;
        vp.style.transition = t;
        vp.style.transform =
            `scale(${modalZoom}) translate(${modalTranslate.x / modalZoom}px, ${modalTranslate.y / modalZoom}px)`;
        const zL = document.getElementById('zoom-level');
        if (zL) zL.textContent = Math.round(modalZoom * 100) + '%';
        const bOut = document.getElementById('btn-zoom-out');
        if (bOut) bOut.disabled = modalZoom <= MIN_ZOOM;
        const bIn = document.getElementById('btn-zoom-in');
        if (bIn) bIn.disabled = modalZoom >= MAX_ZOOM;
    }

    window.adjustZoom = (delta) => {
        modalZoom = parseFloat(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, modalZoom + delta)).toFixed(2));
        if (modalZoom <= 1) modalTranslate = { x: 0, y: 0 };
        applyZoomTransform();
    };

    window.resetZoom = () => {
        modalZoom = 1; modalTranslate = { x: 0, y: 0 };
        applyZoomTransform();
    };

    document.getElementById('modal-img-wrap').addEventListener('wheel', (e) => {
        e.preventDefault(); e.stopPropagation();
        const delta = -e.deltaY * 0.001 * modalZoom;
        modalZoom = parseFloat(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, modalZoom + delta)).toFixed(3));
        if (modalZoom <= 1) modalTranslate = { x: 0, y: 0 };
        applyZoomTransform(false);
    }, { passive: false });

    document.getElementById('modal-img-wrap').addEventListener('dblclick', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (modalZoom > 1) {
            window.resetZoom();
        } else {
            modalZoom = 2.2;
            applyZoomTransform(true);
        }
    });

    const modalWrapEl = document.getElementById('modal-img-wrap');
    if (modalWrapEl) {
        modalWrapEl.addEventListener('mousedown', (e) => {
            if (modalZoom <= 1 && e.button !== 1 && !e.spaceKey) return;
            if (['pen', 'eraser', 'arrow', 'bucket'].includes(activeViewerTool) && e.button === 0 && !e.spaceKey) return;
            e.preventDefault();
            isDragging = true;
            dragStart = { x: e.clientX, y: e.clientY };
            translateAtDrag = { ...modalTranslate };
            const vp = document.getElementById('modal-viewport') || modalImg;
            vp.style.cursor = 'grabbing';
        });
    }

    window.addEventListener('mousemove', (e) => {
        if (!isDragging || !dragStart) return;
        modalTranslate = {
            x: translateAtDrag.x + (e.clientX - dragStart.x),
            y: translateAtDrag.y + (e.clientY - dragStart.y),
        };
        applyZoomTransform(false);
    });
    window.addEventListener('mouseup', () => {
        isDragging = false; dragStart = null;
        updateModalToolMode();
    });

    document.getElementById('modal-img-wrap').addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            const [t1, t2] = [e.touches[0], e.touches[1]];
            pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            pinchStartZoom = modalZoom;
        }
    }, { passive: true });
    document.getElementById('modal-img-wrap').addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && pinchStartDist !== null) {
            e.preventDefault();
            const [t1, t2] = [e.touches[0], e.touches[1]];
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            modalZoom = parseFloat(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStartZoom * (dist / pinchStartDist))).toFixed(3));
            if (modalZoom <= 1) modalTranslate = { x: 0, y: 0 };
            applyZoomTransform(false);
        }
    }, { passive: false });

    window.openHelp = () => document.getElementById('help-modal').classList.add('open');
    window.closeHelp = () => document.getElementById('help-modal').classList.remove('open');

    document.addEventListener('keydown', (e) => {
        const isModal = modalEl.classList.contains('open');
        const vModal = document.getElementById('video-modal');
        if (vModal && vModal.classList.contains('open')) {
            if (e.key === 'Escape') { e.stopPropagation(); closeVideoModal(); return; }
        }
        const isHelp = document.getElementById('help-modal').classList.contains('open');
        const target = e.target;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

        if (isModal) {
            switch (e.key) {
                case 'Escape': e.stopPropagation(); closeModal(); break;
                case '+': case '=': e.preventDefault(); window.adjustZoom(ZOOM_STEP); break;
                case '-': e.preventDefault(); window.adjustZoom(-ZOOM_STEP); break;
                case '0': e.preventDefault(); window.resetZoom(); break;
            }
            return;
        }
        if (isHelp) { if (e.key === 'Escape') closeHelp(); return; }
        if (thumbDrawerOpen) { if (e.key === 'Escape') closeThumbDrawer(); return; }
        if (isInput) return;

        switch (e.key) {
            case 'ArrowRight': case 'PageDown': e.preventDefault(); window.goNext(); break;
            case 'ArrowLeft': case 'PageUp': e.preventDefault(); window.goPrev(); break;
            case 'Home': e.preventDefault(); window.goFirst(); break;
            case 'End': e.preventDefault(); window.goLast(); break;
            case 'm': case 'M': window.toggleSound(); break;
            case 'f': case 'F': window.toggleFullscreen(); break;
            case 'p': case 'P': window.toggleViewerTool('pen'); break;
            case 'k': case 'K': window.toggleViewerTool('calligraphy'); break;
            case 'e': case 'E': window.toggleViewerTool('eraser'); break;
            case 'b': case 'B': window.toggleViewerTool('bucket'); break;
            case 'a': case 'A': window.toggleViewerTool('arrow'); break;
            case 'c': case 'C': window.toggleViewerTool('circle'); break;
            case 'z': case 'Z': window.toggleViewerTool('loupe'); break;
            case '?': window.openHelp(); break;
        }
    }, true);

    buildColors();
    buildBucketColors();
    buildThumbs();
    if (currentMode === 'slides') {
        initSlidesView();
    } else {
        initFlipbook();
    }

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (currentMode === 'slides') {
                initSlidesView();
            } else {
                initFlipbook();
            }
        }, 150);
    });
}

