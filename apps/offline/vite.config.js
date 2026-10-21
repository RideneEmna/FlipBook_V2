import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Un seul fichier index.html : JavaScript, CSS, icône et animation sont intégrés.
// Les pages, miniatures, audio et zooms restent des fichiers liés (public/...).
export default defineConfig({
  plugins: [viteSingleFile()],
  resolve: {
    alias: {
      '@flipbook/viewer': path.resolve(__dirname, '../../packages/viewer/src/index.js'),
    },
  },
  build: {
    outDir: 'dist',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
});

