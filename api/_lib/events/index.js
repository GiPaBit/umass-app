import { localistSource } from './localist.js';
import { athleticsSource } from './athletics.js';

/**
 * EXTENSION POINT
 * ---------------
 * Every event source is an object of this shape:
 *
 *   {
 *     id:     'my-source',            // stable slug, prefixes event ids
 *     label:  'My Source',            // shown on the event card badge
 *     url:    'https://…',            // human-facing page, for "open original"
 *     async fetchEvents({ days }) {}  // -> NormalizedEvent[]
 *   }
 *
 * A NormalizedEvent is:
 *
 *   { id, source, sourceLabel, title, description, start, end, allDay,
 *     location, url, imageUrl, category, categories[], tags[], free, isUserAdded }
 *
 * `start`/`end` are ISO 8601 strings *with* an offset. To add a source later
 * (an agentic scraper, a club feed, a Reddit crawler), write one module exporting
 * that shape and append it to SOURCES. Nothing in the UI needs to change — the
 * Events screen renders whatever comes back and groups it by source badge.
 */
export const SOURCES = [localistSource, athleticsSource];

/** Run every source in parallel; a broken source degrades to a warning, never a blank screen. */
export async function fetchAllEvents({ days = 21 } = {}) {
  const results = await Promise.allSettled(SOURCES.map((s) => s.fetchEvents({ days })));

  const events = [];
  const failures = [];

  results.forEach((result, i) => {
    const source = SOURCES[i];
    if (result.status === 'fulfilled') {
      events.push(...result.value);
    } else {
      failures.push({
        source: source.id,
        label: source.label,
        error: String(result.reason?.message || result.reason),
      });
    }
  });

  events.sort((a, b) => new Date(a.start || 0) - new Date(b.start || 0));

  return {
    events,
    failures,
    sources: SOURCES.map((s) => ({ id: s.id, label: s.label, url: s.url })),
  };
}
