import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        game: resolve(__dirname, 'index.html'),
        study: resolve(__dirname, 'study.html'),
      },
    },
  },
});
