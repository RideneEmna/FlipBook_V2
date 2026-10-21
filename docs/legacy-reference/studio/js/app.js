/* ── Flipbook Studio Pro: Application Orchestrator & Listeners ───── */
// ── Native File Input & Drag and Drop ──────────────────────────────────────

    function openNativeFilePicker() {

      document.getElementById('pdf-file-input').click();

    }

    async function handleNativeFileInput(input) {

      if (input.files && input.files.length > 0) {

        await uploadAndProcessFile(input.files[0]);

      }

    }

    async function uploadAndProcessFile(file) {

      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.pdf')) {

        showError("Le fichier sélectionné n'est pas un document PDF (.pdf).");

        return;

      }

      const dropText = document.getElementById('drop-text');

      const statusText = document.getElementById('upload-status-text');

      dropText.textContent = `📄 ${file.name}`;

      statusText.style.display = 'block';

      statusText.textContent = `⏳ Chargement du document en cours... (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;

      try {

        const res = await fetch('/api/upload-pdf?filename=' + encodeURIComponent(file.name), {

          method: 'POST',

          body: file

        });

        const data = await res.json();

        if (data.success && data.path) {

          document.getElementById('pdf-path').value = data.path;

          onPdfSelected(data.path);

          statusText.style.display = 'none';

        } else {

          throw new Error(data.error || "Erreur lors de la réception du PDF");

        }

      } catch (err) {

        statusText.style.display = 'none';

        showError("Erreur lors de l'envoi du fichier : " + err.message);

      }

    }

    // ── Drag & Drop Event Listeners ───────────────────────────────────────────

    const dropZone = document.getElementById('drop-zone');

    dropZone.addEventListener('click', () => openNativeFilePicker());

    ['dragenter', 'dragover'].forEach(name => {

      dropZone.addEventListener(name, (e) => {

        e.preventDefault();

        e.stopPropagation();

        dropZone.classList.add('dragover');

      });

    });

    ['dragleave', 'drop'].forEach(name => {

      dropZone.addEventListener(name, (e) => {

        e.preventDefault();

        e.stopPropagation();

        dropZone.classList.remove('dragover');

      });

    });

    dropZone.addEventListener('drop', async (e) => {

      const files = e.dataTransfer.files;

      if (files && files.length > 0) {

        await uploadAndProcessFile(files[0]);

      }

    });


window.addEventListener('DOMContentLoaded', () => {

      checkLocalPdfs();

      checkAutoSaveOnStartup();

    });

