import { KEYS, read, write } from './storage.js';

export const DEFAULT_BRIEF_PREFS = {
  animate: true,
  // Both the "right now" and "looking ahead" briefs by default — the
  // "Look ahead" tap is only needed once this is turned off.
  showWeekImmediately: true,
  // Content toggles — all on by default so existing behavior is unchanged
  // until the brief is deliberately trimmed down in Settings.
  showAssignments: true,
  showEvents: true,
  // Sub-toggle of showEvents: whether athletics/sports games count as events
  // in the brief at all (independent of which teams the user follows).
  showSportsEvents: true,
  showWeather: true,
  useNicknames: true,
};

export function getBriefPrefs() {
  return { ...DEFAULT_BRIEF_PREFS, ...(read(KEYS.briefPrefs, null) || {}) };
}

export function setBriefPrefs(patch) {
  const next = { ...getBriefPrefs(), ...patch };
  write(KEYS.briefPrefs, next);
  return next;
}
