import { fetchText, handleErrors, sendJson } from './_lib/http.js';
import { getOrFetch, TTL } from './_lib/cache.js';
import {
  DINING_BASE,
  HALLS,
  RETAIL_CATEGORIES,
  classifyHours,
  opensLabel,
  parseLocationHours,
  parseMenuPage,
  parseRetailListing,
  reopenLabel,
} from './_lib/dining.js';

/**
 * GET /api/dining                 -> overview: all halls (hours) + all retail venues (today's hours)
 * GET /api/dining?hall=worcester  -> today's full menu for one dining commons
 *
 * Source: umassdining.com (Drupal). See api/_lib/dining.js for the markup contract.
 */
export default handleErrors(async (req, res) => {
  const query = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const hall = query.hall;

  if (hall) return sendJson(res, await getHallMenu(hall), { cacheSeconds: 3600 });
  return sendJson(res, await getOverview(), { cacheSeconds: 3600 });
}, 'UMass Dining');

async function getHallMenu(slug) {
  const hall = HALLS.find((h) => h.slug === slug);
  if (!hall) throw new Error(`Unknown dining hall "${slug}"`);

  const [menuHtml, locationHtml] = await Promise.all([
    getOrFetch(`dining:menu:${hall.slug}`, TTL.DAILY, () =>
      fetchText(`${DINING_BASE}/locations-menus/${hall.slug}/menu`),
    ),
    getOrFetch(`dining:hours:${hall.slug}`, TTL.RARE, () =>
      fetchText(`${DINING_BASE}/locations-menus/${hall.slug}`),
    ),
  ]);

  const menu = parseMenuPage(menuHtml);
  const hoursSections = parseLocationHours(locationHtml);

  return {
    ok: true,
    hall: { ...hall, url: `${DINING_BASE}/locations-menus/${hall.slug}` },
    dateLabel: menu.dateLabel,
    meals: menu.meals,
    hoursSections,
    status: statusFromSections(hoursSections),
  };
}

async function getOverview() {
  const hallResults = await Promise.allSettled(
    HALLS.map(async (hall) => {
      const html = await getOrFetch(`dining:hours:${hall.slug}`, TTL.RARE, () =>
        fetchText(`${DINING_BASE}/locations-menus/${hall.slug}`),
      );
      const hoursSections = parseLocationHours(html);
      return {
        ...hall,
        type: 'commons',
        hoursSections,
        status: statusFromSections(hoursSections),
        url: `${DINING_BASE}/locations-menus/${hall.slug}`,
      };
    }),
  );

  const retailResults = await Promise.allSettled(
    RETAIL_CATEGORIES.map(async (cat) => {
      const html = await getOrFetch(`dining:retail:${cat.slug}`, TTL.DAILY, () =>
        fetchText(`${DINING_BASE}/locations-menus/${cat.slug}`),
      );
      return { ...cat, venues: parseRetailListing(html, cat.slug) };
    }),
  );

  // A single failing upstream page degrades that section only — the rest still renders.
  const halls = [];
  const failures = [];
  hallResults.forEach((r, i) => {
    if (r.status === 'fulfilled') halls.push(r.value);
    else failures.push({ what: HALLS[i].name, error: String(r.reason?.message || r.reason) });
  });

  const categories = [];
  retailResults.forEach((r, i) => {
    if (r.status === 'fulfilled') categories.push(r.value);
    else failures.push({ what: RETAIL_CATEGORIES[i].name, error: String(r.reason?.message || r.reason) });
  });

  return { ok: true, halls, categories, failures, fetchedAt: new Date().toISOString() };
}

/** Prefer a section whose title mentions the current season/"today"; fall back to the first parseable one. */
function statusFromSections(sections) {
  for (const section of sections) {
    // Track the day-range label ("Monday-Sunday") immediately preceding an
    // hours line, so a "closed for the rest of today" result can say when it
    // reopens instead of just "opens later today" (which doesn't apply).
    let dayRangeText = null;
    for (const line of section.lines) {
      if (line.kind === 'label') {
        dayRangeText = line.text;
        continue;
      }
      if (line.kind !== 'hours') continue;
      const status = classifyHours(line.text);
      if (status.state !== 'unknown') {
        return {
          ...status,
          from: section.title,
          hoursText: line.text,
          // reopenLabel is a "closed for the rest of today" fallback only —
          // opensLabel() already returns null for an 'open' status, but it's
          // not the one deciding whether a reopen label applies at all.
          opensLabel: status.state === 'closed' ? opensLabel(status) || reopenLabel(dayRangeText, line.text) : null,
        };
      }
    }
  }
  return { state: 'unknown', ranges: [] };
}
