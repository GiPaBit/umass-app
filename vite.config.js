import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { devApiPlugin } from './dev-api-plugin.js';

export default defineConfig({
  plugins: [react(), tailwindcss(), devApiPlugin()],
  server: {
    // Bind to 0.0.0.0 so the dev server is reachable from an iPhone on the same Wi-Fi.
    host: true,
    port: 5173,
  },
});
