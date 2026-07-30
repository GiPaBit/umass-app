// Shared fetch + response helpers for every API route.
// Files prefixed with `_` are ignored by Vercel's route scanner, so this stays a library.

/**
 * Browsers on these origins may read the API. Empty means same-origin only, which is
 * what a plain Docker self-host or `vite dev` needs. Set this to the GitHub Pages
 * origin when the frontend and the API are deployed separately (e.g. Pages + Vercel,
 * or Pages + a self-hosted Docker API).
 */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

/**
 * Applies CORS headers when the request's Origin is allowlisted. Idempotent, so it is
 * safe for server/api-router.js (self-hosted/dev) to also call this before dispatch.
 */
export function applyCors(req, res) {
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

export const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/** Fetch a URL as text with a browser UA and a hard timeout. */
export async function fetchText(url, { timeout = 12000, headers = {} } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': UA, accept: '*/*', ...headers },
      redirect: 'follow',
    });
    if (!res.ok) {
      throw new Error(`Upstream ${res.status} ${res.statusText} for ${url}`);
    }
    return await res.text();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Upstream timed out after ${timeout}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch a URL and parse it as JSON. */
export async function fetchJson(url, opts) {
  const text = await fetchText(url, { ...opts, headers: { accept: 'application/json', ...opts?.headers } });
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Upstream did not return valid JSON: ${url}`);
  }
}

/**
 * The app fetches fresh on every load, so responses are not cached at the CDN.
 * A tiny s-maxage still protects the upstream sites from rapid double-taps.
 */
export function sendJson(res, body, { status = 200, cacheSeconds = 60 } = {}) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', `public, s-maxage=${cacheSeconds}, stale-while-revalidate=300`);
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

/**
 * Every route wraps its body in this. A failing upstream returns a structured
 * error the UI can render as a friendly message instead of a blank screen.
 *
 * Also the only place a Vercel-hosted route gets CORS applied — server/api-router.js
 * (self-hosted, vite dev) does it too before dispatch, but Vercel calls this module's
 * default export directly and never goes through that router.
 */
export function handleErrors(handler, sourceLabel) {
  return async (req, res) => {
    applyCors(req, res);
    // A preflight needs those headers and nothing else.
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }
    try {
      await handler(req, res);
    } catch (err) {
      console.error(`[${sourceLabel}]`, err);
      sendJson(
        res,
        {
          ok: false,
          source: sourceLabel,
          error: err.message || 'Unknown error',
          hint: `Could not reach or parse ${sourceLabel}. The site may be down or may have changed structure.`,
        },
        { status: 502, cacheSeconds: 0 },
      );
    }
  };
}
