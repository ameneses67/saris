// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  // needsSessionKVBinding no está en los tipos públicos del adaptador
  // pero existe en runtime — evita que Cloudflare Pages provea un KV para sesiones
  adapter: cloudflare(/** @type {any} */({ needsSessionKVBinding: false })),
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()]
  }
});