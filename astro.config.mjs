// @ts-check
import { defineConfig } from 'astro/config';

import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssMinify: true,
      minify: true,
      rollupOptions: {
        output: {
          manualChunks: {
            tsparticles: ['tsparticles'],
            board: ['/src/pages/board.astro'],
          },
        },
      },
    },
    ssr: {
      noExternal: ['tsparticles'],
    },
  },
});