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

function get(path) {
  const existing = inFlight.get(path);
  if (existing) return existing;

  const request = fetchJson(path).finally(() => inFlight.delete(path));
  inFlight.set(path, request);
  return request;
}

async function fetchJson(path) {
  const res = await fetch(path, { headers: { accept: 'application/json' } });
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
  return body;
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

  const res = await fetch('/api/canvas', {
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
