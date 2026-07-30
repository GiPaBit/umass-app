// Shared fetch + response helpers for every API route.
// Files prefixed with `_` are ignored by Vercel's route scanner, so this stays a library.

const UA =
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
 */
export function handleErrors(handler, sourceLabel) {
  return async (req, res) => {
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
