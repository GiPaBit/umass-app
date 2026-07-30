import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createApiRouter } from './api-router.js';

/**
 * Vercel serves dist/ and runs api/*.js for us. Self-hosted there is no platform, so
 * this does both on one port — which also keeps the frontend and the API same-origin,
 * so a plain `docker compose up` needs no CORS configuration at all.
 *
 * Node built-ins only: api/ and server/ have no npm dependencies between them, which
 * is why the runtime image ships without node_modules.
 */
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = process.env.DIST_DIR || join(ROOT, 'dist');
const API_DIR = join(ROOT, 'api');
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// No mime package: dist/ only ever holds these, and a dependency to map ten
// extensions would be the only one this server has.
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

const handleApi = createApiRouter({
  apiDir: API_DIR,
  // Plain dynamic import; the ESM cache means each route module is read once. A file
  // URL rather than a bare path because absolute paths are not valid ESM specifiers.
  loadModule: (file) => import(pathToFileURL(join(API_DIR, file)).href),
});

/**
 * Map a URL path to an absolute path inside dist/, or null if it escapes.
 *
 * Decode first, then resolve, then check the prefix: `%2e%2e%2f` is not `..` until it
 * has been decoded, so a check made before decoding would wave it straight through.
 */
function resolveInDist(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null; // malformed percent-encoding
  }
  if (decoded.includes('\0')) return null;

  const target = resolve(DIST, `.${decoded.startsWith('/') ? decoded : `/${decoded}`}`);
  if (target !== DIST && !target.startsWith(DIST + sep)) return null;
  return target;
}

/** stat an already-resolved path, or null if it is missing or a directory. */
function statFile(target) {
  if (!target) return null;
  try {
    const stat = statSync(target);
    return stat.isDirectory() ? null : { path: target, size: stat.size };
  } catch {
    return null;
  }
}

/** Mirrors the header rules vercel.json already applies. */
function cacheFor(rel) {
  if (rel.startsWith('/assets/')) return 'public, max-age=31536000, immutable'; // content-hashed
  if (rel === '/sw.js' || rel === '/index.html') return 'no-cache, no-store, must-revalidate';
  return 'public, max-age=3600';
}

const server = createServer(async (req, res) => {
  res.setHeader('x-content-type-options', 'nosniff');
  const url = new URL(req.url || '/', 'http://localhost');

  if (await handleApi(req, res)) return;

  // Health checks hit this rather than "/", because the SPA fallback below answers 200
  // for any path and so could never notice a missing or empty dist/.
  if (url.pathname === '/healthz') {
    res.statusCode = 200;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    return res.end('ok');
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    return res.end();
  }

  const target = resolveInDist(url.pathname);
  // A path that escapes dist/ is answered directly, never by the fallback below —
  // otherwise a traversal attempt gets a cheerful 200 and the app shell.
  if (!target) {
    res.statusCode = 404;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    return res.end('Not found');
  }

  let file = statFile(target);

  // SPA fallback, but never for a request that names a file. Answering a missing
  // /assets/*.js with index.html and a 200 produces a "MIME type text/html" module
  // error and poisons the service worker cache; a 404 says what actually happened.
  if (!file && !extname(url.pathname) && !url.pathname.startsWith('/assets/')) {
    file = statFile(resolveInDist('/index.html'));
  }

  if (!file) {
    res.statusCode = 404;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    return res.end('Not found');
  }

  // Headers follow what was actually served, so a SPA fallback is treated as the shell.
  const rel = `/${relative(DIST, file.path).split(sep).join('/')}`;
  res.setHeader('content-type', TYPES[extname(file.path)] || 'application/octet-stream');
  res.setHeader('cache-control', cacheFor(rel));
  res.setHeader('content-length', file.size);
  if (req.method === 'HEAD') return res.end();

  const stream = createReadStream(file.path);
  // Headers are already out by now, so there is no way to turn this into a 500 —
  // drop the response rather than leaving the client waiting on a stalled socket.
  stream.on('error', (err) => {
    console.error(`[server] read failed for ${rel}:`, err.message);
    res.destroy();
  });
  stream.pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT} — serving ${DIST}`);
});

// Docker sends SIGTERM on stop and restart. Without this the container sits out the
// full ten-second kill timeout on every deploy, held open by idle keep-alive sockets.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
