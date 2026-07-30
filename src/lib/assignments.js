import { getCanvasAssignments } from './api.js';
import { listFeeds } from './feeds.js';
import { isConfigured as googleConfigured, isSignedIn, listAssignments } from './google.js';
import { KEYS, read } from './storage.js';

/**
 * Assignments can arrive two ways, and the screens should not care which:
 *
 *  1. **Canvas ICS feed** (default) — the serverless proxy reads Canvas's own
 *     calendar feed. No Google account, no OAuth, nothing an IT admin can switch
 *     off. This is the recommended path.
 *
 *  2. **Google Calendar** — for when the Canvas feed is already subscribed to in
 *     Google and you would rather read it from there. Needs a Google Cloud OAuth
 *     client, which some Workspace orgs (including umass.edu) disable.
 *
 * Both return the identical assignment shape.
 */

export const SOURCE = {
  none: 'none',
  ics: 'ics',
  google: 'google',
};

/** Which source is actually usable right now, preferring ICS feeds. */
export function activeSource() {
  if (listFeeds().length > 0) return SOURCE.ics;

  const calendars = read(KEYS.canvasCalendars, []);
  if (googleConfigured() && isSignedIn() && calendars.length > 0) return SOURCE.google;

  return SOURCE.none;
}

export function isConfigured() {
  return activeSource() !== SOURCE.none;
}

/** Fetch assignments from whichever source is set up. */
export async function fetchAssignments() {
  const source = activeSource();

  if (source === SOURCE.ics) {
    return getCanvasAssignments(listFeeds());
  }
  if (source === SOURCE.google) {
    return listAssignments(read(KEYS.canvasCalendars, []));
  }
  return [];
}

/** Strip the trailing "[COURSE]" Canvas appends to assignment titles. */
export function titleWithoutCourse(title = '') {
  return title.replace(/\s*\[[^\]]+\]\s*$/, '').trim();
}
