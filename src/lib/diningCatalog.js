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
    // Dining halls never get a scraped teaser/description (only hours + menu
    // are on umassdining.com's own hall pages) — these blurbs are the only
    // description they'll ever have, drafted from general knowledge of each
    // hall's building/theme. TODO: user review pass before shipping.
    venues: [
      {
        name: 'Worcester Commons',
        lat: 42.393256,
        lon: -72.525107,
        blurb: "UMass's largest dining commons, known for its self-serve stir-fry station and wide range of global cuisine.",
      },
      {
        name: 'Berkshire Dining Commons',
        lat: 42.381933,
        lon: -72.529864,
        blurb: 'Near Southwest, with a strong lineup of vegan, vegetarian, and halal options alongside its regular stations.',
      },
      {
        name: 'Franklin Dining Commons',
        lat: 42.389268,
        lon: -72.522526,
        blurb: 'The coziest of the four halls, near Central, leaning toward comfort food classics.',
      },
      {
        name: 'Hampshire Dining Commons',
        lat: 42.383856,
        lon: -72.530517,
        blurb: 'Near Southwest, known for made-to-order and wood-fired pizza stations.',
      },
    ],
  },
  {
    id: 'bluewall',
    name: 'Blue Wall',
    hint: 'The Campus Center food court',
    // Blue Wall is the umbrella name, so choosing it takes every counter with it.
    selectAllOnGroup: true,
    // These blurbs mirror umassdining.com's own per-counter descriptions
    // (condensed to one sentence) — used only when the live retail-listing
    // scrape doesn't return a description for some reason; the live teaser
    // is preferred when present.
    venues: [
      { name: 'Paciugo', lat: 42.39153, lon: -72.52688, blurb: 'Italian gelato made fresh daily from natural ingredients, lighter than ice cream.' },
      { name: 'Tavola', lat: 42.39153, lon: -72.52688, blurb: 'House-made pizza, pasta, hummus bowls, and wraps.' },
      { name: 'Yum! Bakery', lat: 42.39153, lon: -72.52688, blurb: 'Full-service bakery for cookies, pastries, cakes, and French macarons.' },
      { name: 'Green Fields', lat: 42.39153, lon: -72.52688, blurb: 'Build-your-own salads and wraps with fresh, sustainably sourced ingredients.' },
      { name: 'Tamales', lat: 42.39153, lon: -72.52688, blurb: 'Burritos, quesadillas, rice bowls, and salads made with authentic Mexican ingredients.' },
      { name: 'Wasabi', lat: 42.39153, lon: -72.52688, blurb: 'Sushi rolls, teppanyaki, donburi, and miso soup made with sustainably harvested seafood.' },
      { name: 'Deli Delish', lat: 42.39153, lon: -72.52688, blurb: 'Specialty grinders and hot sandwiches on fresh-baked bread with house-roasted meats.' },
      { name: 'Star Ginger', lat: 42.39153, lon: -72.52688, blurb: 'Vietnamese, Thai, and other Asian specialties, including pho and bibimbap rice bowls.' },
      { name: 'The Grill', lat: 42.39153, lon: -72.52688, blurb: 'Burgers and grilled sandwiches made with grass-fed beef or all-natural turkey, plus chicken fingers and fries.' },
    ],
  },
  {
    id: 'cafes',
    name: 'Cafés & Markets',
    hint: 'Scattered across campus — pick the ones near you',
    // Deliberately does NOT select everything: these are all over the place.
    selectAllOnGroup: false,
    // Blurbs below mirror umassdining.com's own descriptions (condensed to one
    // sentence) — a fallback for when the live retail-listing scrape doesn't
    // return a description; the live teaser is preferred when present.
    venues: [
      // Co-located with each other, nudged further from the Blue Wall
      // coordinate below than their exact real-world spot — close enough on a
      // stylised map to still merge together, which was making the two pins
      // hard to tap apart.
      { name: 'Harvest Market', lat: 42.39219, lon: -72.52652, blurb: 'Grocery-style market on the Campus Center concourse with a global hot bar, salad bar, and grab-and-go options.' },
      { name: "People's Organic Coffee", lat: 42.39219, lon: -72.52652, blurb: 'Organic coffee, teas, salads, and baked pastries on the Campus Center concourse.' },
      // On the top floor of Worcester Commons — shares the hall's coordinate so
      // it clusters into the one Worcester pin along with the café and grab'n go.
      { name: 'The Commonwealth Restaurant', lat: 42.393256, lon: -72.525107, blurb: "Student-run, full-service restaurant on Worcester Commons' top floor with table service and campus views." },
      { name: 'Worcester Café', lat: 42.393256, lon: -72.525107, blurb: "Coffee, espresso drinks, smoothies, and breakfast sandwiches on Worcester Commons' first floor." },
      { name: 'Whitmore Café', lat: 42.385785, lon: -72.526834, blurb: 'Coffee, pastries, and paninis inside the Whitmore Administration Building.' },
      { name: 'Procrastination Station', lat: 42.389915, lon: -72.528317, blurb: 'Coffee, espresso, and grab-and-go food inside the W.E.B. Du Bois Library.' },
      // Hampden Building, Southwest — next to Berkshire, not in the library.
      { name: 'Argo Tea', lat: 42.3824, lon: -72.5294, blurb: 'Signature and loose-leaf teas, Caribou coffee, and paninis in the Hampden Building.' },
      { name: 'Roots Café', lat: 42.38816, lon: -72.530473, blurb: 'Salad bar, artisan pizza, mac and cheese, and quesadillas in the Honors Residential Complex.' },
      { name: 'Courtside Café', lat: 42.389157, lon: -72.531676, blurb: 'Snacks, smoothies, sandwiches, and salads on the second level of the Recreation Center.' },
      { name: 'ISB Café', lat: 42.392673, lon: -72.524785, blurb: 'Starbucks coffee and snacks inside the Integrated Sciences Building.' },
      { name: 'Hampshire Café', lat: 42.383997, lon: -72.530455, blurb: "Starbucks coffee, artisan sandwiches, and salads on Hampshire Dining Commons' first floor." },
      { name: "Peet's Coffee & Tea", lat: 42.39125, lon: -72.526283, blurb: "Peet's drip coffee, espresso, and grab-and-go snacks on the Integrated Learning Center's first floor." },
      { name: 'Morrill Café', lat: 42.389623, lon: -72.524492, blurb: 'Coffee, espresso drinks, and fresh-baked grab-and-go food inside Morrill Science Center.' },
      { name: 'Newman Café', lat: 42.387285, lon: -72.521803, blurb: 'Breakfast and lunch, including cage-free eggs and burgers, inside the Newman Center.' },
      { name: 'Snack Overflow', lat: 42.395537, lon: -72.530538, blurb: 'Coffee and specialty drinks inside the Manning College of Information & Computer Sciences.' },
      { name: 'Post & Bean Café', lat: 42.38823, lon: -72.523747, blurb: 'Coffee, espresso, pastries, and sandwiches inside the John W. Olver Design Building.' },
      { name: 'Terrace', lat: 42.385047, lon: -72.525899, blurb: "Breakfast tarts, club sandwiches, salads, and Peet's espresso drinks in the Fieldstone Apartments." },
      // Not mapped in OpenStreetMap — listed, but no pin rather than a wrong one.
      { name: 'The Hub', lat: null, lon: null, blurb: 'Locally roasted Esselon coffee, pastries, and gourmet sandwiches in the Furcolo building.' },
      { name: 'Carney Café', lat: null, lon: null, blurb: 'Flatbread pizzas, grilled cheese, baked goods, and Peet’s coffee inside Isenberg.' },
    ],
  },
  {
    id: 'grabngo',
    name: "Grab 'n Go",
    hint: 'Quick pickup at each dining commons',
    selectAllOnGroup: false,
    venues: [
      {
        name: "Worcester Grab 'n Go",
        lat: 42.393256,
        lon: -72.525107,
        blurb: 'Pre-packaged breakfast, lunch, and snack items to grab quickly from inside Worcester Commons.',
      },
      {
        name: "Berkshire Grab 'n Go",
        lat: 42.381933,
        lon: -72.529864,
        blurb: 'Pre-packaged breakfast, lunch, and snack items to grab quickly from inside Berkshire Dining Commons.',
      },
      {
        name: "Franklin Grab 'n Go",
        lat: 42.389268,
        lon: -72.522526,
        blurb: 'Pre-packaged breakfast, lunch, and snack items to grab quickly from inside Franklin Dining Commons.',
      },
      {
        name: "Hampshire Grab 'n Go",
        lat: 42.383856,
        lon: -72.530517,
        blurb: 'Pre-packaged breakfast, lunch, and snack items to grab quickly from inside Hampshire Dining Commons.',
      },
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
        blurb:
          'The BabyBerk food trucks are illusive, but have great food (#1 Dining)… find them around campus, at events, or check their Instagram page to see where they’ll be.',
        instagram: null,
        website: null,
      },
      {
        name: 'BabyBerk2',
        lat: null,
        lon: null,
        noLocation: true,
        blurb:
          'The BabyBerk food trucks are illusive, but have great food (#1 Dining)… find them around campus, at events, or check their Instagram page to see where they’ll be.',
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
