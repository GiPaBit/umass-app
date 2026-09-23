import { KEYS, read, write } from './storage.js';

/**
 * Preset shorthand for the dining/rec venue names the Today Brief already
 * says in full — same idea as courseNicknames.js, but for places instead of
 * Canvas course codes. These ship pre-filled but are otherwise just ordinary
 * entries in the same user-editable map: blanking one out here turns it off
 * exactly like clearing a custom entry would.
 */
export const DEFAULT_VENUE_NICKNAMES = {
  Worcester: 'Woo',
  Hampshire: 'Hamp',
  Berkshire: 'Berk',
  Franklin: 'Frank',
  'RockWell Climbing Gym': 'RockWell',
  "People's Organic Coffee": "People's Organic",
};

/** The full map (presets + anything the user has added or overridden). */
export function getVenueNicknames() {
  return { ...DEFAULT_VENUE_NICKNAMES, ...(read(KEYS.venueNicknames, null) || {}) };
}

/** name must match the venue's exact display name (case-insensitively); '' turns it off. */
export function setVenueNickname(name, nickname) {
  if (!name?.trim()) return;
  const next = { ...getVenueNicknames() };
  next[name] = nickname?.trim() || '';
  write(KEYS.venueNicknames, next);
}

/** Removes a custom (non-preset) entry entirely, rather than leaving a blank override behind. */
export function removeVenueNickname(name) {
  const next = { ...getVenueNicknames() };
  delete next[name];
  write(KEYS.venueNicknames, next);
}

/**
 * Applies the nickname map to a display name, if nicknames are turned on.
 * Exact match, case-insensitive only — a substring match would also catch
 * "Worcester Café" (a separate Blue Wall venue) under a "Worcester" nickname
 * meant for the Worcester dining hall, which is wrong.
 */
export function displayVenue(name, enabled = true) {
  if (!enabled || !name) return name;
  const n = name.toLowerCase();
  for (const [key, nickname] of Object.entries(getVenueNicknames())) {
    if (!nickname) continue; // blanked preset or empty custom row — leave the real name alone
    if (key.toLowerCase() === n) return nickname;
  }
  return name;
}
