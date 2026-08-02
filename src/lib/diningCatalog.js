/**
 * The full UMass Dining catalogue, grouped the way people actually think about
 * eating on campus, plus real coordinates for the map.
 *
 * Coordinates come from OpenStreetMap's own POIs for these venues (checked
 * against the campus geometry baked into src/data/campusMap.json). A handful of
 * spots aren't mapped in OSM; those carry `lat: null` and are listed rather than
 * pinned, instead of being dropped somewhere invented.
 *
 * Venues sharing a location cluster into a single pin automatically — the nine
 * Blue Wall counters all sit at the Blue Wall coordinate, so they become one pin
 * that opens to show the lot.
 */

export const DINING_GROUPS = [
  {
    id: 'halls',
    name: 'Dining Halls',
    hint: 'The four residential commons',
    // Picking the group means "all of them", which is a reasonable thing to want.
    selectAllOnGroup: true,
    venues: [
      { name: 'Worcester Commons', lat: 42.393256, lon: -72.525107 },
      { name: 'Berkshire Dining Commons', lat: 42.381933, lon: -72.529864 },
      { name: 'Franklin Dining Commons', lat: 42.389268, lon: -72.522526 },
      { name: 'Hampshire Dining Commons', lat: 42.383856, lon: -72.530517 },
    ],
  },
  {
    id: 'bluewall',
    name: 'Blue Wall',
    hint: 'The Campus Center food court',
    // Blue Wall is the umbrella name, so choosing it takes every counter with it.
    selectAllOnGroup: true,
    venues: [
      { name: 'Paciugo', lat: 42.39153, lon: -72.52688 },
      { name: 'Tavola', lat: 42.39153, lon: -72.52688 },
      { name: 'Yum! Bakery', lat: 42.39153, lon: -72.52688 },
      { name: 'Green Fields', lat: 42.39153, lon: -72.52688 },
      { name: 'Tamales', lat: 42.39153, lon: -72.52688 },
      { name: 'Wasabi', lat: 42.39153, lon: -72.52688 },
      { name: 'Deli Delish', lat: 42.39153, lon: -72.52688 },
      { name: 'Star Ginger', lat: 42.39153, lon: -72.52688 },
      { name: 'The Grill', lat: 42.39153, lon: -72.52688 },
    ],
  },
  {
    id: 'cafes',
    name: 'Cafés & Markets',
    hint: 'Scattered across campus — pick the ones near you',
    // Deliberately does NOT select everything: these are all over the place.
    selectAllOnGroup: false,
    venues: [
      // Co-located with each other, but far enough from the Blue Wall coordinate
      // below to stay a distinct pin rather than being swallowed into it.
      { name: 'Harvest Market', lat: 42.39175, lon: -72.52676 },
      { name: "People's Organic Coffee", lat: 42.39175, lon: -72.52676 },
      // On the top floor of Worcester Commons — shares the hall's coordinate so
      // it clusters into the one Worcester pin along with the café and grab'n go.
      { name: 'The Commonwealth Restaurant', lat: 42.393256, lon: -72.525107 },
      { name: 'Worcester Café', lat: 42.393256, lon: -72.525107 },
      { name: 'Whitmore Café', lat: 42.385785, lon: -72.526834 },
      { name: 'Procrastination Station', lat: 42.389915, lon: -72.528317 },
      // Hampden Building, Southwest — next to Berkshire, not in the library.
      { name: 'Argo Tea', lat: 42.3824, lon: -72.5294 },
      { name: 'Roots Café', lat: 42.38816, lon: -72.530473 },
      { name: 'Courtside Café', lat: 42.389157, lon: -72.531676 },
      { name: 'ISB Café', lat: 42.392673, lon: -72.524785 },
      { name: 'Hampshire Café', lat: 42.383997, lon: -72.530455 },
      { name: "Peet's Coffee & Tea", lat: 42.39125, lon: -72.526283 },
      { name: 'Morrill Café', lat: 42.389623, lon: -72.524492 },
      { name: 'Newman Café', lat: 42.387285, lon: -72.521803 },
      { name: 'Snack Overflow', lat: 42.395537, lon: -72.530538 },
      { name: 'Post & Bean Café', lat: 42.38823, lon: -72.523747 },
      { name: 'Terrace', lat: 42.385047, lon: -72.525899 },
      // Not mapped in OpenStreetMap — listed, but no pin rather than a wrong one.
      { name: 'The Hub', lat: null, lon: null },
      { name: 'Carney Café', lat: null, lon: null },
    ],
  },
  {
    id: 'grabngo',
    name: "Grab 'n Go",
    hint: 'Quick pickup at each dining commons',
    selectAllOnGroup: false,
    venues: [
      { name: "Worcester Grab 'n Go", lat: 42.393256, lon: -72.525107 },
      { name: "Berkshire Grab 'n Go", lat: 42.381933, lon: -72.529864 },
      { name: "Franklin Grab 'n Go", lat: 42.389268, lon: -72.522526 },
      { name: "Hampshire Grab 'n Go", lat: 42.383856, lon: -72.530517 },
    ],
  },
  {
    id: 'foodtrucks',
    name: 'Food Trucks',
    hint: 'No fixed spot — check on the day',
    selectAllOnGroup: false,
    // No coordinates (they move) and no location/hours data exists for either —
    // `noLocation` suppresses the Location section, map links and map pin.
    // blurb/instagram/website are best-effort static info since the live site
    // has no per-truck data beyond a name — TODO: confirm/replace with real
    // copy and social links.
    venues: [
      {
        name: 'BabyBerk',
        lat: null,
        lon: null,
        noLocation: true,
        blurb: 'TBD — add a short description of what BabyBerk serves.',
        instagram: null,
        website: null,
      },
      {
        name: 'BabyBerk2',
        lat: null,
        lon: null,
        noLocation: true,
        blurb: 'TBD — add a short description of what BabyBerk2 serves.',
        instagram: null,
        website: null,
      },
    ],
  },
];

/** Shown in place of hours/location for venues with no fixed spot (food trucks). */
export const FOOD_TRUCK_NOTE = 'Location and hours vary.';

/** Flat list of every venue, tagged with its group. */
export const ALL_VENUES = DINING_GROUPS.flatMap((g) =>
  g.venues.map((v) => ({ ...v, groupId: g.id, groupName: g.name })),
);

export function venuesInGroup(groupId) {
  return DINING_GROUPS.find((g) => g.id === groupId)?.venues.map((v) => v.name) || [];
}

/** Like venuesInGroup, but returns the full catalogue entries rather than just names. */
export function venueEntriesInGroup(groupId) {
  return DINING_GROUPS.find((g) => g.id === groupId)?.venues || [];
}

/** Look up the catalogue entry for a live venue name from the dining site. */
export function findVenue(name) {
  if (!name) return null;
  const target = normalise(name);
  return (
    ALL_VENUES.find((v) => normalise(v.name) === target) ||
    ALL_VENUES.find((v) => normalise(v.name).includes(target) || target.includes(normalise(v.name))) ||
    null
  );
}

/** Food trucks and anything else with no fixed spot — no Location section, map link, or pin. */
export function hasNoFixedLocation(name) {
  return findVenue(name)?.noLocation === true;
}

/**
 * Deep links to open a venue's location in Apple Maps / Google Maps. Falls back
 * to a name + "UMass Amherst" text search for the couple of venues with no known
 * coordinate (The Hub, Carney Café), so every place gets a working link.
 */
export function mapLinks(venue) {
  const catalogVenue = venue?.lat != null ? venue : findVenue(venue?.name);
  const name = venue?.name || catalogVenue?.name || '';

  if (catalogVenue?.lat != null && catalogVenue?.lon != null) {
    const { lat, lon } = catalogVenue;
    return {
      apple: `https://maps.apple.com/?ll=${lat},${lon}&q=${encodeURIComponent(name)}`,
      google: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    };
  }

  const query = encodeURIComponent(`${name} UMass Amherst`);
  return {
    apple: `https://maps.apple.com/?q=${query}`,
    google: `https://www.google.com/maps/search/?api=1&query=${query}`,
  };
}

/** Accents, punctuation and "the" all vary between the site and this list. */
export function normalise(name = '') {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bthe\b/g, '')
    .replace(/\bcafe\b/g, 'cafe')
    .trim();
}

/**
 * Cluster venues that share a spot into single pins.
 * `radiusM` is generous enough to merge one building's counters but tight enough
 * to keep Harvest Market distinct from Blue Wall next door.
 */
export function clusterPins(venues, radiusM = 22) {
  const pins = [];

  for (const venue of venues) {
    if (venue.lat == null || venue.lon == null) continue;

    const existing = pins.find((p) => distanceM(p.lat, p.lon, venue.lat, venue.lon) <= radiusM);
    if (existing) {
      existing.venues.push(venue);
      continue;
    }
    pins.push({ id: `pin-${pins.length}`, lat: venue.lat, lon: venue.lon, venues: [venue] });
  }

  // Name each pin after whatever anchors that spot: the dining hall if one is
  // there, else Blue Wall, else the single venue's own name.
  for (const pin of pins) {
    if (pin.venues.length === 1) {
      pin.label = pin.venues[0].name;
      continue;
    }
    const hall = pin.venues.find((v) => v.groupId === 'halls');
    const hasBlueWall = pin.venues.some((v) => v.groupId === 'bluewall');
    pin.label = hall ? hall.name : hasBlueWall ? 'Blue Wall' : pin.venues[0].name;
  }

  return pins;
}

function distanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
