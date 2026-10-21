/* ── Flipbook Studio Pro: API & Project Storage Engine ──────────── */
// ── Auto-Detect Local PDFs in Workspace ────────────────────────────────────

    let detectedPdfsList = [];

    async function checkLocalPdfs() {

      try {

        const res = await fetch('/api/list-local-pdfs');

        const data = await res.json();

        if (data.success && data.pdfs && data.pdfs.length > 0) {

          detectedPdfsList = data.pdfs;

          const best = data.pdfs[0];

          const bar = document.getElementById('detected-pdfs-bar');

          document.getElementById('detected-pdf-name').textContent = best.name;

          document.getElementById('detected-pdf-size').textContent = `(${best.sizeMb} MB)`;

          bar.style.display = 'flex';

          const pathInput = document.getElementById('pdf-path');

          if (!pathInput.value) {

            pathInput.value = best.path;

            onPdfSelected(best.path);

          }

        }

      } catch (e) {

        console.warn("checkLocalPdfs:", e);

      }

    }

    function useDetectedPdf() {

      if (detectedPdfsList.length > 0) {

        const p = detectedPdfsList[0];

        document.getElementById('pdf-path').value = p.path;

        onPdfSelected(p.path);

      }

    }


// ── Windows Explorateur Dialogs (PowerShell) ──────────────────────────────

    async function browsePdfWindows() {

      try {

        const res = await fetch('/api/browse-pdf', { method: 'POST' });

        const data = await res.json();

        if (data.path) {

          document.getElementById('pdf-path').value = data.path;

          onPdfSelected(data.path);

        }

      } catch (err) {

        console.error('Erreur browse-pdf:', err);

      }

    }

    async function browseDir() {

      try {

        const res = await fetch('/api/browse-dir', { method: 'POST' });

        const data = await res.json();

        if (data.path) {

          document.getElementById('output-dir').value = data.path;

        }

      } catch (err) {

        console.error('Erreur browse-dir:', err);

      }

    }

    function onPdfSelected(path) {

      if (!path) return;

      const parts = path.replace(/\\/g, '/').split('/');

      const filename = parts[parts.length - 1];

      const stem = filename.replace(/\.[^/.]+$/, "");

      document.getElementById('drop-text').textContent = "📄 " + filename;

      // Autofill title if empty

      const titleInput = document.getElementById('book-title');

      if (!titleInput.value) {

        titleInput.value = stem.replace(/[_-]/g, ' ');

      }

      // Autofill output directory if empty

      const outInput = document.getElementById('output-dir');

      if (!outInput.value) {

        const parentDir = parts.slice(0, -1).join('/');

        outInput.value = (parentDir ? parentDir + '/' : '') + 'flipbook_' + stem;

      }

    }

    document.getElementById('pdf-path').addEventListener('input', (e) => {

      onPdfSelected(e.target.value);

    });


// ── Load PDF & Initialize Pages ───────────────────────────────────────────

    // pendingPages: tableau de pages issu d'un projet à restaurer.

    //   Si fourni, les pages du projet remplacent les pages vides après le chargement PDF,

    //   évitant ainsi l'écrasement de pagesData par loadPdfAndOpenStudio().

    async function loadPdfAndOpenStudio(pendingPages = null) {

      const pdfPath = document.getElementById('pdf-path').value.trim();

      if (!pdfPath) {

        showError("Veuillez sélectionner un fichier PDF source.");

        return;

      }

      try {

        const res = await fetch('/api/load-pdf', {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({ pdf_path: pdfPath })

        });

        let data;

        try {

          data = await res.json();

        } catch (e) {

          throw new Error("Erreur de communication avec le serveur (code " + res.status + ")");

        }

        if (!data.success) {

          throw new Error(data.error || "Erreur de chargement du PDF");

        }

        currentPdfPath = pdfPath;

        totalPages = data.totalPages;

        // Si un projet est en cours de restauration, on utilise ses pages directement.

        // On ne réinitialise PAS pagesData dans ce cas pour ne pas perdre les données projet.

        if (pendingPages && Array.isArray(pendingPages) && pendingPages.length > 0) {

          // Reconstruire pagesData en fusionnant les pages du projet sur la structure PDF

          pagesData = [];

          for (let i = 1; i <= totalPages; i++) {

            const saved = pendingPages.find(p => p.pageNumber === i);

            pagesData.push(saved ? saved : {

              pageNumber: i,

              title: `Page ${i}`,

              ambientAudio: "",

              interactions: []

            });

          }

        } else {

          // Chargement normal : initialiser les pages vides

          pagesData = [];

          for (let i = 1; i <= totalPages; i++) {

            pagesData.push({

              pageNumber: i,

              title: `Page ${i}`,

              ambientAudio: "",

              interactions: []

            });

          }

          // Prepopulate if project config was found server-side

          if (data.initialConfig && Array.isArray(data.initialConfig)) {

            data.initialConfig.forEach(cfg => {

              const pNum = cfg.pageNumber;

              if (pNum >= 1 && pNum <= totalPages) {

                pagesData[pNum - 1].title = cfg.title || pagesData[pNum - 1].title;

                pagesData[pNum - 1].ambientAudio = cfg.ambientAudio || "";

                pagesData[pNum - 1].interactions = cfg.interactions || [];

              }

            });

          }

        }

        currentPageIndex = 0;

        document.getElementById('tab-step-1').classList.add('completed');

        switchStep(2);

      } catch (err) {

        showError(err.message);

      }

    }


// ── Project Save / Load & Auto-Save (Gestion d'Avancement) ───────────────

    function autoSaveProject() {

      if (!pagesData || pagesData.length === 0 || !currentPdfPath) return;

      try {

        const data = {

          version: "1.0",

          pdf_path: currentPdfPath,

          title: document.getElementById('book-title').value.trim(),

          subtitle: document.getElementById('book-subtitle').value.trim(),

          output_dir: document.getElementById('output-dir').value.trim(),

          dpi: selectedDpi,

          totalPages: totalPages,

          pages: pagesData,

          timestamp: Date.now()

        };

        localStorage.setItem('flipbook_studio_autosave', JSON.stringify(data));

        const indicator = document.getElementById('autosave-indicator');

        if (indicator) {

          indicator.textContent = '💾 Sauvegardé';

          indicator.style.opacity = '1';

          setTimeout(() => { if (indicator) indicator.style.opacity = '0.6'; }, 1800);

        }

      } catch (e) {

        console.warn("Erreur auto-save:", e);

      }

    }

    function checkAutoSaveOnStartup() {

      try {

        const raw = localStorage.getItem('flipbook_studio_autosave');

        if (!raw) return;

        const data = JSON.parse(raw);

        if (!data || !data.pages || data.pages.length === 0) return;

        const totalInteractions = data.pages.reduce((acc, p) => acc + (p.interactions ? p.interactions.length : 0), 0);

        if (totalInteractions === 0 && !data.title && !data.pdf_path) return;

        const banner = document.getElementById('autosave-banner');

        const titleEl = document.getElementById('autosave-title');

        const detailsEl = document.getElementById('autosave-details');

        if (banner && titleEl && detailsEl) {

          titleEl.textContent = data.title || (data.pdf_path ? data.pdf_path.split(/[\\/]/).pop() : 'Session précédente');

          const savedDate = data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'récemment';

          detailsEl.textContent = `${data.pages.length} pages · ${totalInteractions} interaction(s) configurée(s) · Enregistré à ${savedDate}`;

          banner.style.display = 'flex';

        }

      } catch (e) {

        console.warn("Erreur vérification autosave:", e);

      }

    }

    async function restoreAutoSave() {

      try {

        const raw = localStorage.getItem('flipbook_studio_autosave');

        if (!raw) return;

        const data = JSON.parse(raw);

        const banner = document.getElementById('autosave-banner');

        if (banner) banner.style.display = 'none';

        await restoreProjectData(data, "Sauvegarde automatique");

      } catch (e) {

        showError("Impossible de restaurer la session automatique : " + e.message);

      }

    }

    function dismissAutoSave() {

      const banner = document.getElementById('autosave-banner');

      if (banner) banner.style.display = 'none';

      // Effacer l'autosave pour ne pas re-proposer le même projet au prochain démarrage

      try { localStorage.removeItem('flipbook_studio_autosave'); } catch(e) {}

    }

    function saveProjectFile() {

      if (!pagesData || pagesData.length === 0) {

        showError("Veuillez d'abord charger un document PDF.");

        return;

      }

      const rawPdfName = currentPdfPath ? currentPdfPath.split(/[\\/]/).pop().replace(/\.[^/.]+$/, "") : "projet_flipbook";

      const bookTitle = document.getElementById('book-title').value.trim() || rawPdfName;

      const projectPayload = {

        version: "1.0",

        savedAt: new Date().toISOString(),

        title: bookTitle,

        subtitle: document.getElementById('book-subtitle').value.trim(),

        pdf_path: currentPdfPath,

        output_dir: document.getElementById('output-dir').value.trim(),

        dpi: selectedDpi,

        totalPages: totalPages,

        pages: pagesData

      };

      const jsonStr = JSON.stringify(projectPayload, null, 2);

      // 1. Téléchargement direct immédiat du fichier JSON

      const blob = new Blob([jsonStr], { type: 'application/json' });

      const downloadUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');

      a.href = downloadUrl;

      a.download = `${rawPdfName}.flipbook.json`;

      document.body.appendChild(a);

      a.click();

      setTimeout(() => {

        document.body.removeChild(a);

        URL.revokeObjectURL(downloadUrl);

      }, 300);

      // 2. Enregistrement sur le serveur dans le dossier projets/

      fetch('/api/save-project', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ project: projectPayload })

      }).then(r => r.json()).then(data => {

        showToast(`✓ Projet sauvegardé (${rawPdfName}.flipbook.json téléchargé & archivé dans projets)`);

      }).catch(err => {

        showToast(`✓ Fichier "${rawPdfName}.flipbook.json" téléchargé sur votre ordinateur.`);

      });

      // 3. Sauvegarde dans localStorage

      localStorage.setItem('flipbook_studio_autosave', jsonStr);

    }

    function loadProjectFile() {

      let input = document.getElementById('project-file-input');

      if (!input) {

        input = document.createElement('input');

        input.type = 'file';

        input.id = 'project-file-input';

        input.accept = '.json,application/json';

        input.style.display = 'none';

        input.onchange = (e) => handleProjectFileInput(e.target);

        document.body.appendChild(input);

      }

      input.value = '';

      input.click();

    }

    function handleProjectFileInput(input) {

      const file = input.files && input.files[0];

      if (!file) return;

      const reader = new FileReader();

      reader.onload = async (evt) => {

        try {

          const projectData = JSON.parse(evt.target.result);

          await restoreProjectData(projectData, file.name);

        } catch (err) {

          showError("Erreur lors de la lecture du fichier JSON : " + err.message);

        }

      };

      reader.readAsText(file);

    }

    async function restoreProjectData(prj, sourceName = "projet.json") {

      if (!prj || (!prj.pages && !prj.pdf_path)) {

        showError("Le fichier sélectionné ne contient pas de données de projet Flipbook valides.");

        return;

      }

      // Remplir les champs du formulaire avec les métadonnées du projet

      if (prj.title)      document.getElementById('book-title').value    = prj.title;

      if (prj.subtitle !== undefined) document.getElementById('book-subtitle').value = prj.subtitle;

      if (prj.output_dir) document.getElementById('output-dir').value   = prj.output_dir;

      if (prj.dpi) {

        selectedDpi = prj.dpi;

        const pills = document.querySelectorAll('.dpi-pill');

        pills.forEach(p => p.classList.remove('active'));

        if (prj.dpi === 150 && pills[0])      pills[0].classList.add('active');

        else if (prj.dpi === 450 && pills[2]) pills[2].classList.add('active');

        else if (pills[1])                    pills[1].classList.add('active');

      }

      // Résoudre le PDF cible : priorité au pdf_path du projet

      const targetPdf = prj.pdf_path || currentPdfPath;

      const pendingPages = (prj.pages && Array.isArray(prj.pages) && prj.pages.length > 0)

        ? prj.pages

        : null;

      if (targetPdf) {

        // Toujours mettre à jour le champ et charger le PDF,

        // en passant les pages du projet pour éviter leur écrasement

        document.getElementById('pdf-path').value = targetPdf;

        currentPdfPath = targetPdf;

        await loadPdfAndOpenStudio(pendingPages);

      } else if (pendingPages) {

        // Pas de PDF disponible mais on a des pages : restaurer directement

        pagesData = pendingPages;

        totalPages = pagesData.length;

      }

      // À ce stade, pagesData est déjà peuplé par loadPdfAndOpenStudio(pendingPages).

      // On rafraîchit l'interface.

      if (pagesData && pagesData.length > 0) {

        renderCurrentPage();

        renderFilmstrip();

        renderOverlayHotspots();

        renderInteractionsInspector();

      }

      switchStep(2);

      const totalInteractions = (pagesData || []).reduce((acc, p) => acc + (p.interactions ? p.interactions.length : 0), 0);

      showToast(`✓ Projet "${sourceName}" restauré ! (${(pagesData || []).length} pages, ${totalInteractions} interactions)`);

      // Sauvegarder uniquement une fois la restauration complète

      autoSaveProject();

    }


// ── Step 3 Summary & Final Conversion ─────────────────────────────────────

    function goToConversionStep() {

      switchStep(3);

    }

    function updateStep3Summary() {

      let ttsTotal = 0, audioTotal = 0, modalTotal = 0;

      pagesData.forEach(p => {

        p.interactions.forEach(i => {

          if (i.type === 'tts') ttsTotal++;

          else if (i.type === 'audio') audioTotal++;

          else if (i.type === 'modal' || i.type === 'zoom') modalTotal++;

        });

      });

      document.getElementById('sum-total-pages').textContent = totalPages;

      document.getElementById('sum-tts-count').textContent = ttsTotal;

      document.getElementById('sum-audio-count').textContent = audioTotal;

      document.getElementById('sum-modal-count').textContent = modalTotal;

    }

    async function startConversion() {

      const outputDir = document.getElementById('output-dir').value.trim();

      const title = document.getElementById('book-title').value.trim();

      const subtitle = document.getElementById('book-subtitle').value.trim();

      document.getElementById('btn-start-convert').disabled = true;

      document.getElementById('progress-card').style.display = 'block';

      document.getElementById('success-card').style.display = 'none';

      document.getElementById('log-box').innerHTML = '';

      try {

        const res = await fetch('/api/convert', {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({

            pdf_path: currentPdfPath,

            output_dir: outputDir,

            title: title,

            subtitle: subtitle,

            dpi: selectedDpi,

            quality: 85,

            pages_config: pagesData

          })

        });

        const data = await res.json();

        if (!data.success) {

          throw new Error(data.error || "Erreur de conversion");

        }

        pollInterval = setInterval(pollConversionStatus, 400);

      } catch (err) {

        showError(err.message);

        document.getElementById('btn-start-convert').disabled = false;

        document.getElementById('progress-card').style.display = 'none';

      }

    }

    async function pollConversionStatus() {

      try {

        const res = await fetch('/api/status');

        const data = await res.json();

        const pct = data.percent || 0;

        document.getElementById('progress-pct').textContent = pct + '%';

        document.getElementById('progress-bar-fill').style.width = pct + '%';

        document.getElementById('progress-step-text').textContent = (data.step || '') + ' — ' + (data.message || '');

        if (data.logs && data.logs.length > 0) {

          const logBox = document.getElementById('log-box');

          logBox.innerHTML = data.logs.map(l => `<div>${escapeHtml(l)}</div>`).join('');

          logBox.scrollTop = logBox.scrollHeight;

        }

        if (!data.running) {

          clearInterval(pollInterval);

          document.getElementById('btn-start-convert').disabled = false;

          if (data.error) {

            showError("Erreur lors de la conversion : " + data.error);

          } else if (data.status === 'completed') {

            document.getElementById('success-path').textContent = "📁 " + data.output_html;

            document.getElementById('success-card').style.display = 'block';

            document.getElementById('success-card').scrollIntoView({ behavior: 'smooth' });

          }

        }

      } catch (err) {

        console.error('Polling error:', err);

      }

    }

    async function openGeneratedFlipbook() {

      try { await fetch('/api/open-flipbook', { method: 'POST' }); } catch(e) {}

    }

    async function openOutputFolder() {

      try { await fetch('/api/open-folder', { method: 'POST' }); } catch(e) {}

    }

