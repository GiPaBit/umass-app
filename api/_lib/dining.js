import { fetchText } from './http.js';
import { attr, blocksByClass, decodeEntities, firstSentences, textOf } from './html.js';

export const DINING_BASE = 'https://www.umassdining.com';

/** The four residential dining commons — these are the only locations with full daily menus. */
export const HALLS = [
  { slug: 'worcester', name: 'Worcester' },
  { slug: 'franklin', name: 'Franklin' },
  { slug: 'hampshire', name: 'Hampshire' },
  { slug: 'berkshire', name: 'Berkshire' },
];

/** Retail category pages. Each lists its venues *with today's hours inline*, so one fetch covers many venues. */
export const RETAIL_CATEGORIES = [
  { slug: 'campus-center', name: 'Campus Center & Blue Wall' },
  { slug: 'around-campus', name: 'Cafes Around Campus' },
];

// ---------------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------------

/**
 * Parse a dining commons menu page.
 *
 * Markup shape (Drupal, stable for years):
 *   <h1 id="content_title">Menu For Wed July 29, 2026</h1>
 *   <div id="breakfast_menu">
 *     <h2 class='menu_category_name'>Station</h2>
 *     <li class="lightbox-nutrition"><a data-dish-name="..." data-calories="..." ...>
 *
 * NOTE: the site ignores a ?date= query param and always serves today, so there
 * is no point exposing date selection in the UI.
 */
export function parseMenuPage(html) {
  const dateLine = html.match(/<h1 id="content_title">([^<]*)<\/h1>/i);

  const meals = [];
  for (const meal of ['breakfast', 'lunch', 'dinner', 'latenight', 'grabngo']) {
    const panel = extractPanel(html, `${meal}_menu`);
    if (!panel) continue;
    const stations = parseStations(panel);
    const itemCount = stations.reduce((n, s) => n + s.items.length, 0);
    if (itemCount === 0) continue;
    meals.push({ meal, label: titleCase(meal), stations, itemCount });
  }

  return {
    dateLabel: dateLine ? textOf(dateLine[1]).replace(/^Menu For\s*/i, '') : '',
    meals,
  };
}

/** Grab the inner HTML of <div id="{id}"> up to the start of the next meal panel. */
function extractPanel(html, id) {
  const open = new RegExp(`<div id="${id}"[^>]*>`, 'i');
  const m = html.match(open);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = html.slice(start);
  // Panels are siblings, so the next panel div marks this one's end.
  const next = rest.search(/<div id="(?:breakfast|lunch|dinner|latenight|grabngo)_menu"/i);
  return next === -1 ? rest : rest.slice(0, next);
}

/** Walk a meal panel, assigning each dish to the most recent station heading. */
function parseStations(panel) {
  const token = /<h2\s+class=['"]menu_category_name['"]>([\s\S]*?)<\/h2>|<li\s+class="lightbox-nutrition">([\s\S]*?)<\/li>/gi;
  const stations = [];
  let current = null;
  let m;

  while ((m = token.exec(panel))) {
    if (m[1] !== undefined) {
      current = { name: cleanStation(textOf(m[1])), items: [] };
      stations.push(current);
    } else if (m[2] !== undefined) {
      if (!current) {
        current = { name: 'Menu', items: [] };
        stations.push(current);
      }
      const item = parseDish(m[2]);
      if (item) current.items.push(item);
    }
  }
  return stations.filter((s) => s.items.length > 0);
}

function parseDish(li) {
  const a = li.match(/<a\b[^>]*>/i);
  if (!a) return null;
  const tag = a[0];
  const name = attr(tag, 'data-dish-name');
  if (!name) return null;

  const diet = attr(tag, 'data-clean-diet-str');
  const allergens = attr(tag, 'data-allergens');
  const calories = attr(tag, 'data-calories');

  return {
    name,
    calories: calories ? Number(calories) || null : null,
    servingSize: attr(tag, 'data-serving-size') || null,
    // "Antibiotic Free, Vegan" -> ["Antibiotic Free", "Vegan"]
    diets: splitList(diet),
    allergens: splitList(allergens),
    // Carbon rating A/B/C, shown by the site as a leaf icon.
    carbonRating: attr(tag, 'data-carbon-list') || null,
    nutrition: {
      protein: attr(tag, 'data-protein') || null,
      totalCarb: attr(tag, 'data-total-carb') || null,
      totalFat: attr(tag, 'data-total-fat') || null,
      sodium: attr(tag, 'data-sodium') || null,
      sugars: attr(tag, 'data-sugars') || null,
      dietaryFiber: attr(tag, 'data-dietary-fiber') || null,
    },
  };
}

function splitList(str) {
  if (!str) return [];
  return decodeEntities(str)
    .split(/\s*,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Station names carry internal suffixes like "Latino 2  WOR" — drop the location code. */
function cleanStation(name) {
  return name
    .replace(/\s+(WOR|FRA|HAM|BERK|BK)\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function titleCase(meal) {
  return { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', latenight: 'Late Night', grabngo: "Grab 'n Go" }[meal] || meal;
}

// ---------------------------------------------------------------------------
// Hours
// ---------------------------------------------------------------------------

/**
 * Dining commons location pages list hours as labelled sections:
 *   <div id="dining_location_hours"><h2>Summer Hours</h2>
 *     <div id="hours_of_operation_block"><p><em>Monday 06/15 - Sunday 08/09</em><br/>7:00 AM - 9:00 PM</p></div>
 *
 * The same wrapper is reused for "Accepted Payment" and "Location Manager",
 * so sections are filtered down to the ones that are actually about hours.
 */
export function parseLocationHours(html) {
  const sections = [];
  // The <h2> title and its hours block are siblings *inside* one wrapper, and a
  // page carries several pairs ("Summer Hours", "Grab'n Go Summer Hours",
  // "Regular Hours of Operation"), so pair them up directly rather than
  // splitting on the wrapper.
  // The title capture must stop at the *first* </h2>, otherwise a lazy match
  // starting at some earlier nav heading swallows the whole page up to here.
  const re = /<h2[^>]*>((?:(?!<\/h2>)[\s\S])*)<\/h2>\s*<div id="hours_of_operation_block[^"]*">([\s\S]*?)<\/div>/gi;
  let m;

  while ((m = re.exec(html))) {
    const title = textOf(m[1]);
    if (!/hour/i.test(title)) continue; // skips Accepted Payment / Location Manager

    const lines = [];
    const pRe = /<p>([\s\S]*?)<\/p>/gi;
    let p;
    while ((p = pRe.exec(m[2]))) {
      // A <br> splits a venue's date range from its actual times.
      for (const raw of p[1].split(/<br\s*\/?>/i)) {
        const text = textOf(raw);
        if (!text) continue;
        lines.push({
          text,
          // <strong>/<em> wrappers mark sub-venue names and date ranges;
          // anything with a clock time is the hours themselves.
          kind: /\d\s*(?::\d{2})?\s*(?:am|pm)|midnight|noon|closed/i.test(text) ? 'hours' : 'label',
        });
      }
    }
    if (lines.length) sections.push({ title, lines });
  }

  // The hours sidebar is rendered twice (desktop + mobile breakpoints); keep one copy.
  const seen = new Set();
  return sections.filter((s) => {
    const key = `${s.title}|${s.lines.map((l) => l.text).join('|')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Retail category pages ("Campus Center", "Around Campus") list every venue with
 * today's hours already rendered, which is why the Today tab can show what's open
 * right now from just two requests.
 */
// Food trucks have no fixed location/hours and are handled separately (see
// src/lib/diningCatalog.js's `foodtrucks` group) — exclude them here so they
// don't also show up duplicated under a retail category like "Cafes Around
// Campus", which the site apparently lists them on too.
const KNOWN_FOOD_TRUCKS = ['babyberk', 'babyberk2'];

export function parseRetailListing(html, categorySlug) {
  const venues = [];
  const entryRe = /<h2 id="menu_item_title"[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2 id="menu_item_title"|<\/ul>)/gi;
  let m;
  while ((m = entryRe.exec(html))) {
    const name = textOf(m[1]);
    const body = m[2];
    if (!name) continue;
    if (KNOWN_FOOD_TRUCKS.includes(name.toLowerCase().replace(/[^a-z0-9]/g, ''))) continue;

    const hoursBlock = body.match(
      /<h3>\s*Today'?s Hours\s*<\/h3>\s*<div id="dining_location_text">([\s\S]*?)<\/div>/i,
    );
    const hoursText = hoursBlock ? textOf(hoursBlock[1]) : '';

    const infoLink = body.match(/<div id="more_info_button"[^>]*>\s*<a href="([^"]+)"/i);
    const menuLink = body.match(/<a href="([^"]*\/menu\/[^"]*)"/i);
    const img = body.match(/<img[^>]+src="([^"]+)"/i);
    const teaser = body.match(/<div id="teaser"[^>]*>\s*<p>([\s\S]*?)<\/p>/i);

    const status = classifyHours(hoursText);
    status.hoursText = hoursText || null;
    status.opensLabel = opensLabel(status);

    venues.push({
      name,
      category: categorySlug,
      hoursText: hoursText || null,
      status,
      description: teaser ? firstSentences(textOf(teaser[1])) : null,
      image: img ? absolute(img[1]) : null,
      infoUrl: infoLink ? absolute(infoLink[1]) : null,
      menuUrl: menuLink ? absolute(menuLink[1]) : null,
    });
  }
  return venues;
}

/** Discover sub-location links on a category page (used as a fallback when the listing has no entries). */
export async function fetchRetailCategory(category) {
  const html = await fetchText(`${DINING_BASE}/locations-menus/${category.slug}`);
  return parseRetailListing(html, category.slug);
}

function absolute(href) {
  if (!href) return null;
  return href.startsWith('http') ? href : `${DINING_BASE}${href.startsWith('/') ? '' : '/'}${href}`;
}

// ---------------------------------------------------------------------------
// Open / closed
// ---------------------------------------------------------------------------

/**
 * Decide whether a venue is open from a text range like "8:00 AM - 9:00 PM".
 * Returns { state, hoursText } where state is 'open' | 'closed' | 'unknown'.
 * Anything ambiguous stays 'unknown' rather than guessing wrong.
 */
export function classifyHours(hoursText, now = nowInAmherst()) {
  if (!hoursText) return { state: 'unknown', ranges: [] };
  if (/closed/i.test(hoursText)) return { state: 'closed', ranges: [] };

  const ranges = parseRanges(hoursText);
  if (!ranges.length) return { state: 'unknown', ranges: [] };

  const minutes = now.getHours() * 60 + now.getMinutes();
  const open = ranges.some(({ start, end }) =>
    // A range crossing midnight (e.g. 7:00 AM - 1:00 AM) wraps around.
    end <= start ? minutes >= start || minutes < end : minutes >= start && minutes < end,
  );
  return { state: open ? 'open' : 'closed', ranges };
}

/** Extract every "H:MM AM - H:MM PM" (or "Midnight") pair from a string, as minutes past midnight. */
export function parseRanges(text) {
  const out = [];
  const re =
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm|noon|midnight)?\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|noon|midnight)?/gi;
  let m;
  while ((m = re.exec(text))) {
    const start = toMinutes(m[1], m[2], m[3] || inferMeridiem(m[6]));
    const end = toMinutes(m[4], m[5], m[6] || m[3]);
    if (start !== null && end !== null) out.push({ start, end });
  }
  // Standalone "Midnight" as an end time is handled by toMinutes below.
  if (/midnight/i.test(text) && !out.length) {
    const m2 = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[-–—]\s*midnight/i);
    if (m2) {
      const start = toMinutes(m2[1], m2[2], m2[3]);
      if (start !== null) out.push({ start, end: 24 * 60 });
    }
  }
  return out;
}

function inferMeridiem(endMeridiem) {
  // "7:00 - 9:00 PM" -> assume the start shares the end's meridiem when plausible.
  return endMeridiem;
}

function toMinutes(hour, minute, meridiem) {
  if (/midnight/i.test(meridiem || '')) return 24 * 60;
  if (/noon/i.test(meridiem || '')) return 12 * 60;
  let h = Number(hour);
  if (Number.isNaN(h)) return null;
  const min = Number(minute || 0);
  const mer = (meridiem || '').toLowerCase();
  if (mer === 'pm' && h !== 12) h += 12;
  if (mer === 'am' && h === 12) h = 0;
  return h * 60 + min;
}

/** Current time in America/New_York regardless of where the serverless function runs. */
export function nowInAmherst() {
  const s = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  return new Date(s);
}

/**
 * Best-effort "when does this reopen" label from today's already-classified
 * ranges. Only ever says "opens later today at H:MM" — the underlying scrape
 * doesn't reliably distinguish which day of the week a given hours line
 * applies to (see statusFromSections in api/dining.js), so guessing a
 * specific "opens tomorrow"/"opens Monday" date would risk being wrong.
 * Returns null when nothing useful can be said (already open, or closed with
 * no later range known for today).
 */
export function opensLabel({ state, ranges } = {}, now = nowInAmherst()) {
  if (state === 'open' || !ranges?.length) return null;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const later = ranges.find((r) => r.start > minutes);
  return later ? `Opens at ${formatMinutes(later.start)}` : null;
}

function formatMinutes(mins) {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const suffix = h24 < 12 ? 'AM' : 'PM';
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}
