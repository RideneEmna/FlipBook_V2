/* ── Flipbook Studio Pro: Canvas & Hotspot Overlay Engine ────────── */
// ── Tool Mode Selection ───────────────────────────────────────────────────

    function setToolMode(mode) {

      activeTool = mode;

      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));

      const activeBtn = document.getElementById('tool-' + mode);

      if (activeBtn) activeBtn.classList.add('active');

      const overlay = document.getElementById('canvas-overlay');

      overlay.className = 'canvas-overlay mode-' + mode;

      const textLayer = document.getElementById('text-layer');

      if (textLayer) {

        if (mode === 'select') {

          textLayer.classList.remove('disabled');

        } else {

          textLayer.classList.add('disabled');

          hideTextActionPill();

        }

      }

      const banner = document.getElementById('tool-hint-banner');

      if (mode === 'lasso') {

        banner.textContent = "📝 Mode Lasso : Cliquez et glissez sur un paragraphe ou titre pour capturer instantanément son texte.";

        banner.classList.add('active');

      } else if (mode === 'tts') {

        banner.textContent = "🗣️ Mode TTS : Cliquez n'importe où sur la page pour placer un bouton de lecture vocale.";

        banner.classList.add('active');

      } else if (mode === 'audio') {

        banner.textContent = "🎧 Mode Audio : Cliquez sur la page pour placer un bouton d'écoute audio.";

        banner.classList.add('active');

      } else if (mode === 'video') {

        banner.textContent = "▶️ Mode Vidéo : Cliquez sur la page pour placer un bouton vidéo YouTube.";

        banner.classList.add('active');

      } else if (mode === 'modal') {

        banner.textContent = "🔍 Mode Zoom : Cliquez et glissez sur la page pour tracer le cadre à zoomer.";

        banner.classList.add('active');

      } else if (mode === 'fill-blank') {

        banner.textContent = "✏️ Mode Texte à trou : Cliquez et glissez pour tracer la zone où l'élève devra saisir sa réponse.";

        banner.classList.add('active');

      } else if (mode === 'reveal') {

        banner.textContent = "👁️ Mode Révéler : Cliquez et glissez pour tracer la zone à masquer — un clic la révèle en classe.";

        banner.classList.add('active');

      } else if (mode === 'checkbox') {

        banner.textContent = "☑️ Mode Case à cocher : Cliquez sur la page pour placer une case Vrai/Faux.";

        banner.classList.add('active');

      } else {

        banner.classList.remove('active');

      }

    }

    // ── Canvas Overlay Interaction (Click to Place & Drag to Draw) ────────────

    const overlay = document.getElementById('canvas-overlay');

    const dragBox = document.getElementById('drag-box');

    overlay.addEventListener('mousedown', (e) => {

      const rect = overlay.getBoundingClientRect();

      const clickX = e.clientX - rect.left;

      const clickY = e.clientY - rect.top;

      const xPct = Math.round((clickX / rect.width) * 1000) / 10;

      const yPct = Math.round((clickY / rect.height) * 1000) / 10;

      if (activeTool === 'tts') {

        createTtsInteraction(xPct, yPct);

        setToolMode('select');

      } else if (activeTool === 'audio') {

        createAudioInteraction(xPct, yPct);

        setToolMode('select');

      } else if (activeTool === 'video') {

        createVideoInteraction(xPct, yPct);

        setToolMode('select');

      } else if (activeTool === 'checkbox') {

        createCheckboxInteraction(xPct, yPct);

        setToolMode('select');

      } else if (activeTool === 'validation') {

        createValidationInteraction(xPct, yPct, 15, 6);

        setToolMode('select');

      } else if (activeTool === 'fill-blank' || activeTool === 'reveal' || activeTool === 'modal') {

        isDrawing = true;

        drawStartX = clickX;

        drawStartY = clickY;

        dragBox.className = 'drag-selection-box';

        dragBox.style.left = clickX + 'px';

        dragBox.style.top = clickY + 'px';

        dragBox.style.width = '0px';

        dragBox.style.height = '0px';

        dragBox.style.display = 'block';

      } else if (activeTool === 'lasso') {

        isDrawing = true;

        drawStartX = clickX;

        drawStartY = clickY;

        dragBox.className = 'drag-selection-box lasso';

        dragBox.style.left = clickX + 'px';

        dragBox.style.top = clickY + 'px';

        dragBox.style.width = '0px';

        dragBox.style.height = '0px';

        dragBox.style.display = 'block';

      }

    });

    window.addEventListener('mousemove', (e) => {

      if (!isDrawing) return;

      const rect = overlay.getBoundingClientRect();

      const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));

      const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      const left = Math.min(drawStartX, currentX);

      const top = Math.min(drawStartY, currentY);

      const width = Math.abs(currentX - drawStartX);

      const height = Math.abs(currentY - drawStartY);

      dragBox.style.left = left + 'px';

      dragBox.style.top = top + 'px';

      dragBox.style.width = width + 'px';

      dragBox.style.height = height + 'px';

    });

    window.addEventListener('mouseup', (e) => {

      if (!isDrawing) return;

      isDrawing = false;

      dragBox.style.display = 'none';

      const rect = overlay.getBoundingClientRect();

      const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));

      const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      const left = Math.min(drawStartX, currentX);

      const top = Math.min(drawStartY, currentY);

      const width = Math.abs(currentX - drawStartX);

      const height = Math.abs(currentY - drawStartY);

      if (activeTool === 'lasso') {

        if (width > 15 && height > 15) {

          const xPct = Math.round((left / rect.width) * 1000) / 10;

          const yPct = Math.round((top / rect.height) * 1000) / 10;

          const wPct = Math.round((width / rect.width) * 1000) / 10;

          const hPct = Math.round((height / rect.height) * 1000) / 10;

          extractTextAndCreateTts(xPct, yPct, wPct, hPct);

        }

        setToolMode('select');

        return;

      }

      // Minimum size threshold (15px) — dispatch vers le bon widget selon l'outil actif

      if (width > 15 && height > 15) {

        const xPct = Math.round((left / rect.width) * 1000) / 10;

        const yPct = Math.round((top / rect.height) * 1000) / 10;

        const wPct = Math.round((width / rect.width) * 1000) / 10;

        const hPct = Math.round((height / rect.height) * 1000) / 10;

        if (activeTool === 'fill-blank') {

          createFillBlankInteraction(xPct, yPct, wPct, hPct);

        } else if (activeTool === 'reveal') {

          createRevealInteraction(xPct, yPct, wPct, hPct);

        } else {

          createModalInteraction(xPct, yPct, wPct, hPct);

        }

        setToolMode('select');

      }

    });


// ── Interaction Factory Functions ─────────────────────────────────────────

    function createTtsInteraction(x, y) {

      const page = pagesData[currentPageIndex];

      const count = page.interactions.filter(i => i.type === 'tts').length + 1;

      const newInter = {

        id: `tts-${page.pageNumber}-${Date.now().toString().slice(-4)}`,

        type: 'tts',

        title: `Lecture ${count}`,

        text: 'Saisissez ici le texte à lire par la voix de synthèse.',

        lang: 'fr-FR',

        karaoke: true,

        x: x + '%',

        y: y + '%'

      };

      page.interactions.push(newInter);

      selectedInteractionId = newInter.id;

      renderOverlayHotspots();

      renderInteractionsInspector();

      renderFilmstrip();

      autoSaveProject();

    }

    function createAudioInteraction(x, y) {

      const page = pagesData[currentPageIndex];

      const count = page.interactions.filter(i => i.type === 'audio').length + 1;

      const newInter = {

        id: `audio-${page.pageNumber}-${Date.now().toString().slice(-4)}`,

        type: 'audio',

        title: `Piste audio ${count}`,

        src: '',

        x: x + '%',

        y: y + '%'

      };

      page.interactions.push(newInter);

      selectedInteractionId = newInter.id;

      renderOverlayHotspots();

      renderInteractionsInspector();

      renderFilmstrip();

      autoSaveProject();

    }

    function createVideoInteraction(x, y) {

      const page = pagesData[currentPageIndex];

      const count = page.interactions.filter(i => i.type === 'video').length + 1;

      const newInter = {

        id: `video-${page.pageNumber}-${Date.now().toString().slice(-4)}`,

        type: 'video',

        title: `Vidéo YouTube ${count}`,

        youtubeUrl: '',

        x: x + '%',

        y: y + '%'

      };

      page.interactions.push(newInter);

      selectedInteractionId = newInter.id;

      renderOverlayHotspots();

      renderInteractionsInspector();

      renderFilmstrip();

      autoSaveProject();

    }

    function createModalInteraction(x, y, w, h) {

      const page = pagesData[currentPageIndex];

      const count = page.interactions.filter(i => i.type === 'modal' || i.type === 'zoom').length + 1;

      const newInter = {

        id: `modal-${page.pageNumber}-${Date.now().toString().slice(-4)}`,

        type: 'modal',

        title: `Zoom HD ${count}`,

        imageSrc: '',

        x: x + '%',

        y: y + '%',

        width: w + '%',

        height: h + '%'

      };

      page.interactions.push(newInter);

      selectedInteractionId = newInter.id;

      renderOverlayHotspots();

      renderInteractionsInspector();

      renderFilmstrip();

      autoSaveProject();

    }

    function createFillBlankInteraction(x, y, w, h) {

      const page = pagesData[currentPageIndex];

      const count = page.interactions.filter(i => i.type === 'fill-blank').length + 1;

      const newInter = {

        id: `fb-${page.pageNumber}-${Date.now().toString().slice(-4)}`,

        type: 'fill-blank',

        title: `Trou ${count}`,

        answer: '',

        acceptAlternatives: '',

        hint: '',

        caseSensitive: false,

        groupId: `groupe-p${page.pageNumber}`,

        x: x + '%', y: y + '%',

        width: (w || 15) + '%', height: (h || 5) + '%'

      };

      page.interactions.push(newInter);

      selectedInteractionId = newInter.id;

      renderOverlayHotspots();

      renderInteractionsInspector();

      renderFilmstrip();

      autoSaveProject();

    }

    function createRevealInteraction(x, y, w, h) {

      const page = pagesData[currentPageIndex];

      const count = page.interactions.filter(i => i.type === 'reveal').length + 1;

      const newInter = {

        id: `rev-${page.pageNumber}-${Date.now().toString().slice(-4)}`,

        type: 'reveal',

        title: `Révélation ${count}`,

        coverLabel: '💡 Cliquer pour révéler',

        coverColor: '#f59e0b',

        revealText: '',

        revealAudio: '',

        startHidden: true,

        x: x + '%', y: y + '%',

        width: (w || 25) + '%', height: (h || 5) + '%'

      };

      page.interactions.push(newInter);

      selectedInteractionId = newInter.id;

      renderOverlayHotspots();

      renderInteractionsInspector();

      renderFilmstrip();

      autoSaveProject();

    }

    function createCheckboxInteraction(x, y) {

      const page = pagesData[currentPageIndex];

      const count = page.interactions.filter(i => i.type === 'checkbox-task').length + 1;

      const newInter = {

        id: `chk-${page.pageNumber}-${Date.now().toString().slice(-4)}`,

        type: 'checkbox-task',

        title: `Affirmation ${count}`,

        label: 'Vrai ou Faux ?',

        isCorrect: true,

        groupId: `groupe-p${page.pageNumber}`,

        x: x + '%', y: y + '%'

      };

      page.interactions.push(newInter);

      selectedInteractionId = newInter.id;

      renderOverlayHotspots();

      renderFilmstrip();

      autoSaveProject();

    }

    function createValidationInteraction(x, y, w, h) {

      const page = pagesData[currentPageIndex];

      const count = page.interactions.filter(i => i.type === 'validation-btn').length + 1;

      const newInter = {

        id: `val-${page.pageNumber}-${Date.now().toString().slice(-4)}`,

        type: 'validation-btn',

        title: `Bouton Validation ${count}`,

        label: '✓ Corriger',

        actionType: 'validate',

        groupId: '',

        x: x + '%', y: y + '%',

        width: w + '%', height: h + '%'

      };

      page.interactions.push(newInter);

      selectedInteractionId = newInter.id;

      renderOverlayHotspots();

      renderInteractionsInspector();

      autoSaveProject();

    }

    function addInteractionPrompt() {

      const choice = prompt(

        "Type d'interaction à ajouter :\n" +

        "1 = 🗣️ Texte à lire (TTS)\n" +

        "2 = 🎧 Fichier Audio\n" +

        "3 = 🔍 Zone Modale Zoom HD\n" +

        "4 = ✏️ Texte à trou (fill-blank)\n" +

        "5 = 👁️ Zone à révéler au clic\n" +

        "6 = ☑️ Case à cocher Vrai/Faux\n" +

        "7 = 🎯 Bouton Corriger (Vérifier & Récompense)",

        "1"

      );

      if (choice === "1") createTtsInteraction(50, 50);

      else if (choice === "2") createAudioInteraction(50, 50);

      else if (choice === "3") createModalInteraction(20, 20, 60, 40);

      else if (choice === "4") createFillBlankInteraction(20, 45, 20, 5);

      else if (choice === "5") createRevealInteraction(20, 30, 35, 6);

      else if (choice === "6") createCheckboxInteraction(10, 40);

      else if (choice === "7") createValidationInteraction(50, 80, 15, 6);

    }

    function deleteInteraction(id) {

      const page = pagesData[currentPageIndex];

      page.interactions = page.interactions.filter(i => i.id !== id);

      if (selectedInteractionId === id) selectedInteractionId = null;

      renderOverlayHotspots();

      renderInteractionsInspector();

      renderFilmstrip();

      autoSaveProject();

    }


// ── Pointer Drag & Resize Engine ──────────────────────────────────────────

    let widgetDragState = null;

    function attachWidgetDragEvents(element, inter, isZone) {

      element.addEventListener('pointerdown', (e) => {

        e.stopPropagation();

        if (selectedInteractionId !== inter.id) {

          selectedInteractionId = inter.id;

          renderOverlayHotspots();

          renderInteractionsInspector();

        }

        if (e.target.classList.contains('resize-handle')) {

          const handle = [...e.target.classList].find(c => ['nw','ne','sw','se','n','s','e','w'].includes(c));

          widgetDragState = {

            type: 'resize', id: inter.id, handle: handle,

            startX: e.clientX, startY: e.clientY,

            initX: parseFloat(inter.x) || 0, initY: parseFloat(inter.y) || 0,

            initW: parseFloat(inter.width) || 0, initH: parseFloat(inter.height) || 0

          };

          element.setPointerCapture(e.pointerId);

          return;

        }

        widgetDragState = {

          type: 'move', id: inter.id,

          startX: e.clientX, startY: e.clientY,

          initX: parseFloat(inter.x) || 0, initY: parseFloat(inter.y) || 0

        };

        element.classList.add('widget-dragging');

        element.setPointerCapture(e.pointerId);

      });

      element.addEventListener('pointermove', (e) => {

        if (!widgetDragState || widgetDragState.id !== inter.id) return;

        const rect = overlay.getBoundingClientRect();

        const deltaXPct = ((e.clientX - widgetDragState.startX) / rect.width) * 100;

        const deltaYPct = ((e.clientY - widgetDragState.startY) / rect.height) * 100;

        if (widgetDragState.type === 'move') {

          let newX = widgetDragState.initX + deltaXPct;

          let newY = widgetDragState.initY + deltaYPct;

          element.style.left = newX.toFixed(2) + '%';

          element.style.top = newY.toFixed(2) + '%';

        } else if (widgetDragState.type === 'resize' && isZone) {

          let nx = widgetDragState.initX;

          let ny = widgetDragState.initY;

          let nw = widgetDragState.initW;

          let nh = widgetDragState.initH;

          const h = widgetDragState.handle;

          if (h.includes('w')) { nx += deltaXPct; nw -= deltaXPct; }

          if (h.includes('e')) { nw += deltaXPct; }

          if (h.includes('n')) { ny += deltaYPct; nh -= deltaYPct; }

          if (h.includes('s')) { nh += deltaYPct; }

          if (nw < 2) nw = 2;

          if (nh < 2) nh = 2;

          element.style.left = nx.toFixed(2) + '%';

          element.style.top = ny.toFixed(2) + '%';

          element.style.width = nw.toFixed(2) + '%';

          element.style.height = nh.toFixed(2) + '%';

        }

      });

      element.addEventListener('pointerup', (e) => {

        if (!widgetDragState || widgetDragState.id !== inter.id) return;

        element.releasePointerCapture(e.pointerId);

        element.classList.remove('widget-dragging');

        inter.x = element.style.left;

        inter.y = element.style.top;

        if (isZone) {

          inter.width = element.style.width;

          inter.height = element.style.height;

        }

        widgetDragState = null;

        // Refresh inspector softly without fully re-rendering all hotspots

        const rowX = document.getElementById(`input-x-${inter.id}`);

        const rowY = document.getElementById(`input-y-${inter.id}`);

        const rowW = document.getElementById(`input-w-${inter.id}`);

        const rowH = document.getElementById(`input-h-${inter.id}`);

        if (rowX) rowX.value = inter.x;

        if (rowY) rowY.value = inter.y;

        if (rowW && isZone) rowW.value = inter.width;

        if (rowH && isZone) rowH.value = inter.height;

        autoSaveProject();

      });

    }

    function addResizeHandles(zone) {

      const handles = ['nw','ne','sw','se','n','s','e','w'];

      handles.forEach(h => {

        const div = document.createElement('div');

        div.className = `resize-handle ${h}`;

        zone.appendChild(div);

      });

    }


// ── Render Overlay Hotspots on Page Canvas ────────────────────────────────

    function renderOverlayHotspots() {

      const page = pagesData[currentPageIndex];

      overlay.innerHTML = '';

      page.interactions.forEach(inter => {

        const isSelected = (selectedInteractionId === inter.id);

        const selClass = isSelected ? ' selected' : '';

        const sizePx = inter.size ? inter.size + 'px' : '';

        if (inter.type === 'tts' || inter.type === 'audio') {

          const pin = document.createElement('div');

          pin.className = `hotspot-pin ${inter.type}${selClass}`;

          pin.style.left = inter.x;

          pin.style.top = inter.y;

          if (sizePx) {

            pin.style.width = sizePx;

            pin.style.height = sizePx;

            pin.style.fontSize = Math.max(12, (inter.size * 0.45)) + 'px';

          }

          pin.innerHTML = AUDIO_ICON_SVG;

          pin.title = inter.title || '';

          attachWidgetDragEvents(pin, inter, false);

          overlay.appendChild(pin);

        } else if (inter.type === 'video') {

          const pin = document.createElement('div');

          pin.className = `hotspot-pin video${selClass}`;

          pin.style.left = inter.x;

          pin.style.top = inter.y;

          if (sizePx) {

            pin.style.width = sizePx;

            pin.style.height = sizePx;

            pin.style.fontSize = Math.max(12, (inter.size * 0.45)) + 'px';

          }

          pin.innerHTML = `<span style="font-size:14px; line-height:1; display:flex; align-items:center; justify-content:center; color:#fff;">▶</span>`;

          pin.title = inter.title || 'Vidéo YouTube';

          attachWidgetDragEvents(pin, inter, false);

          overlay.appendChild(pin);

        } else if (inter.type === 'modal' || inter.type === 'zoom') {

          const zone = document.createElement('div');

          zone.className = `hotspot-zone${selClass}`;

          zone.style.left = inter.x;

          zone.style.top = inter.y;

          zone.style.width = inter.width;

          zone.style.height = inter.height;

          const label = document.createElement('div');

          label.className = 'hotspot-zone-label';

          label.innerHTML = `${ZOOM_LOUPE_SVG} <span>${escapeHtml(inter.title || 'Zoom')}</span>`;

          zone.appendChild(label);

          if (isSelected) addResizeHandles(zone);

          attachWidgetDragEvents(zone, inter, true);

          overlay.appendChild(zone);

        } else if (inter.type === 'fill-blank') {

          const zone = document.createElement('div');

          zone.className = `hotspot-fill-blank${selClass}`;

          zone.style.left = inter.x;

          zone.style.top = inter.y;

          zone.style.width = inter.width || '15%';

          zone.style.height = inter.height || '5%';

          zone.textContent = `✏️ ${inter.answer ? '"' + inter.answer + '"' : '[réponse ?]'}`;

          zone.title = inter.title || 'Texte à trou';

          if (isSelected) addResizeHandles(zone);

          attachWidgetDragEvents(zone, inter, true);

          overlay.appendChild(zone);

        } else if (inter.type === 'reveal') {

          const zone = document.createElement('div');

          zone.className = `hotspot-reveal${selClass}`;

          zone.style.left = inter.x;

          zone.style.top = inter.y;

          zone.style.width = inter.width || '25%';

          zone.style.height = inter.height || '5%';

          zone.style.background = (inter.coverColor || '#f59e0b') + '55';

          zone.style.borderColor = inter.coverColor || '#f59e0b';

          zone.textContent = '👁️ ' + (inter.coverLabel || 'Révéler');

          zone.title = inter.title || 'Zone à révéler';

          if (isSelected) addResizeHandles(zone);

          attachWidgetDragEvents(zone, inter, true);

          overlay.appendChild(zone);

        } else if (inter.type === 'checkbox-task') {

          const pin = document.createElement('div');

          pin.className = `hotspot-checkbox${selClass}`;

          pin.style.left = inter.x;

          pin.style.top = inter.y;

          if (sizePx) {

            pin.style.width = sizePx;

            pin.style.height = sizePx;

            pin.style.fontSize = Math.max(14, (inter.size * 0.5)) + 'px';

          }

          pin.textContent = inter.isCorrect ? '✅' : '❌';

          pin.title = inter.label || 'Case à cocher';

          attachWidgetDragEvents(pin, inter, false);

          overlay.appendChild(pin);

        } else if (inter.type === 'validation-btn') {

          const zone = document.createElement('div');

          zone.className = 'widget-validation-btn' + (isSelected ? ' selected' : '');

          zone.id = 'hotspot-' + inter.id;

          zone.style.left = inter.x; zone.style.top = inter.y;

          zone.style.width = inter.width || '15%'; zone.style.height = inter.height || '6%';

          if (isSelected) {

            zone.style.boxShadow = '0 0 0 3px #fff, 0 0 18px rgba(16,185,129,0.7)';

          }

          zone.title = 'Bouton de validation';

          zone.textContent = inter.label || '✓ Corriger';

          if (isSelected) addResizeHandles(zone);

          attachWidgetDragEvents(zone, inter, true);

          overlay.appendChild(zone);

        }

      });

    }


// ══════════════════════════════════════════════════════════

    // TEXT SELECTION & EXTRACTION SYSTEM

    // ══════════════════════════════════════════════════════════

    let currentSelectedText = '';

    async function loadTextLayerForCurrentPage(pageNum, pdfPath) {

      const textLayer = document.getElementById('text-layer');

      if (!textLayer) return;

      textLayer.innerHTML = '';

      hideTextActionPill();

      const targetPdf = pdfPath || currentPdfPath;

      if (!targetPdf) return;

      const cacheKey = `${targetPdf}_p${pageNum}`;

      let data = pageTextLinesCache[cacheKey];

      if (!data) {

        try {

          const res = await fetch(`/api/page-text?pdf=${encodeURIComponent(targetPdf)}&page=${pageNum}`);

          data = await res.json();

          if (data && data.success) {

            pageTextLinesCache[cacheKey] = data;

          }

        } catch (e) {

          console.warn("loadTextLayer error:", e);

          return;

        }

      }

      if (data && data.lines && data.lines.length > 0) {

        data.lines.forEach(line => {

          const span = document.createElement('span');

          span.className = 'text-line-span';

          span.textContent = line.text;

          span.style.left = `${line.x}%`;

          span.style.top = `${line.y}%`;

          span.style.width = `${line.w}%`;

          span.style.height = `${line.h}%`;

          span.style.fontSize = `calc(${line.h}vh * 0.75)`;

          textLayer.appendChild(span);

        });

      }

    }

    document.addEventListener('mouseup', (e) => {

      const pill = document.getElementById('text-action-pill');

      if (pill && pill.contains(e.target)) return;

      if (activeTool !== 'select') return;

      setTimeout(() => {

        const sel = window.getSelection();

        const text = sel ? sel.toString().trim() : '';

        if (text && text.length > 0) {

          currentSelectedText = text;

          const container = document.getElementById('canvas-container');

          if (!container) return;

          try {

            const range = sel.getRangeAt(0);

            const r = range.getBoundingClientRect();

            const cRect = container.getBoundingClientRect();

            if (r.top <= cRect.bottom && r.bottom >= cRect.top && r.left <= cRect.right && r.right >= cRect.left) {

              const relX = Math.max(40, Math.min(cRect.width - 40, r.left - cRect.left + (r.width / 2)));

              const relY = Math.max(15, r.top - cRect.top);

              pill.style.left = `${relX}px`;

              pill.style.top = `${relY}px`;

              document.getElementById('pill-text-snippet').textContent = text.length > 24 ? text.substring(0, 24) + '…' : text;

              pill.style.display = 'flex';

              return;

            }

          } catch(err) {}

        }

        hideTextActionPill();

      }, 50);

    });

    function hideTextActionPill() {

      const pill = document.getElementById('text-action-pill');

      if (pill) pill.style.display = 'none';

    }

    function applySelectedTextToTts() {

      if (!currentSelectedText) return;

      const page = pagesData[currentPageIndex];

      let targetInter = page.interactions.find(i => i.id === selectedInteractionId && i.type === 'tts');

      if (!targetInter) {

        const ttsList = page.interactions.filter(i => i.type === 'tts');

        if (ttsList.length > 0) {

          targetInter = ttsList[ttsList.length - 1];

          selectedInteractionId = targetInter.id;

        } else {

          createNewTtsFromSelection();

          return;

        }

      }

      targetInter.text = currentSelectedText;

      renderInteractionsInspector();

      hideTextActionPill();

      try { window.getSelection()?.removeAllRanges(); } catch(e) {}

    }

    function createNewTtsFromSelection() {

      if (!currentSelectedText) return;

      const page = pagesData[currentPageIndex];

      const count = page.interactions.filter(i => i.type === 'tts').length + 1;

      const pill = document.getElementById('text-action-pill');

      const container = document.getElementById('canvas-container');

      let xPct = 50, yPct = 50;

      if (pill && container && container.offsetWidth > 0) {

        const pillLeft = parseFloat(pill.style.left) || (container.offsetWidth / 2);

        const pillTop = parseFloat(pill.style.top) || (container.offsetHeight / 2);

        xPct = Math.round((pillLeft / container.offsetWidth) * 1000) / 10;

        yPct = Math.round((pillTop / container.offsetHeight) * 1000) / 10;

      }

      const newInter = {

        id: `tts-${page.pageNumber}-${Date.now().toString().slice(-4)}`,

        type: 'tts',

        title: `Lecture ${count}`,

        text: currentSelectedText,

        lang: detectTextLanguage(currentSelectedText),

        karaoke: true,

        x: Math.max(5, Math.min(95, xPct - 4)) + '%',

        y: Math.max(5, Math.min(95, yPct)) + '%'

      };

      page.interactions.push(newInter);

      selectedInteractionId = newInter.id;

      renderOverlayHotspots();

      renderInteractionsInspector();

      renderFilmstrip();

      hideTextActionPill();

      autoSaveProject();

      try { window.getSelection()?.removeAllRanges(); } catch(e) {}

    }

    function pasteSelectionToInter(interId) {

      if (!currentSelectedText) {

        const sel = window.getSelection();

        if (sel && sel.toString().trim()) {

          currentSelectedText = sel.toString().trim();

        }

      }

      if (!currentSelectedText) {

        alert("Veuillez d'abord surligner du texte sur la page avec votre curseur.");

        return;

      }

      const page = pagesData[currentPageIndex];

      const inter = page.interactions.find(i => i.id === interId);

      if (inter) {

        inter.text = currentSelectedText;

        inter.lang = detectTextLanguage(currentSelectedText);

        renderInteractionsInspector();

        autoSaveProject();

      }

    }

    async function extractTextAndCreateTts(xPct, yPct, wPct, hPct) {

      try {

        const res = await fetch('/api/extract-text-rect', {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({

            pdf_path: currentPdfPath,

            page: currentPageIndex + 1,

            x: xPct,

            y: yPct,

            width: wPct,

            height: hPct

          })

        });

        const data = await res.json();

        const capturedText = data && data.text ? data.text : '';

        const page = pagesData[currentPageIndex];

        const count = page.interactions.filter(i => i.type === 'tts').length + 1;

        const newInter = {

          id: `tts-${page.pageNumber}-${Date.now().toString().slice(-4)}`,

          type: 'tts',

          title: `Lecture ${count}`,

          text: capturedText || 'Texte extrait',

          lang: detectTextLanguage(capturedText),

          karaoke: true,

          x: Math.max(4, Math.min(95, xPct)) + '%',

          y: Math.max(4, Math.min(95, yPct)) + '%'

        };

        page.interactions.push(newInter);

        selectedInteractionId = newInter.id;

        renderOverlayHotspots();

        renderInteractionsInspector();

        renderFilmstrip();

        autoSaveProject();

      } catch (e) {

        console.error("Erreur extraction lasso:", e);

      }

    }

