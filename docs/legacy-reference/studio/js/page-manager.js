/* ── Flipbook Studio Pro: Page & Filmstrip Manager ───────────────── */
// ── Page Navigation in Studio ─────────────────────────────────────────────

    function prevPage() {

      if (currentPageIndex > 0) {

        currentPageIndex--;

        renderCurrentPage();

        renderFilmstrip();

      }

    }

    function nextPage() {

      if (currentPageIndex < totalPages - 1) {

        currentPageIndex++;

        renderCurrentPage();

        renderFilmstrip();

      }

    }

    function selectPage(index) {

      if (index >= 0 && index < totalPages) {

        currentPageIndex = index;

        renderCurrentPage();

        renderFilmstrip();

      }

    }

    // ── Render Active Page in Canvas & Inspector ──────────────────────────────

    function renderCurrentPage() {

      const page = pagesData[currentPageIndex];

      const pageNumDisplay = currentPageIndex + 1;

      const actualPdfPageNum = page.pageNumber !== undefined ? page.pageNumber : pageNumDisplay;

      const actualPdfPath = page.pdfSource || currentPdfPath;

      document.getElementById('page-indicator-pill').textContent = `Page ${pageNumDisplay} / ${totalPages}`;

      document.getElementById('current-page-title').value = page.title || `Page ${pageNumDisplay}`;

      document.getElementById('current-page-ambient').value = page.ambientAudio || '';

      // Load preview image

      const canvasImg = document.getElementById('canvas-img');

      if (page.isBlank || actualPdfPageNum < 1) {

        canvasImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1131" style="background:%23ffffff"><text x="50%" y="50%" text-anchor="middle" font-size="28" fill="%23ccc">Page vierge</text></svg>';

      } else {

        canvasImg.src = `/api/page-preview?pdf=${encodeURIComponent(actualPdfPath)}&page=${actualPdfPageNum}`;

      }

      // Load selectable text layer

      loadTextLayerForCurrentPage(actualPdfPageNum, actualPdfPath);

      renderOverlayHotspots();

      renderInteractionsInspector();

    }

    function onPageTitleChange(val) {

      pagesData[currentPageIndex].title = val;

      autoSaveProject();

    }

    function onPageAmbientChange(val) {

      pagesData[currentPageIndex].ambientAudio = val;

      renderFilmstrip();

      autoSaveProject();

    }

    async function browsePageAmbient() {

      try {

        const res = await fetch('/api/browse-audio', { method: 'POST' });

        const data = await res.json();

        if (data.path) {

          pagesData[currentPageIndex].ambientAudio = data.path;

          document.getElementById('current-page-ambient').value = data.path;

          renderFilmstrip();

          autoSaveProject();

        }

      } catch (err) {

        console.error(err);

      }

    }


function reindexPages() {

      pagesData.forEach((p, i) => { p.displayOrder = i; });

      totalPages = pagesData.length;

      document.getElementById('filmstrip-count').textContent = totalPages;

    }

    // Move page left (swap with previous)

    function movePageLeft(idx) {

      if (idx <= 0) return;

      [pagesData[idx - 1], pagesData[idx]] = [pagesData[idx], pagesData[idx - 1]];

      reindexPages();

      if (currentPageIndex === idx) currentPageIndex = idx - 1;

      else if (currentPageIndex === idx - 1) currentPageIndex = idx;

      renderFilmstrip();

      renderOverlayHotspots();

      renderInteractionsInspector();

      autoSaveProject();

    }

    // Move page right (swap with next)

    function movePageRight(idx) {

      if (idx >= pagesData.length - 1) return;

      [pagesData[idx], pagesData[idx + 1]] = [pagesData[idx + 1], pagesData[idx]];

      reindexPages();

      if (currentPageIndex === idx) currentPageIndex = idx + 1;

      else if (currentPageIndex === idx + 1) currentPageIndex = idx;

      renderFilmstrip();

      renderOverlayHotspots();

      renderInteractionsInspector();

      autoSaveProject();

    }

    // Delete a page (with confirmation)

    function deletePageAtIdx(idx) {

      const page = pagesData[idx];

      const label = page.title || `Page ${page.pageNumber}`;

      if (!confirm(`Supprimer "${label}" ?\nToutes ses interactions seront perdues.`)) return;

      pagesData.splice(idx, 1);

      reindexPages();

      if (currentPageIndex >= pagesData.length) currentPageIndex = Math.max(0, pagesData.length - 1);

      if (pagesData.length > 0) {

        selectPage(currentPageIndex);

      } else {

        renderFilmstrip();

        document.getElementById('canvas-img').src = '';

        document.getElementById('interactions-list').innerHTML = '';

      }

      autoSaveProject();

    }

    // Insert a blank white page at position insertAt (default: after current page)

    function insertBlankPage(insertAt) {

      const pos = (insertAt !== undefined) ? insertAt : currentPageIndex + 1;

      const blankEntry = {

        pageNumber: -1,          // special sentinel: blank

        pdfSource: null,

        displayOrder: pos,

        title: 'Page vierge',

        ambientAudio: '',

        interactions: [],

        isBlank: true

      };

      pagesData.splice(pos, 0, blankEntry);

      reindexPages();

      renderFilmstrip();

      selectPage(pos);

      autoSaveProject();

    }


// ── Render Filmstrip with full Page Manager ───────────────────────────────

    function renderFilmstrip() {

      const container = document.getElementById('filmstrip-container');

      container.innerHTML = '';

      document.getElementById('filmstrip-count').textContent = pagesData.length;

      pagesData.forEach((page, idx) => {

        const isActive = idx === currentPageIndex;

        const card = document.createElement('div');

        card.className = 'thumb-card' + (isActive ? ' active' : '');

        card.draggable = true;

        card.dataset.idx = idx;

        // Interaction badges

        const ttsCount   = page.interactions.filter(i => i.type === 'tts').length;

        const audioCount = page.interactions.filter(i => i.type === 'audio').length;

        const modalCount = page.interactions.filter(i => i.type === 'modal' || i.type === 'zoom').length;

        const fbCount    = page.interactions.filter(i => i.type === 'fill-blank').length;

        const revCount   = page.interactions.filter(i => i.type === 'reveal').length;

        const chkCount   = page.interactions.filter(i => i.type === 'checkbox-task').length;

        let badgesHtml = '';

        if (ttsCount > 0)   badgesHtml += `<span class="thumb-badge-dot" title="${ttsCount} TTS">🗣️${ttsCount}</span>`;

        if (audioCount > 0) badgesHtml += `<span class="thumb-badge-dot" title="${audioCount} audio">🎧${audioCount}</span>`;

        if (modalCount > 0) badgesHtml += `<span class="thumb-badge-dot" title="${modalCount} zoom">🔍${modalCount}</span>`;

        if (fbCount > 0)    badgesHtml += `<span class="thumb-badge-dot" title="${fbCount} trous">✏️${fbCount}</span>`;

        if (revCount > 0)   badgesHtml += `<span class="thumb-badge-dot" title="${revCount} révéler">👁️${revCount}</span>`;

        if (chkCount > 0)   badgesHtml += `<span class="thumb-badge-dot" title="${chkCount} cases">☑️${chkCount}</span>`;

        if (page.ambientAudio) badgesHtml += `<span class="thumb-badge-dot" title="Ambiance">🎵</span>`;

        // PDF source label

        const pdfSrc = page.pdfSource || currentPdfPath;

        const isExternal = page.pdfSource && page.pdfSource !== currentPdfPath;

        const srcLabel = pdfSrc ? pdfSrc.split(/[\\/]/).pop().replace(/\.pdf$/i, '') : '';

        // Thumbnail URL

        const thumbSrc = (page.isBlank || page.pageNumber < 1)

          ? 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="141" style="background:%231e293b"><text x="50%" y="55%" text-anchor="middle" font-size="28" fill="%2334d399">+</text></svg>'

          : `/api/page-thumb?pdf=${encodeURIComponent(pdfSrc)}&page=${page.pageNumber}`;

        const pageLabel = page.isBlank ? 'Vierge' : (isExternal ? `p.${page.pageNumber}` : `p.${page.pageNumber}`);

        card.innerHTML = `

          <div class="thumb-badges">${badgesHtml}</div>

          <img class="thumb-img" src="${thumbSrc}" loading="lazy" alt="${pageLabel}" />

          <span class="thumb-num">${pageLabel}</span>

          <div class="thumb-source-badge ${isExternal ? 'external' : ''}" title="${pdfSrc}">${srcLabel}</div>

          <div class="thumb-actions">

            <button class="thumb-action-btn" title="Déplacer à gauche" onclick="event.stopPropagation(); movePageLeft(${idx})">◀</button>

            <button class="thumb-action-btn del" title="Supprimer cette page" onclick="event.stopPropagation(); deletePageAtIdx(${idx})">🗑</button>

            <button class="thumb-action-btn" title="Déplacer à droite" onclick="event.stopPropagation(); movePageRight(${idx})">▶</button>

          </div>

        `;

        // Click → select

        card.addEventListener('click', () => selectPage(idx));

        // ── HTML5 Drag & Drop reorder ──────────────────────────────────────

        card.addEventListener('dragstart', (e) => {

          filmstripDragIdx = idx;

          e.dataTransfer.effectAllowed = 'move';

          setTimeout(() => card.classList.add('dragging'), 0);

        });

        card.addEventListener('dragend', () => {

          card.classList.remove('dragging');

          filmstripDragIdx = null;

          document.querySelectorAll('.thumb-card.drag-over').forEach(c => c.classList.remove('drag-over'));

        });

        card.addEventListener('dragover', (e) => {

          e.preventDefault();

          e.dataTransfer.dropEffect = 'move';

          if (filmstripDragIdx !== null && filmstripDragIdx !== idx) {

            document.querySelectorAll('.thumb-card.drag-over').forEach(c => c.classList.remove('drag-over'));

            card.classList.add('drag-over');

          }

        });

        card.addEventListener('dragleave', () => {

          card.classList.remove('drag-over');

        });

        card.addEventListener('drop', (e) => {

          e.preventDefault();

          card.classList.remove('drag-over');

          if (filmstripDragIdx === null || filmstripDragIdx === idx) return;

          // Reorder: move dragged page to drop position

          const [moved] = pagesData.splice(filmstripDragIdx, 1);

          pagesData.splice(idx, 0, moved);

          reindexPages();

          currentPageIndex = idx;

          renderFilmstrip();

          selectPage(idx);

          autoSaveProject();

        });

        container.appendChild(card);

      });

    }

