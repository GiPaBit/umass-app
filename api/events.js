import { handleErrors, sendJson } from './_lib/http.js';
import { fetchAllEvents } from './_lib/events/index.js';

/**
 * GET /api/events?days=21
 *
 * Merges every registered source (see api/_lib/events/index.js) into one
 * chronologically sorted feed. User-added events live in the browser and are
 * merged client-side, so they survive without a database.
 */
export default handleErrors(async (req, res) => {
  const query = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const days = Math.min(Math.max(Number(query.days) || 21, 1), 60);

  const { events, failures, sources } = await fetchAllEvents({ days });

  sendJson(
    res,
    {
      ok: true,
      days,
      count: events.length,
      events,
      failures,
      sources,
      fetchedAt: new Date().toISOString(),
    },
    { cacheSeconds: 1200 },
  );
}, 'UMass Events');
