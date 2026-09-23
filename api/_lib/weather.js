import { fetchJson } from './http.js';
import { getOrFetch, TTL } from './cache.js';

// Campus-center coordinate — midpoint of campusMap.json's bounds (src/data/campusMap.json),
// close enough for a campus-wide forecast; NWS gridpoints cover several km anyway.
const CAMPUS_LAT = 42.3855;
const CAMPUS_LON = -72.527;

// api.weather.gov is keyless but asks every client to identify itself in the
// User-Agent (their docs: a descriptive app name is enough, no contact email
// required for read-only use).
const HEADERS = { 'user-agent': 'umass-app (personal PWA, self-hosted)' };

/** /points/{lat},{lon} resolves the fixed campus coordinate to a forecast URL — this never changes. */
function resolveGridpoint() {
  return getOrFetch('weather:points', TTL.RARE, async () => {
    const data = await fetchJson(`https://api.weather.gov/points/${CAMPUS_LAT},${CAMPUS_LON}`, {
      headers: HEADERS,
    });
    return data.properties;
  });
}

/** Current conditions + short-term forecast for campus, from the free NWS API. No API key. */
export async function getWeather() {
  const point = await resolveGridpoint();
  const forecast = await getOrFetch('weather:forecast', TTL.WEATHER, () =>
    fetchJson(point.forecast, { headers: HEADERS }),
  );

  const periods = forecast?.properties?.periods || [];
  const toPeriod = (p) => ({
    label: p.name,
    temperature: p.temperature,
    temperatureUnit: p.temperatureUnit,
    shortForecast: p.shortForecast,
    isDaytime: p.isDaytime,
  });

  return {
    current: periods[0] ? toPeriod(periods[0]) : null,
    periods: periods.slice(0, 4).map(toPeriod),
  };
}
