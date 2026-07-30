/**
 * Thin client for the serverless routes in /api. Kept free of React so the same
 * calls can be reused as-is if this ever moves to React Native.
 */

/**
 * Every tab stays mounted, so Today and Dining both ask for /api/dining the
 * moment the app opens (and React's StrictMode doubles that again in dev).
 * Identical in-flight requests share one promise, so each upstream site is hit
 * once per load instead of four times. It holds nothing after settling — a
 * refresh still goes to the network.
 */
const inFlight = new Map();

/**
 * Where /api lives. Empty — the default, and what the Docker image is built with —
 * means same origin. The GitHub Pages build points this at the self-hosted container,
 * because Pages is static and cannot run api/*.js.
 */
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

function get(path) {
  const existing = inFlight.get(path);
  if (existing) return existing;

  const request = fetchJson(path).finally(() => inFlight.delete(path));
  inFlight.set(path, request);
  return request;
}

const SNAPSHOT_PREFIX = 'umass:snapshot:';

/**
 * Remember the last good response per endpoint, so opening with no signal shows
 * what the app last knew — stamped with when — instead of four empty cards.
 * Snapshots are only ever read when the network attempt fails.
 *
 * Keyed on the bare path, never on API_BASE + path: pointing the app at a different
 * backend would otherwise orphan every snapshot already on the device.
 */
function saveSnapshot(path, body) {
  try {
    localStorage.setItem(SNAPSHOT_PREFIX + path, JSON.stringify({ at: Date.now(), body }));
  } catch {
    // Storage full or unavailable — the app just becomes online-only.
  }
}

function readSnapshot(path) {
  try {
    const raw = localStorage.getItem(SNAPSHOT_PREFIX + path);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSnapshots() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(SNAPSHOT_PREFIX)) localStorage.removeItem(key);
  }
}

export function snapshotBytes() {
  let total = 0;
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(SNAPSHOT_PREFIX)) total += localStorage.getItem(key).length;
  }
  return total;
}

async function fetchJson(path) {
  try {
    const res = await fetch(API_BASE + path, { headers: { accept: 'application/json' } });
    let body;
    try {
      body = await res.json();
    } catch {
      throw new Error(`${path} returned a non-JSON response (${res.status})`);
    }
    if (!res.ok || body?.ok === false) {
      const err = new Error(body?.hint || body?.error || `Request failed (${res.status})`);
      err.detail = body?.error;
      err.source = body?.source;
      throw err;
    }
    saveSnapshot(path, body);
    return body;
  } catch (err) {
    const cached = readSnapshot(path);
    if (!cached) throw err;
    // Flagged stale so the UI can say how old this is.
    return { ...cached.body, stale: true, cachedAt: cached.at };
  }
}

/** All dining halls (hours) plus every cafe/Blue Wall venue with today's hours. */
export const getDiningOverview = () => get('/api/dining');

/** Today's full menu for one dining commons, by slug. */
export const getHallMenu = (slug) => get(`/api/dining?hall=${encodeURIComponent(slug)}`);

/** Merged official events feed (Localist + Athletics). */
export const getEvents = (days = 21) => get(`/api/events?days=${days}`);

/** RecWell facility hours plus intramural / club sport / fitness info. */
export const getRec = () => get('/api/rec');

/**
 * Assignments and events from one or more ICS calendar feeds.
 * POSTed so the feed URLs — which are themselves the credentials — stay out of
 * logs, history and referrers. Not coalesced or cached, for the same reason.
 *
 * Accepts either an array of feed objects or a single URL string.
 */
export async function getCanvasAssignments(feeds) {
  const payload = typeof feeds === 'string' ? { feed: feeds } : { feeds };

  // Prefixed separately because this one does not go through fetchJson.
  const res = await fetch(`${API_BASE}/api/canvas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Canvas request failed (${res.status})`);
  }
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.error || body?.hint || `Canvas request failed (${res.status})`);
  }
  return body.assignments;
}
