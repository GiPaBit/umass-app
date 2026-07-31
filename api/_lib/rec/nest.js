import { fetchText } from '../http.js';
import { findLinkByLabel, parseRecSections, REC_BASE, REC_PAGES } from './shared.js';

/**
 * Session-slot/capacity data is infeasible via server-side scraping: the SkyPark
 * booking link resolves to the same Innosoft Fusion JS-rendered shell used by
 * Fitness/Climbing (confirmed live, no inline JSON in the raw HTML). `slots`
 * stays null so the client renders a plain link list; the schema is already
 * shaped to accept real slot data later without a client change if a hidden
 * Fusion JSON endpoint ever turns up (needs a human with devtools — see plan).
 */
export async function getNest() {
  const failures = [];
  let sections = [];
  try {
    const html = await fetchText(`${REC_BASE}${REC_PAGES.nest}`);
    sections = parseRecSections(html);
  } catch (err) {
    failures.push({ what: 'NEST', error: String(err.message || err) });
    return {
      nest: { overview: null, bookingUrl: null, requestFormUrl: null, sections: [], slots: null, url: `${REC_BASE}${REC_PAGES.nest}` },
      failures,
    };
  }

  const firstSection = sections.find((s) => s.lines.length > 0);

  return {
    nest: {
      overview: firstSection ? firstSection.lines.join(' ') : null,
      // "Book time on the SkyPark" — the individual/small-group booking link.
      bookingUrl: findLinkByLabel(sections, /book.*skypark|skypark/i) || `${REC_BASE}${REC_PAGES.nest}`,
      // Group programs (Break the Ice, Building the NEST, etc.) go through a request form, not a live slot picker.
      requestFormUrl: findLinkByLabel(sections, /program request form|request form/i) || `${REC_BASE}${REC_PAGES.nest}`,
      slots: null,
      sections,
      url: `${REC_BASE}${REC_PAGES.nest}`,
    },
    failures,
  };
}

