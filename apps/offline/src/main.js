import { startViewer } from '@flipbook/viewer';

// Les données du livre sont intégrées par l'export dans
// <script id="flipbook-project" type="application/json">...</script>.
// Les images et l'audio sont liés avec des chemins relatifs (public/...).
function readProject() {
  const el = document.getElementById('flipbook-project');
  if (el) {
    try {
      return JSON.parse(el.textContent);
    } catch (error) {
      console.error('Données du livre illisibles', error);
    }
  }
  return window.__FLIPBOOK_PROJECT__ || null;
}

const project = readProject();
if (project) {
  startViewer(project, { assetBase: '' });
} else {
  document.body.innerHTML =
    '<p style="font:16px sans-serif;padding:24px">Aucun livre intégré dans ce fichier.</p>';
}
