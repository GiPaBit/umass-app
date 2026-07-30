import { handleErrors, sendJson } from './_lib/http.js';
import { fetchPublicText } from './_lib/safeFetch.js';
import { parseIcs, toAssignments } from './_lib/ics.js';

// Each feed is one outbound request, so an uncapped list turns this route into a
// request amplifier. Nobody subscribes to more calendars than this.
const MAX_FEEDS = 10;

/**
 * POST /api/canvas
 *   body: { feeds: [{ id, label, kind, url }] }        (also accepts { feed: "url" })
 *
 * Reads one or more ICS calendar feeds and returns their entries merged.
 * The browser cannot fetch these itself (no CORS headers), which is what this
 * proxy is for.
 *
 * POST rather than GET on purpose: these URLs are bearer credentials, and query
 * strings end up in access logs, history and referrer headers.
 */
export default handleErrors(async (req, res) => {
  if (req.method !== 'POST') {
    return sendJson(res, { ok: false, error: 'Use POST with a JSON body { feeds }.' }, { status: 405 });
  }

  const body = await readJsonBody(req);

  const feeds = Array.isArray(body?.feeds)
    ? body.feeds
    : body?.feed
      ? [{ id: 'single', label: 'Calendar', kind: 'canvas', url: body.feed }]
      : [];

  if (!feeds.length) throw new Error('No calendar feed URL supplied.');
  if (feeds.length > MAX_FEEDS) throw new Error(`Too many feeds at once (limit ${MAX_FEEDS}).`);

  const results = await Promise.allSettled(feeds.map((feed) => loadFeed(feed)));

  const items = [];
  const failures = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') items.push(...result.value);
    else {
      failures.push({
        what: feeds[i].label || 'Calendar',
        error: String(result.reason?.message || result.reason),
      });
    }
  });

  items.sort((a, b) => new Date(a.due) - new Date(b.due));

  sendJson(
    res,
    { ok: true, count: items.length, assignments: items, failures, fetchedAt: new Date().toISOString() },
    // Never cache: these feeds are personal.
    { cacheSeconds: 0 },
  );
}, 'Calendar feed');

async function loadFeed(feed) {
  const url = normaliseFeedUrl(feed.url || '');
  // fetchPublicText rather than fetchText: this URL came from a user, not from us.
  const text = await fetchPublicText(url, { timeout: 15000 });

  if (!/BEGIN:VCALENDAR/i.test(text)) {
    throw new Error('That URL did not return a calendar file. Check you copied the whole link.');
  }

  return toAssignments(parseIcs(text)).map((item) => ({
    ...item,
    // Namespaced so the same event in two feeds does not collide.
    id: `${feed.id || 'feed'}:${item.id}`,
    feedId: feed.id || null,
    feedLabel: feed.label || null,
    feedKind: feed.kind || 'other',
  }));
}

/** Canvas and Google both hand out webcal:// links; those are https underneath. */
function normaliseFeedUrl(feed) {
  const url = feed.trim().replace(/^webcal:\/\//i, 'https://');
  if (!url) throw new Error('Empty feed URL.');

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('That does not look like a valid URL.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Feed URL must be an http(s) or webcal link.');
  }
  return parsed.toString();
}

const MAX_BODY = 1e6;

function readJsonBody(req) {
  // Vercel parses JSON bodies for us; server/api-router.js — used by both `vite dev`
  // and the self-hosted server — deliberately leaves the raw stream alone.
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);

  // A declared length is refused before a byte is read, so an honest client gets the
  // error rather than the dropped socket the streaming guard below has to resort to.
  // A real payload is a few feed URLs — under a kilobyte.
  if (Number(req.headers['content-length']) > MAX_BODY) {
    return Promise.reject(new Error('Request body too large.'));
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    // On Vercel req.body was pre-parsed and this branch never ran, so the cap below was
    // never exercised: rejecting alone leaves the listener attached and `raw` still
    // growing. Self-hosted that is an unbounded allocation from one request, so destroy
    // the socket and latch, rather than just settling the promise.
    let settled = false;
    req.on('data', (chunk) => {
      if (settled) return;
      raw += chunk;
      if (raw.length > MAX_BODY) {
        settled = true;
        req.destroy();
        reject(new Error('Request body too large.'));
      }
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Request body was not valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}
