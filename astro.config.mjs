// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
    platformProxy: { enabled: true },
    // Las sesiones las maneja Better Auth con D1, no necesitamos KV
    needsSessionKVBinding: false,
  }),
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()]
  }
});