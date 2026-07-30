/**
 * Everything the app remembers lives in localStorage — there is no backend
 * database. Keys are namespaced so `clearAll` can wipe app data without touching
 * anything else on the origin.
 */
const PREFIX = 'umass:';

export const KEYS = {
  doneAssignments: `${PREFIX}done-assignments`,
  quickEvents: `${PREFIX}quick-events`,
  canvasCalendars: `${PREFIX}canvas-calendars`,
  // Legacy single-feed setting, migrated into `feeds` on first read.
  canvasFeed: `${PREFIX}canvas-feed`,
  // ICS calendar feeds (Canvas, Google Calendar, anything else).
  feeds: `${PREFIX}feeds`,
  // Name and interests gathered during onboarding; drives the Today brief.
  profile: `${PREFIX}profile`,
  theme: `${PREFIX}theme`,
  googleToken: `${PREFIX}google-token`,
};

export function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private-mode failures are non-fatal; the app still works for this session.
  }
  // Let other hooks in this tab react — the native `storage` event only fires cross-tab.
  window.dispatchEvent(new CustomEvent('umass:storage', { detail: { key } }));
}

export function remove(key) {
  localStorage.removeItem(key);
  window.dispatchEvent(new CustomEvent('umass:storage', { detail: { key } }));
}

/**
 * Wipe this app's keys. `keepAuth` preserves how you are connected to Canvas
 * (feed link, chosen calendars, Google token) so "clear my data" does not mean
 * "set the app up again".
 */
const CONNECTION_KEYS = [
  KEYS.googleToken,
  KEYS.canvasFeed,
  KEYS.canvasCalendars,
  KEYS.feeds,
  // Your name and interests are settings, not "data" — clearing to-do marks
  // should not make the app ask who you are again.
  KEYS.profile,
  KEYS.theme,
];

export function clearAll({ keepAuth = false } = {}) {
  for (const key of Object.values(KEYS)) {
    if (keepAuth && CONNECTION_KEYS.includes(key)) continue;
    localStorage.removeItem(key);
  }
  window.dispatchEvent(new CustomEvent('umass:storage', { detail: { key: '*' } }));
}

/** Rough byte count of what the app is storing, for the Settings screen. */
export function usageBytes() {
  let total = 0;
  for (const key of Object.values(KEYS)) {
    total += (localStorage.getItem(key) || '').length;
  }
  return total;
}
