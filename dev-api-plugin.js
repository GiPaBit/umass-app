import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_DIR = join(__dirname, 'api');

/**
 * Vercel runs everything in `api/` as a serverless function. `vite dev` does not,
 * so this plugin mounts the exact same handler modules as dev middleware. One
 * implementation of each endpoint, identical behaviour in dev and production.
 */
export function devApiPlugin() {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const url = new URL(req.url, 'http://localhost');
        const name = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');

        // Only route to files that actually exist; anything else 404s like Vercel.
        let files = [];
        try {
          files = readdirSync(API_DIR).filter((f) => f.endsWith('.js'));
        } catch {
          return next();
        }
        if (!files.includes(`${name}.js`)) {
          res.statusCode = 404;
          res.setHeader('content-type', 'application/json');
          return res.end(JSON.stringify({ error: `No API route /api/${name}` }));
        }

        try {
          // ssrLoadModule gives us hot reloading of API code during dev.
          const mod = await server.ssrLoadModule(join(API_DIR, `${name}.js`));
          shimResponse(res);
          req.query = Object.fromEntries(url.searchParams);
          await mod.default(req, res);
        } catch (err) {
          server.ssrFixStacktrace(err);
          console.error(`[dev-api] /api/${name} failed:`, err);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        }
      });
    },
  };
}

/** Add the small sugar Vercel adds to `res` (status/json/send) to a raw Node response. */
function shimResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
    return res;
  };
  res.send = (body) => {
    res.end(body);
    return res;
  };
}
