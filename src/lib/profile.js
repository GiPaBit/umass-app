import { KEYS, read, write } from './storage.js';

/**
 * What the app knows about you. Collected once on first launch, editable in
 * Settings forever after. Drives which dining halls, gyms and sports get
 * top billing in the Today brief.
 */
const DEFAULT_PROFILE = {
  name: '',
  diningFavourites: [],
  cafeFavourites: [],
  workoutPreferences: [],
  sports: [],
  onboarded: false,
};

export function getProfile() {
  return { ...DEFAULT_PROFILE, ...(read(KEYS.profile, null) || {}) };
}

export function setProfile(patch) {
  const next = { ...getProfile(), ...patch };
  write(KEYS.profile, next);
  return next;
}

export function isOnboarded() {
  return getProfile().onboarded === true;
}

/**
 * Workout preference categories. `recCenter` / `rockwell` / `nest` are simple
 * toggles (one facility each — nothing to expand). `groupFitness` and
 * `swimming` expand into a chip multi-select. Selections are stored as a flat
 * array of tokens on `profile.workoutPreferences`, plain for leaf groups
 * (`'rockwell'`) and namespaced for expandable ones (`'swimming:boyden-pool'`).
 *
 * `groupFitness.options` is a hand-picked static list, not scraped — the
 * questionnaire renders before /api/rec has ever been fetched (onboarding runs
 * before any tab has loaded), so it can't depend on live class names. Worth
 * revisiting once real class names are visible from the Fitness tab.
 */
export const WORKOUT_GROUPS = [
  { id: 'recCenter', name: 'Rec Center' },
  { id: 'rockwell', name: 'RockWell' },
  { id: 'nest', name: 'NEST' },
  {
    id: 'groupFitness',
    name: 'Group Fitness',
    options: ['Yoga', 'Cycling / Spin', 'HIIT', 'Strength & Conditioning', 'Dance / Zumba', 'Pilates', 'Cardio'],
  },
  {
    id: 'swimming',
    name: 'Swimming',
    options: ['Boyden Pool', 'Curry Hicks Pool'],
  },
];

/** "swimming" + "Boyden Pool" -> "swimming:boyden-pool" */
export function workoutToken(groupId, option) {
  if (!option) return groupId;
  return `${groupId}:${option.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
}

/** Facility-name substring to match a workout token against `rec.recwell.hours.facilities[].name`. */
const WORKOUT_FACILITY_MATCH = {
  recCenter: 'recreation center',
  rockwell: 'rockwell',
  'swimming:boyden-pool': 'boyden',
  'swimming:curry-hicks-pool': 'curry hicks',
};

export function workoutFacilityMatch(token) {
  return WORKOUT_FACILITY_MATCH[token] || null;
}

/** Sports as they appear in the Athletics RSS titles. */
export const SPORT_CHOICES = [
  'Football',
  "Men's Basketball",
  "Women's Basketball",
  'Ice Hockey',
  "Men's Soccer",
  "Women's Soccer",
  'Field Hockey',
  'Baseball',
  'Softball',
  'Lacrosse',
];

/** Does this event match one of the sports you follow? */
export function matchesSports(event, sports) {
  if (!sports?.length) return false;
  const haystack = `${event.title || ''} ${event.sport || ''} ${(event.categories || []).join(' ')}`;
  return sports.some((sport) => haystack.toLowerCase().includes(sport.toLowerCase()));
}

/** Loose name match so "Blue Wall" also matches "The Blue Wall". */
export function matchesName(name, favourites) {
  if (!favourites?.length || !name) return false;
  const n = name.toLowerCase();
  return favourites.some((f) => {
    const t = f.toLowerCase();
    return n.includes(t) || t.includes(n);
  });
}
