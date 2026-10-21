/* ── Flipbook Studio Pro: Lightbox, Video & Import Modals ────────── */
// ── High-Fidelity Modal Lightbox with Progressive Zoom & Pan ──────────────

    let studioModalZoom = 1;

    let studioModalPan = { x: 0, y: 0 };

    let isModalDragging = false;

    let modalDragStart = null;

    let modalPanAtDrag = { x: 0, y: 0 };

    function applyModalTransform(smooth = true) {

      const img = document.getElementById('studio-modal-img');

      if (!img) return;

      img.style.transition = smooth ? 'transform 0.08s ease-out' : 'none';

      img.style.transform = `scale(${studioModalZoom}) translate(${studioModalPan.x / studioModalZoom}px, ${studioModalPan.y / studioModalZoom}px)`;

      document.getElementById('modal-zoom-pct').textContent = Math.round(studioModalZoom * 100) + '%';

      img.style.cursor = studioModalZoom > 1 ? (isModalDragging ? 'grabbing' : 'grab') : 'default';

    }

    function openStudioModal(src, title) {

      const modal = document.getElementById('studio-modal');

      const img = document.getElementById('studio-modal-img');

      const titleEl = document.getElementById('modal-title-display');

      if (titleEl) {

        titleEl.textContent = '🔍 ' + (title || 'Zoom HD');

      }

      const page = pagesData[currentPageIndex];

      const actualPdfPath = page.pdfSource || currentPdfPath;

      const actualPdfPageNum = page.pageNumber || (currentPageIndex + 1);

      const fallbackSrc = `/api/page-preview?pdf=${encodeURIComponent(actualPdfPath)}&page=${actualPdfPageNum}&scale=2.0`;

      img.onerror = () => {

        if (img.src !== fallbackSrc && !img.src.includes('page-preview')) {

          console.warn("Échec chargement image modal, chargement de l'aperçu HD.");

          img.src = fallbackSrc;

        }

      };

      img.src = src || fallbackSrc;

      studioModalZoom = 1;

      studioModalPan = { x: 0, y: 0 };

      applyModalTransform(false);

      modal.classList.add('open');

    }

    function closeStudioModal() {

      const modal = document.getElementById('studio-modal');

      modal.classList.remove('open');

      const img = document.getElementById('studio-modal-img');

      img.src = '';

      studioModalZoom = 1;

      studioModalPan = { x: 0, y: 0 };

      isModalDragging = false;

      modalDragStart = null;

    }

    function getYouTubeEmbedUrl(url) {
      if (!url || typeof url !== 'string') return null;
      const regExp = /(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = url.match(regExp);
      if (match && match[1]) {
        return `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&rel=0&modestbranding=1`;
      }
      return null;
    }

    function openStudioVideoModal(url, title) {
      const modal = document.getElementById('studio-video-modal');
      const iframe = document.getElementById('studio-video-modal-iframe');
      const titleEl = document.getElementById('studio-video-modal-title');
      const ytBtn = document.getElementById('studio-video-modal-yt-btn');
      const embedUrl = getYouTubeEmbedUrl(url);

      if (!embedUrl) {
        showError("Lien YouTube invalide. Renseignez un lien valide (ex: https://www.youtube.com/watch?v=...)");
        return;
      }

      if (titleEl) {
        titleEl.innerHTML = `<span style="color:#ef4444;">▶️</span> ${escapeHtml(title || 'Vidéo YouTube')}`;
      }
      if (ytBtn) {
        ytBtn.href = url || '#';
      }
      iframe.src = embedUrl;
      modal.style.display = 'flex';

      // Basculer automatiquement en plein écran lors du clic
      const wrap = document.getElementById('studio-video-modal-wrap');
      if (wrap) {
        if (wrap.requestFullscreen) {
          const p = wrap.requestFullscreen();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } else if (wrap.webkitRequestFullscreen) {
          wrap.webkitRequestFullscreen();
        } else if (wrap.msRequestFullscreen) {
          wrap.msRequestFullscreen();
        }
      }
    }

    function closeStudioVideoModal() {
      if (document.fullscreenElement) {
        const p = document.exitFullscreen?.();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      const modal = document.getElementById('studio-video-modal');
      const iframe = document.getElementById('studio-video-modal-iframe');
      if (iframe) iframe.src = '';
      if (modal) modal.style.display = 'none';
    }

    function toggleStudioVideoFullscreen() {
      const wrap = document.getElementById('studio-video-modal-wrap');
      if (!wrap) return;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (wrap.requestFullscreen) {
          const p = wrap.requestFullscreen();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } else if (wrap.webkitRequestFullscreen) {
          wrap.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          const p = document.exitFullscreen();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    }

    document.addEventListener('fullscreenchange', () => {
      const btn = document.getElementById('studio-video-modal-fs-btn');
      if (btn) {
        btn.innerHTML = document.fullscreenElement ? '🗗' : '⛶';
        btn.title = document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran';
      }
    });

    function previewStudioVideo(interId) {

      const page = pagesData[currentPageIndex];

      const inter = page.interactions.find(i => i.id === interId);

      if (inter) {

        openStudioVideoModal(inter.youtubeUrl, inter.title);

      }

    }

    function adjustModalZoom(delta) {

      studioModalZoom = Math.max(0.5, Math.min(5.0, parseFloat((studioModalZoom + delta).toFixed(2))));

      if (studioModalZoom <= 1) studioModalPan = { x: 0, y: 0 };

      applyModalTransform(true);

    }

    function resetModalZoom() {

      studioModalZoom = 1;

      studioModalPan = { x: 0, y: 0 };

      applyModalTransform(true);

    }

    // Modal Interaction Listeners (Pan, Wheel, Double-click, Shortcuts)

    (function initStudioModalControls() {

      const modalEl = document.getElementById('studio-modal');

      const modalImgWrap = document.getElementById('studio-modal-img-wrap');

      const modalImg = document.getElementById('studio-modal-img');

      modalImg.addEventListener('mousedown', (e) => {

        if (studioModalZoom <= 1) return;

        e.preventDefault();

        isModalDragging = true;

        modalDragStart = { x: e.clientX, y: e.clientY };

        modalPanAtDrag = { ...studioModalPan };

        modalImg.style.cursor = 'grabbing';

      });

      window.addEventListener('mousemove', (e) => {

        if (!isModalDragging || !modalDragStart) return;

        studioModalPan = {

          x: modalPanAtDrag.x + (e.clientX - modalDragStart.x),

          y: modalPanAtDrag.y + (e.clientY - modalDragStart.y)

        };

        applyModalTransform(false);

      });

      window.addEventListener('mouseup', () => {

        if (isModalDragging) {

          isModalDragging = false;

          modalDragStart = null;

          modalImg.style.cursor = studioModalZoom > 1 ? 'grab' : 'default';

        }

      });

      modalImgWrap.addEventListener('wheel', (e) => {

        e.preventDefault();

        e.stopPropagation();

        const delta = -e.deltaY * 0.0012 * studioModalZoom;

        studioModalZoom = Math.max(0.5, Math.min(5.0, parseFloat((studioModalZoom + delta).toFixed(3))));

        if (studioModalZoom <= 1) studioModalPan = { x: 0, y: 0 };

        applyModalTransform(false);

      }, { passive: false });

      modalImgWrap.addEventListener('dblclick', (e) => {

        e.preventDefault();

        if (studioModalZoom > 1) {

          resetModalZoom();

        } else {

          studioModalZoom = 2.0;

          studioModalPan = { x: 0, y: 0 };

          applyModalTransform(true);

        }

      });

      modalEl.addEventListener('click', (e) => {

        if (e.target.id === 'studio-modal') {

          closeStudioModal();

        }

      });

      window.addEventListener('keydown', (e) => {
        const vModal = document.getElementById('studio-video-modal');
        if (vModal && vModal.style.display !== 'none') {
          if (e.key === 'Escape') {
            e.stopPropagation();
            closeStudioVideoModal();
            return;
          }
        }

        if (!modalEl.classList.contains('open')) return;

        if (e.key === 'Escape') {

          closeStudioModal();

        } else if (e.key === '+' || e.key === '=') {

          adjustModalZoom(0.25);

        } else if (e.key === '-') {

          adjustModalZoom(-0.25);

        } else if (e.key === '0') {

          resetModalZoom();

        }

      });

    })();

    // ══════════════════════════════════════════════════════════════

    // PAGE MANAGER — Réordonner · Supprimer · Importer · Page vierge

    // ══════════════════════════════════════════════════════════════

    // Drag state for filmstrip reorder

    let filmstripDragIdx = null;

    // Helper: renumber displayOrder after any change


// ── Import PDF Modal ──────────────────────────────────────────────────────

    let importSelectedPages = new Set(); // Set of page numbers to import

    let importCurrentPdfPath = '';

    let importTotalPages = 0;

    function openImportPdfModal() {

      document.getElementById('import-pdf-modal').classList.add('open');

      document.getElementById('import-pdf-path').value = '';

      document.getElementById('import-pdf-info').textContent = '';

      document.getElementById('import-page-grid').innerHTML = '';

      document.getElementById('import-selection-count').textContent = '0 page(s) sélectionnée(s)';

      importSelectedPages.clear();

      importCurrentPdfPath = '';

      importTotalPages = 0;

    }

    function closeImportPdfModal() {

      document.getElementById('import-pdf-modal').classList.remove('open');

    }

    async function browseImportPdf() {

      try {

        const res = await fetch('/api/browse-pdf', { method: 'POST' });

        const data = await res.json();

        if (data.path) {

          document.getElementById('import-pdf-path').value = data.path;

          await loadImportPdfThumbs();

        }

      } catch (e) { console.error(e); }

    }

    function getFilenameFromPath(filePath) {
      if (!filePath) return '';
      const parts = filePath.split('\\').join('/').split('/');
      return parts[parts.length - 1] || '';
    }

    async function loadImportPdfThumbs() {

      const pdfPath = document.getElementById('import-pdf-path').value.trim();

      if (!pdfPath) { showError('Veuillez saisir le chemin du PDF.'); return; }

      const info = document.getElementById('import-pdf-info');

      const grid = document.getElementById('import-page-grid');

      info.textContent = '⏳ Chargement…';

      grid.innerHTML = '';

      importSelectedPages.clear();

      importCurrentPdfPath = pdfPath;

      try {

        const res = await fetch('/api/pdf-page-count', {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({ pdf_path: pdfPath })

        });

        const data = await res.json();

        if (!data.success) throw new Error(data.error || 'Erreur');

        importTotalPages = data.totalPages;

        info.textContent = `✅ ${importTotalPages} pages trouvées dans : ${getFilenameFromPath(pdfPath)}`;

        // Build the grid

        for (let p = 1; p <= importTotalPages; p++) {

          const thumb = document.createElement('div');

          thumb.className = 'import-page-thumb';

          thumb.dataset.page = p;

          thumb.innerHTML = `

            <div class="import-check">✓</div>

            <img src="/api/page-thumb?pdf=${encodeURIComponent(pdfPath)}&page=${p}" loading="lazy" alt="p${p}" />

            <span class="import-num">p. ${p}</span>

          `;

          thumb.addEventListener('click', () => {

            if (importSelectedPages.has(p)) {

              importSelectedPages.delete(p);

              thumb.classList.remove('selected');

            } else {

              importSelectedPages.add(p);

              thumb.classList.add('selected');

            }

            document.getElementById('import-selection-count').textContent =

              importSelectedPages.size + ' page(s) sélectionnée(s)';

          });

          grid.appendChild(thumb);

        }

      } catch (e) {

        info.textContent = '❌ Erreur : ' + e.message;

      }

    }

    async function confirmImportPages() {

      if (importSelectedPages.size === 0) {

        showError('Veuillez sélectionner au moins une page à importer.');

        return;

      }

      const sortedPageNums = [...importSelectedPages].sort((a, b) => a - b);

      const insertPos = currentPageIndex + 1;

      // Insert pages in sorted order

      sortedPageNums.forEach((pageNum, i) => {

        const newPage = {

          pageNumber: pageNum,

          pdfSource: importCurrentPdfPath,

          displayOrder: insertPos + i,

          title: `Importé p.${pageNum}`,

          ambientAudio: '',

          interactions: [],

          isImported: true

        };

        pagesData.splice(insertPos + i, 0, newPage);

      });

      reindexPages();

      closeImportPdfModal();

      renderFilmstrip();

      selectPage(insertPos);

      autoSaveProject();

      showSuccess?.(`✅ ${sortedPageNums.length} page(s) importée(s) depuis ${getFilenameFromPath(importCurrentPdfPath)}`);

    }

