import { fetchText } from '../http.js';
import { getOrFetch, TTL } from '../cache.js';
import { parseRecSections, REC_BASE, REC_PAGES } from './shared.js';
import { buildFacilities, buildNotices, parseHomepageAlert } from './hours.js';
import { getFitness } from './fitness.js';
import { getAquatics } from './aquatics.js';
import { getClimbing } from './climbing.js';
import { getNest } from './nest.js';
import { getIntramurals } from './intramurals.js';
import { getClubSports, ENGAGE_CSC_URL } from './clubSports.js';
import { fetchAdventureProgramEvents } from '../events/localist.js';

const EMPTY_FITNESS = { primer: null, weeks: [], sections: [], url: `${REC_BASE}${REC_PAGES.fitness}`, scheduleUrl: `${REC_BASE}${REC_PAGES.fitnessSchedule}` };
const EMPTY_AQUATICS = { pools: [], sections: [], url: `${REC_BASE}${REC_PAGES.aquatics}` };
const EMPTY_CLIMBING = { overview: null, orientationUrl: null, events: [], sections: [], url: `${REC_BASE}${REC_PAGES.climbing}` };
const EMPTY_NEST = { overview: null, bookingUrl: null, requestFormUrl: null, slots: null, sections: [], url: `${REC_BASE}${REC_PAGES.nest}` };
const EMPTY_INTRAMURAL = { overview: null, sports: [], sections: [], registrationUrl: null, registrationNote: null, url: `${REC_BASE}${REC_PAGES.intramurals}` };
const EMPTY_CLUBSPORTS = { clubs: [], sourceFailed: true, url: ENGAGE_CSC_URL };

/**
 * EXTENSION POINT, mirroring api/_lib/events/index.js — every RecWell/Sports data
 * source lives in its own module here, orchestrated via Promise.allSettled so a
 * single broken upstream (a page redesign, the unofficial Engage API changing
 * shape) degrades to a `failures[]` entry and an empty section, never a blank
 * screen for the rest of the tab.
 */
export async function getRecData() {
  const failures = [];

  // Facility hours feed the Hours tab directly, and Aquatics reuses the same
  // pool entries rather than re-fetching them, so this one runs first.
  let facilities = [];
  let notices = [];
  try {
    const html = await getOrFetch('rec:hours', TTL.RARE, () => fetchText(`${REC_BASE}${REC_PAGES.hours}`));
    const hourSections = parseRecSections(html);
    facilities = buildFacilities(hourSections);
    const rawNoticeLines = hourSections
      .filter((s) => !facilities.some((f) => f.name === s.heading))
      .flatMap((s) => s.lines)
      .filter((l) => /clos|maintenance|notice|holiday/i.test(l))
      .slice(0, 8);
    notices = buildNotices(rawNoticeLines);
  } catch (err) {
    failures.push({ what: 'Facility hours', error: String(err.message || err) });
  }

  // Supplementary, not fatal: the homepage alert banner is a nice-to-have
  // freshness signal, so a failure here just means no banner, never a
  // failures[] entry that'd surface as a warning for something this minor.
  let hoursAlert = null;
  try {
    const homeHtml = await getOrFetch('rec:home', TTL.RARE, () => fetchText(`${REC_BASE}${REC_PAGES.home}`));
    hoursAlert = parseHomepageAlert(homeHtml);
  } catch {
    // ignore
  }

  const [fitnessR, aquaticsR, climbingR, nestR, intramuralR, clubSportsR, adventureProgramsR] = await Promise.allSettled([
    getFitness(),
    getAquatics({ facilities, notices }),
    getClimbing(),
    getNest(),
    getIntramurals(),
    getClubSports(),
    fetchAdventureProgramEvents(),
  ]);

  const take = (result, key, fallback, what) => {
    if (result.status === 'fulfilled') {
      failures.push(...(result.value.failures || []));
      return result.value[key];
    }
    failures.push({ what, error: String(result.reason?.message || result.reason) });
    return fallback;
  };

  const fitness = take(fitnessR, 'fitness', EMPTY_FITNESS, 'Fitness');
  const aquatics = take(aquaticsR, 'aquatics', EMPTY_AQUATICS, 'Aquatics');
  const climbing = take(climbingR, 'climbing', EMPTY_CLIMBING, 'Climbing');
  const nest = take(nestR, 'nest', EMPTY_NEST, 'NEST');
  const intramural = take(intramuralR, 'intramural', EMPTY_INTRAMURAL, 'Intramurals');
  const clubSports = take(clubSportsR, 'clubSports', EMPTY_CLUBSPORTS, 'Club sports');
  let programs = [];
  if (adventureProgramsR.status === 'fulfilled') {
    programs = adventureProgramsR.value;
  } else {
    failures.push({ what: 'Adventure programs', error: String(adventureProgramsR.reason?.message || adventureProgramsR.reason) });
  }

  return {
    ok: true,
    fetchedAt: new Date().toISOString(),
    failures,
    recwell: {
      hours: { facilities, url: `${REC_BASE}${REC_PAGES.hours}`, alert: hoursAlert },
      notices,
      fitness,
      aquatics,
      adventure: { climbing, nest, programs },
    },
    sports: {
      intramural,
      clubSports,
    },
  };
}
