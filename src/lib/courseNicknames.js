import { KEYS, read, write } from './storage.js';

/**
 * Canvas lets you rename a course in its own UI, but that nickname lives only
 * in your Canvas browser session — it's never in the calendar feed, so there's
 * no way to read it from here. This is the same idea, done locally instead:
 * a flat map of the feed's own course code (the `[BRACKETED]` label Canvas
 * bakes into every assignment title) to whatever you'd rather call it.
 */
export function getCourseNicknames() {
  return read(KEYS.courseNicknames, {}) || {};
}

export function setCourseNickname(code, nickname) {
  if (!code) return;
  const next = { ...getCourseNicknames() };
  const trimmed = nickname?.trim();
  if (trimmed) next[code] = trimmed;
  else delete next[code]; // blank clears back to the real course code
  write(KEYS.courseNicknames, next);
}

/** The nickname for a course code if one is set, else the code itself. */
export function displayCourse(code) {
  if (!code) return code;
  return getCourseNicknames()[code] || code;
}
