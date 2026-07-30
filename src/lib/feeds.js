import { KEYS, read, write } from './storage.js';

/**
 * Calendar feeds.
 *
 * Everything the Assignments tab shows comes from ICS URLs, which sidesteps
 * OAuth entirely. Two kinds are worth knowing about:
 *
 *  - **Canvas** — Calendar → "Calendar Feed". Assignments and course events.
 *  - **Google Calendar** — Settings → a calendar → "Secret address in iCal
 *    format". If Google is already subscribed to the Canvas feed, one Google
 *    feed brings across both your Canvas assignments *and* anything you add to
 *    that calendar by hand.
 *
 * Both are unguessable-but-unauthenticated URLs, so they are treated as secrets:
 * stored only on this device and POSTed (never in a query string) to /api/canvas.
 */

export const FEED_KINDS = {
  canvas: {
    id: 'canvas',
    label: 'Canvas',
    tone: 'blue',
    title: 'Canvas calendar feed',
    steps: [
      'Open Canvas and go to Calendar.',
      'Click “Calendar Feed” at the bottom right of the sidebar.',
      'Copy the link and paste it below.',
    ],
    placeholder: 'https://umass.instructure.com/feeds/calendars/user_….ics',
  },
  google: {
    id: 'google',
    label: 'Google Calendar',
    tone: 'green',
    title: 'Google Calendar secret address',
    steps: [
      'On a computer, open Google Calendar → Settings.',
      'Pick the calendar in the left sidebar (subscribe it to your Canvas feed first if you want assignments).',
      'Scroll to “Secret address in iCal format” and copy it.',
    ],
    placeholder: 'https://calendar.google.com/calendar/ical/…/private-…/basic.ics',
  },
  other: {
    id: 'other',
    label: 'Other',
    tone: 'gray',
    title: 'Any iCal (.ics) link',
    steps: ['Paste any public or secret .ics calendar URL.'],
    placeholder: 'https://example.com/calendar.ics',
  },
};

export function listFeeds() {
  const feeds = read(KEYS.feeds, null);
  if (Array.isArray(feeds)) return feeds;

  // Migrate the earlier single-feed setting into the list.
  const legacy = read(KEYS.canvasFeed, '');
  if (legacy && String(legacy).trim()) {
    const migrated = [makeFeed({ kind: 'canvas', label: 'Canvas', url: String(legacy).trim() })];
    write(KEYS.feeds, migrated);
    return migrated;
  }
  return [];
}

export function makeFeed({ kind = 'other', label, url }) {
  return {
    id: `feed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    label: label?.trim() || FEED_KINDS[kind]?.label || 'Calendar',
    url: url.trim(),
    addedAt: new Date().toISOString(),
  };
}

export function saveFeed(feed) {
  const all = listFeeds();
  const i = all.findIndex((f) => f.id === feed.id);
  if (i >= 0) all[i] = feed;
  else all.push(feed);
  write(KEYS.feeds, all);
  return all;
}

export function deleteFeed(id) {
  const next = listFeeds().filter((f) => f.id !== id);
  write(KEYS.feeds, next);
  return next;
}

/** Hide the credential part of a feed URL when showing it back to the user. */
export function maskUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    const shown = last.length > 10 ? `${last.slice(0, 4)}…${last.slice(-6)}` : last;
    return `${u.host}/…/${shown}`;
  } catch {
    return url.slice(0, 40);
  }
}
