import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { copyFileSync } from 'node:fs';

// Tek dosyalık çıktı: ana klasördeki OYUN.html çift tıklanarak (internet olmadan) açılır.
export default defineConfig({
  root: 'src',
  plugins: [
    viteSingleFile(),
    { name: 'oyun-kopyala', closeBundle() { copyFileSync('dist/index.html', 'OYUN.html'); } },
  ],
  build: { outDir: '../dist', emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
