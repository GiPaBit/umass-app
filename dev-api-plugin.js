import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createApiRouter } from './server/api-router.js';

const API_DIR = join(dirname(fileURLToPath(import.meta.url)), 'api');

/**
 * Vercel and the self-hosted server both run everything in `api/` for real; `vite dev`
 * does not, so this mounts the same router as dev middleware. The routing itself lives
 * in server/api-router.js precisely so dev, Docker and Vercel cannot drift apart —
 * the only thing that differs here is how a route module gets loaded.
 */
export function devApiPlugin() {
  return {
    name: 'dev-api',
    configureServer(server) {
      const handleApi = createApiRouter({
        apiDir: API_DIR,
        // ssrLoadModule rather than import() so editing a route hot-reloads it.
        loadModule: (file) => server.ssrLoadModule(join(API_DIR, file)),
        onError: (err) => server.ssrFixStacktrace(err),
      });

      server.middlewares.use(async (req, res, next) => {
        if (!(await handleApi(req, res))) next();
      });
    },
  };
}
