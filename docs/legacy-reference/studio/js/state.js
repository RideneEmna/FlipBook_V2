/* ── Flipbook Studio Pro: State & Common Utilities ────────────────── */
// ── Global Application State ──────────────────────────────────────────────

    const AUDIO_ICON_SVG = `<img src="/api/media-preview?path=icone.png" style="width:100%;height:100%;object-fit:contain;pointer-events:none;" alt="Audio"/>`;


const ZOOM_LOUPE_SVG = `<svg class="zoom-loupe-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;

    let currentStep = 1;

    let selectedDpi = 300;

    let currentPdfPath = '';

    let totalPages = 0;

    let currentPageIndex = 0; // 0-indexed

    let pagesData = [];       // [{ pageNumber: 1, title: "", ambientAudio: "", interactions: [] }]

    let activeTool = 'select'; // select, tts, audio, modal

    let selectedInteractionId = null;

    let pollInterval = null;

    // Drawing drag state

    let isDrawing = false;

    let drawStartX = 0;

    let drawStartY = 0;

    // ── Step Navigation ───────────────────────────────────────────────────────

    function switchStep(step) {

      if (step === 2 && (!currentPdfPath || totalPages === 0)) {

        showError("Veuillez d'abord charger un document PDF à l'étape 1.");

        return;

      }

      currentStep = step;

      document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active'));

      document.querySelectorAll('.step-tab').forEach(t => t.classList.remove('active'));

      document.getElementById('view-step-' + step).classList.add('active');

      document.getElementById('tab-step-' + step).classList.add('active');

      if (step === 2) {

        renderCurrentPage();

        renderFilmstrip();

      } else if (step === 3) {

        updateStep3Summary();

      }

      window.scrollTo({ top: 0, behavior: 'smooth' });

    }

    function selectDpi(dpi, el) {

      selectedDpi = dpi;

      document.querySelectorAll('.dpi-pill').forEach(p => p.classList.remove('active'));

      el.classList.add('active');

    }

    function showToast(msg, isSuccess = true) {

      const toast = document.getElementById('error-toast');

      if (!toast) return;

      toast.textContent = msg;

      toast.style.background = isSuccess ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)';

      toast.style.borderColor = isSuccess ? '#10b981' : '#ef4444';

      toast.classList.add('active');

      setTimeout(() => toast.classList.remove('active'), 5000);

    }

    function showError(msg) {

      showToast(msg, false);

    }


function escapeHtml(text) {

      if (!text) return '';

      const div = document.createElement('div');

      div.textContent = text;

      return div.innerHTML;

    }

