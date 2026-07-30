import { readdirSync } from 'node:fs';

/**
 * Browsers on these origins may read the API. Empty — what the Docker image ships
 * with — means same-origin only. The GitHub Pages frontend is a different origin, so
 * its URL has to be listed here or every request it makes fails CORS.
 */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

/**
 * The one implementation of "/api/<name> -> api/<name>.js". `vite dev` and the
 * self-hosted server both route through here, so a route cannot behave differently in
 * the two; the only difference is how the module gets loaded.
 *
 * Returns a handler that resolves true if it took the request, false to pass it on.
 */
export function createApiRouter({ apiDir, loadModule, onError }) {
  // Vercel routes every top-level api/*.js and ignores `_`-prefixed files, so _lib
  // stays a library. Read per request so adding a route needs no restart in dev.
  const routes = () => {
    try {
      return readdirSync(apiDir).filter((f) => f.endsWith('.js') && !f.startsWith('_'));
    } catch {
      return [];
    }
  };

  return async function handleApi(req, res) {
    const url = new URL(req.url || '/', 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return false;

    // Set before dispatch: handleErrors() in api/_lib/http.js ends the response itself
    // on an upstream failure, and headers added after that never ship — the browser
    // would see a CORS error on every 502 instead of the structured message.
    applyCors(req, res);

    // A preflight needs those headers and nothing else.
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return true;
    }

    // Left percent-encoded on purpose: `%2e%2e` can never match a real filename, so
    // the readdir listing is itself the allowlist.
    const name = url.pathname.slice('/api/'.length).replace(/\/$/, '');
    if (!routes().includes(`${name}.js`)) {
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: `No API route /api/${name}` }));
      return true;
    }

    try {
      const mod = await loadModule(`${name}.js`);
      shimResponse(res);
      // Vercel hands handlers a parsed query; a raw Node request has none.
      req.query = Object.fromEntries(url.searchParams);
      // Deliberately no req.body. api/canvas.js reads the request stream itself when
      // req.body is absent, so draining or parsing it here would leave that handler
      // waiting on 'data' events that already fired.
      await mod.default(req, res);
    } catch (err) {
      onError?.(err);
      console.error(`[api] /api/${name} failed:`, err);
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: err.message }));
      }
    }
    return true;
  };
}

function applyCors(req, res) {
  // Vary even when refusing: sendJson marks responses `public, s-maxage=60`, and a
  // shared cache must never hand one origin another origin's allow-origin header.
  res.setHeader('vary', 'Origin');

  const origin = req.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return;

  res.setHeader('access-control-allow-origin', origin);
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  // POST /api/canvas sends content-type: application/json, which is not a safelisted
  // value, so that request is always preflighted.
  res.setHeader('access-control-allow-headers', 'content-type, accept');
  res.setHeader('access-control-max-age', '86400');
  // No allow-credentials: the feed URL in the body is the only credential in play and
  // it is sent explicitly, never as a cookie.
}

/** The small sugar Vercel adds to `res`. Unused today — every route goes through sendJson — but kept for parity. */
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
