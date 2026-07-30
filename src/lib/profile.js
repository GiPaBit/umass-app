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
  gymFavourite: '',
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

/** The four residential dining commons, offered during onboarding. */
export const DINING_CHOICES = ['Worcester', 'Franklin', 'Hampshire', 'Berkshire'];

/** The best-known retail spots. Matched loosely against live venue names. */
export const CAFE_CHOICES = [
  'Blue Wall',
  "People's Organic Coffee",
  'Harvest Market',
  'Tavola',
  'Green Fields',
  'Star Ginger',
  'Wasabi',
  'Deli Delish',
  'Yum! Bakery',
  'Procrastination Station',
  'Whitmore Café',
  'Courtside Café',
];

export const GYM_CHOICES = [
  'Recreation Center',
  'RockWell Climbing Gym',
  'Boyden',
  'Curry Hicks',
  'No preference',
];

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
