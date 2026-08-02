import { fetchText } from '../http.js';
import { getOrFetch, TTL } from '../cache.js';
import { firstSentences } from '../html.js';
import { parseRecSections, REC_BASE, REC_PAGES } from './shared.js';

/**
 * RecWell moved intramural registration off IMLeagues onto the FusionPlay app
 * (confirmed live: the page no longer links IMLeagues anywhere, and now walks
 * through installing "FusionPlay" from the App Store / Google Play instead — an
 * app, not a web flow, so there is no single registration URL to deep-link to
 * the way the old IMLeagues link worked).
 *
 * Per-sport deadlines ARE published as plain text on this page, one line per
 * sport in a stable pattern: "Registration begins: 9/8/26; Games begin: 9/21/26" —
 * extracted here into structured {opensAt, closesAt} so the UI can sort by
 * urgency instead of dumping the whole page as prose.
 */
export async function getIntramurals() {
  const failures = [];
  let sections = [];
  try {
    const html = await getOrFetch('rec:intramurals', TTL.RARE, () => fetchText(`${REC_BASE}${REC_PAGES.intramurals}`));
    sections = parseRecSections(html);
  } catch (err) {
    failures.push({ what: 'Intramurals', error: String(err.message || err) });
    return {
      intramural: { overview: null, sports: [], sections: [], registrationUrl: null, registrationNote: null, url: `${REC_BASE}${REC_PAGES.intramurals}` },
      failures,
    };
  }

  const sports = [];
  for (const s of sections) {
    const line = s.lines[0] || '';
    // A stripped </strong> tag can leave a stray space before the colon
    // ("Games begin : 9/21/26"), so the colon itself is optional-with-space.
    const m = line.match(/registration begins\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4}).*?games?\s+begins?\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (!m) continue;
    sports.push({ name: s.heading, opensAt: parseMDY(m[1]), closesAt: parseMDY(m[2]) });
  }

  const firstSection = sections.find((s) => s.lines.length > 0 && !sports.some((sp) => sp.name === s.heading));

  return {
    intramural: {
      overview: firstSection ? firstSentences(firstSection.lines.join(' ')) : null,
      sports,
      sections,
      registrationUrl: `${REC_BASE}${REC_PAGES.intramurals}`,
      registrationNote: 'Registration happens in the FusionPlay app (download from the App Store or Google Play), not on a website — full steps are on the RecWell page.',
      url: `${REC_BASE}${REC_PAGES.intramurals}`,
    },
    failures,
  };
}

function parseMDY(text) {
  const m = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  const d = new Date(Number(year), Number(m[1]) - 1, Number(m[2]));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

