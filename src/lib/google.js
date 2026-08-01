import { KEYS, read, remove, write } from './storage.js';

/**
 * Google Calendar, read-only, for one person: me.
 *
 * Canvas has no public API for personal apps, but it publishes an ICS feed
 * (Canvas > Calendar > "Calendar Feed"). That feed gets subscribed to in Google
 * Calendar once, by hand, outside this app. From then on Canvas assignments show
 * up as an ordinary Google calendar, which is what this module reads.
 *
 * Auth uses the Google Identity Services token flow: no client secret, no
 * backend, no refresh tokens — a short-lived access token held in localStorage.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const isConfigured = () => Boolean(CLIENT_ID);

let gisPromise = null;

function loadGis() {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve(window.google);
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Could not load Google Identity Services.'));
    document.head.appendChild(script);
  });
  return gisPromise;
}

// --- token ----------------------------------------------------------------

function storedToken() {
  const token = read(KEYS.googleToken, null);
  if (!token?.access_token) return null;
  // Treat anything within 60s of expiry as already expired.
  if (Date.now() > token.expires_at - 60_000) return null;
  return token;
}

export function isSignedIn() {
  return Boolean(storedToken());
}

export function signOut() {
  const token = read(KEYS.googleToken, null);
  if (token?.access_token && window.google?.accounts?.oauth2) {
    // Best effort: tell Google to drop the grant too.
    try {
      window.google.accounts.oauth2.revoke(token.access_token, () => {});
    } catch {
      /* revocation is optional */
    }
  }
  remove(KEYS.googleToken);
}

/**
 * Get a usable access token, prompting only when necessary.
 * `interactive: false` attempts a silent refresh for an already-granted account.
 */
export async function getAccessToken({ interactive = true } = {}) {
  const existing = storedToken();
  if (existing) return existing.access_token;

  if (!isConfigured()) {
    throw new Error(
      'No Google client ID configured. Add VITE_GOOGLE_CLIENT_ID to .env.local — see README.',
    );
  }

  const google = await loadGis();

  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      prompt: interactive ? '' : 'none',
      callback: (response) => {
        if (response.error) {
          return reject(new Error(response.error_description || response.error));
        }
        write(KEYS.googleToken, {
          access_token: response.access_token,
          expires_at: Date.now() + Number(response.expires_in || 3600) * 1000,
        });
        resolve(response.access_token);
      },
      error_callback: (err) => reject(new Error(err?.message || 'Google sign-in was cancelled.')),
    });
    client.requestAccessToken();
  });
}

async function apiGet(path, params = {}) {
  const token = await getAccessToken({ interactive: false }).catch(() => getAccessToken());
  const url = new URL(`${CALENDAR_API}${path}`);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, v);

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    remove(KEYS.googleToken);
    throw new Error('Google session expired. Reconnect in Settings.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Google Calendar request failed (${res.status})`);
  }
  return res.json();
}

// --- calendars ------------------------------------------------------------

/** Every calendar on the account, so Settings can offer a "which of these is Canvas?" picker. */
export async function listCalendars() {
  const data = await apiGet('/users/me/calendarList', { maxResults: 250 });
  return (data.items || []).map((c) => ({
    id: c.id,
    name: c.summaryOverride || c.summary,
    description: c.description || null,
    color: c.backgroundColor || null,
    primary: Boolean(c.primary),
    // A subscribed ICS feed is read-only, which is a strong hint it is the Canvas feed.
    readOnly: c.accessRole === 'reader',
  }));
}

/**
 * Heuristic used to pre-select calendars the first time Settings is opened.
 * The Canvas feed usually carries the course name or "Canvas" in its title.
 */
export function looksLikeCanvas(calendar) {
  return /canvas|umass|course|assignment/i.test(`${calendar.name} ${calendar.description || ''}`);
}

// --- events ---------------------------------------------------------------

/** Pull events from the chosen calendars over a window, newest-first by start. */
export async function listAssignments(calendarIds, { daysBack = 7, daysAhead = 60 } = {}) {
  if (!calendarIds?.length) return [];

  const timeMin = new Date(Date.now() - daysBack * 86400000).toISOString();
  const timeMax = new Date(Date.now() + daysAhead * 86400000).toISOString();

  const perCalendar = await Promise.all(
    calendarIds.map(async (id) => {
      const data = await apiGet(`/calendars/${encodeURIComponent(id)}/events`, {
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
      });
      return (data.items || []).map((e) => normalize(e, id));
    }),
  );

  return perCalendar.flat().sort((a, b) => new Date(a.due) - new Date(b.due));
}

function normalize(e, calendarId) {
  // Canvas assignment events are all-day-ish with the due time in `dateTime`.
  const start = e.start?.dateTime || e.start?.date || null;
  const allDay = !e.start?.dateTime;

  return {
    id: e.id,
    calendarId,
    title: e.summary || '(untitled)',
    description: e.description ? stripHtml(e.description) : null,
    due: start,
    allDay,
    // Canvas puts a link back to the assignment in the event.
    url: e.htmlLink || null,
    sourceUrl: extractLink(e.description) || null,
    location: e.location || null,
    // "Course Name" is often bracketed in the Canvas event title: "Essay 2 [ENG 101]".
    course: extractCourse(e.summary || ''),
  };
}

function extractCourse(title) {
  const bracket = title.match(/\[([^\]]+)\]\s*$/);
  return bracket ? bracket[1].trim() : null;
}

export function titleWithoutCourse(title) {
  return title.replace(/\s*\[[^\]]+\]\s*$/, '').trim();
}

function stripHtml(html) {
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
  if (text.length <= 400) return text;
  const cut = text.slice(0, 400);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function extractLink(html) {
  if (!html) return null;
  const m = html.match(/https?:\/\/[^\s"'<>]+/);
  return m ? m[0] : null;
}
