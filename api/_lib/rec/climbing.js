import { fetchText } from '../http.js';
import { firstSentences } from '../html.js';
import { parseRecSections, REC_BASE, REC_PAGES } from './shared.js';

/**
 * Neither of these resolves from anything scrapeable — the climbing page only
 * links a generic "Register for Orientation" CTA that dead-ends at the Fusion
 * portal root, and Boulder Brawl (a recurring semester event) isn't mentioned
 * in the page content at all. Both course IDs are user-verified against the
 * actual Fusion booking system directly. Hardcoded, not derived — will need a
 * manual update if RecWell ever changes these course IDs.
 */
const ORIENTATION_URL = 'https://recwell.umass.edu/program/GetProgramDetails?courseId=0b3378a0-0443-4a26-a643-208566f6b8ac';
const BOULDER_BRAWL_URL = 'https://recwell.umass.edu/program/GetProgramDetails?courseId=210ac9f0-1fcc-4110-ba65-d9a47c7415aa';

/**
 * No live occupancy feed exists anywhere on the RecWell site or a discoverable
 * vendor embed (checked live) — and there's no historical data to build even a
 * static peak-hours histogram from without fabricating it, so this deliberately
 * ships hours + links only, no occupancy indicator.
 */
export async function getClimbing() {
  const failures = [];
  let sections = [];
  try {
    const html = await fetchText(`${REC_BASE}${REC_PAGES.climbing}`);
    sections = parseRecSections(html);
  } catch (err) {
    failures.push({ what: 'Climbing', error: String(err.message || err) });
    return {
      climbing: { overview: null, orientationUrl: ORIENTATION_URL, events: [], sections: [], url: `${REC_BASE}${REC_PAGES.climbing}` },
      failures,
    };
  }

  const firstSection = sections.find((s) => s.lines.length > 0);

  return {
    climbing: {
      overview: firstSection ? firstSentences(firstSection.lines.join(' ')) : null,
      orientationUrl: ORIENTATION_URL,
      // No scrapeable date for Boulder Brawl — `when: null` means the UI shows
      // "Stay tuned!" instead of a fabricated date.
      events: [{ name: 'Boulder Brawl', url: BOULDER_BRAWL_URL, when: null }],
      sections,
      url: `${REC_BASE}${REC_PAGES.climbing}`,
    },
    failures,
  };
}
