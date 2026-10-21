// Intègre les données d'un livre (interactions.json) dans le lecteur compilé.
// Usage : node tools/embed-project.mjs <lecteur.html> <interactions.json> <sortie.html>
import { readFileSync, writeFileSync } from 'node:fs';

const [, , htmlPath, jsonPath, outPath] = process.argv;
if (!htmlPath || !jsonPath || !outPath) {
  console.error('Usage : node tools/embed-project.mjs <lecteur.html> <interactions.json> <sortie.html>');
  process.exit(1);
}

const project = JSON.parse(readFileSync(jsonPath, 'utf8')); // échoue si le JSON est invalide
// "<" échappé : un "</script>" dans un texte ne peut pas casser la page.
const json = JSON.stringify(project)
  .replace(/</g, '\\u003c')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');
const tag = `<script id="flipbook-project" type="application/json">${json}</script>`;

let html = readFileSync(htmlPath, 'utf8');
const existing = /<script id="flipbook-project"[^>]*>[\s\S]*?<\/script>/;
if (existing.test(html)) {
  html = html.replace(existing, () => tag);
} else {
  const at = html.lastIndexOf('</body>');
  if (at === -1) {
    console.error('Balise </body> introuvable dans', htmlPath);
    process.exit(1);
  }
  html = html.slice(0, at) + tag + '\n' + html.slice(at);
}
writeFileSync(outPath, html);
console.log(`OK : ${project.pages?.length ?? 0} pages intégrées dans ${outPath}`);
