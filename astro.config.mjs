// @ts-check
import { defineConfig } from 'astro/config';

import tailwind from '@astrojs/tailwind';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://cmudsc.com',
  integrations: [
    tailwind(),
    sitemap({
      customPages: [
        'https://cmudsc.com/datathon',
        'https://cmudsc.com/anomaly',
        'https://poker.cmudsc.com',
      ],
    }),
  ],
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