import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { devApiPlugin } from './dev-api-plugin.js';

export default defineConfig({
  // "/" for Vercel and the Docker image; "/umass-app/" for GitHub Pages, which serves
  // from a repo subpath. Must stay an absolute path — a relative base makes Vite emit
  // "./assets/..." and the asset regex in public/sw.js only matches root-absolute URLs,
  // so the worker would cache a shell with no scripts. That is the blank-page bug the
  // comment at the top of public/sw.js says this service worker exists to fix.
  base: process.env.APP_BASE || '/',
  plugins: [react(), tailwindcss(), devApiPlugin()],
  server: {
    // Bind to 0.0.0.0 so the dev server is reachable from an iPhone on the same Wi-Fi.
    host: true,
    port: 5173,
  },
});
