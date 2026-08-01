import { fetchJson } from '../http.js';
import { firstSentences } from '../html.js';

const API = 'https://events.umass.edu/api/2/events';

/**
 * The main UMass events calendar runs on Localist, which exposes a documented
 * public JSON API — no scraping required, and it is the most stable source we have.
 */
export const localistSource = {
  id: 'localist',
  label: 'UMass Events Calendar',
  url: 'https://events.umass.edu/',

  async fetchEvents({ days = 21, max = 200 } = {}) {
    const events = [];
    // The API pages at 100/request; two pages is plenty for a three week window.
    for (let page = 1; page <= Math.ceil(max / 100); page++) {
      const data = await fetchJson(`${API}?days=${days}&pp=100&page=${page}`);
      const batch = data?.events || [];
      for (const wrapper of batch) {
        const e = wrapper?.event;
        if (e) events.push(normalize(e));
      }
      const total = data?.page?.total ?? 1;
      if (page >= total || batch.length === 0) break;
    }
    return events.flat();
  },
};

function normalize(e) {
  // An event repeats via event_instances; surface each occurrence separately so
  // "what's on today" is accurate for recurring events.
  const instances = (e.event_instances || []).map((i) => i.event_instance).filter(Boolean);
  const first = instances[0];

  const base = {
    source: 'localist',
    sourceLabel: 'UMass Events',
    title: e.title,
    description: cleanText(e.description_text),
    location: e.location_name || e.location || e.room_number || null,
    address: e.geo?.street ? `${e.geo.street}, ${e.geo.city || ''}`.trim().replace(/,$/, '') : null,
    url: e.localist_url || e.url || null,
    imageUrl: e.photo_url || null,
    category: e.filters?.event_types?.[0]?.name || null,
    categories: (e.filters?.event_types || []).map((t) => t.name),
    tags: e.tags || [],
    free: Boolean(e.free),
    ticketCost: e.ticket_cost || null,
    ticketUrl: e.ticket_url || null,
    isUserAdded: false,
  };

  if (!instances.length) {
    return [{ ...base, id: `localist-${e.id}`, start: e.first_date || null, end: null, allDay: true }];
  }

  return instances.map((i) => ({
    ...base,
    id: `localist-${e.id}-${i.id}`,
    start: i.start,
    end: i.end || null,
    allDay: Boolean(i.all_day),
  }));
}

function cleanText(str) {
  if (!str) return null;
  const trimmed = firstSentences(str.replace(/\s+/g, ' ').trim());
  return trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed;
}
