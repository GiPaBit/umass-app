import { fetchText, handleErrors, sendJson } from './_lib/http.js';
import { REC_BASE, REC_PAGES, buildFacilities, parseRecSections } from './_lib/rec.js';

/**
 * GET /api/rec  -> facility hours + intramural, club sport and fitness info.
 *
 * Source: umass.edu/recwell (Drupal).
 *
 * On intramurals: UMass runs registration through IMLeagues, which rejects
 * server-side requests outright (TLS fingerprint / bot protection — verified,
 * it returns no response at all rather than a 403). There is no public JSON or
 * RSS behind it either. So this route returns RecWell's own intramural
 * information plus deep links, which open fine in the phone's browser where the
 * user is already signed in. Games you care about can be pinned into the app
 * with Quick Add on the Events tab.
 */
export default handleErrors(async (req, res) => {
  const [hours, intramurals, clubSports, fitness] = await Promise.allSettled([
    fetchText(`${REC_BASE}${REC_PAGES.hours}`),
    fetchText(`${REC_BASE}${REC_PAGES.intramurals}`),
    fetchText(`${REC_BASE}${REC_PAGES.clubSports}`),
    fetchText(`${REC_BASE}${REC_PAGES.fitness}`),
  ]);

  const failures = [];
  const sectionsOf = (result, label) => {
    if (result.status === 'fulfilled') return parseRecSections(result.value);
    failures.push({ what: label, error: String(result.reason?.message || result.reason) });
    return [];
  };

  const hourSections = sectionsOf(hours, 'Facility hours');
  const facilities = buildFacilities(hourSections);

  sendJson(res, {
    ok: true,
    facilities,
    // Any leading advisory text (pool closures, holiday notes) that is not a facility.
    notices: hourSections
      .filter((s) => !facilities.some((f) => f.name === s.heading))
      .flatMap((s) => s.lines)
      .filter((l) => /clos|maintenance|notice|holiday/i.test(l))
      .slice(0, 5),
    intramurals: {
      sections: sectionsOf(intramurals, 'Intramurals'),
      url: `${REC_BASE}${REC_PAGES.intramurals}`,
      registrationUrl: 'https://www.imleagues.com/UMass',
      registrationNote:
        'Registration and live schedules live on IMLeagues, which blocks server-side access. Opens in your browser where you are already signed in.',
    },
    clubSports: {
      sections: sectionsOf(clubSports, 'Club sports'),
      url: `${REC_BASE}${REC_PAGES.clubSports}`,
    },
    fitness: {
      sections: sectionsOf(fitness, 'Fitness programs'),
      url: `${REC_BASE}${REC_PAGES.fitness}`,
      scheduleUrl: `${REC_BASE}${REC_PAGES.schedules}`,
    },
    failures,
    fetchedAt: new Date().toISOString(),
  });
}, 'UMass RecWell');
