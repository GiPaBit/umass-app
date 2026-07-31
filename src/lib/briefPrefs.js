import { KEYS, read, write } from './storage.js';

export const DEFAULT_BRIEF_PREFS = {
  animate: true,
  // Both the "right now" and "looking ahead" briefs by default — the
  // "Look ahead" tap is only needed once this is turned off.
  showWeekImmediately: true,
};

export function getBriefPrefs() {
  return { ...DEFAULT_BRIEF_PREFS, ...(read(KEYS.briefPrefs, null) || {}) };
}

export function setBriefPrefs(patch) {
  const next = { ...getBriefPrefs(), ...patch };
  write(KEYS.briefPrefs, next);
  return next;
}
