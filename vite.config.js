import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // Relative URLs also let the same build run from a local static server.
  base: './',
  build: {
    rollupOptions: {
      input: {
        game: resolve(import.meta.dirname, 'index.html'),
        credits: resolve(import.meta.dirname, 'credits.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three';
        },
      },
    },
  },
});
