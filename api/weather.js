import { handleErrors, sendJson } from './_lib/http.js';
import { getWeather } from './_lib/weather.js';

/**
 * GET /api/weather -> current conditions + short-term forecast for campus,
 * from the free NWS API (api.weather.gov). Fixed, non-user-supplied URL, so
 * this does not go through safeFetch's SSRF guard (that's for user-supplied
 * feed URLs only — see CLAUDE.md).
 */
export default handleErrors(async (req, res) => {
  const data = await getWeather();
  sendJson(res, data, { cacheSeconds: 1200 });
}, 'National Weather Service');
