import { fetchText } from '../http.js';
import { parseRecSections, REC_BASE, REC_PAGES } from './shared.js';

const POOL_MAP_QUERY = {
  boyden: 'Boyden Gymnasium, UMass Amherst',
  'curry hicks': 'Curry Hicks Cage, UMass Amherst',
};

/**
 * Both pools' hours are already scraped as part of the facilities list on the
 * shared hours-operation page — no second hours fetch needed. The aquatics
 * overview page has swim-program descriptions (lap/open/family swim) but no live
 * open-swim calendar (confirmed live: it points at the schedules hub and the
 * Fusion booking portal instead), so `events` stays empty for every pool for now.
 */
export async function getAquatics({ facilities, notices }) {
  const failures = [];
  let sections = [];
  try {
    const html = await fetchText(`${REC_BASE}${REC_PAGES.aquatics}`);
    sections = parseRecSections(html);
  } catch (err) {
    failures.push({ what: 'Aquatics', error: String(err.message || err) });
  }

  const pools = facilities
    .filter((f) => /boyden|curry hicks/i.test(f.name) && !/gymnasium/i.test(f.name))
    .map((f) => {
      const key = Object.keys(POOL_MAP_QUERY).find((k) => f.name.toLowerCase().includes(k));
      return {
        name: f.name,
        hours: { schedule: f.schedule, today: f.today, status: f.status, note: f.note },
        notices: notices.filter((n) => new RegExp(key || f.name, 'i').test(n.text)),
        events: [],
        mapQuery: key ? POOL_MAP_QUERY[key] : `${f.name}, UMass Amherst`,
      };
    });

  return {
    aquatics: { pools, sections, url: `${REC_BASE}${REC_PAGES.aquatics}` },
    failures,
  };
}
