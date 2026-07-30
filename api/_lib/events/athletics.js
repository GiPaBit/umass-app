import { fetchText } from '../http.js';
import { decodeEntities } from '../html.js';

const RSS = 'https://umassathletics.com/calendar.ashx/calendar.rss';

/**
 * UMass Athletics runs on SIDEARM, whose site is a Vue SPA (unscrapeable without a
 * headless browser) but which publishes a full game calendar as RSS with rich
 * `ev:` and `s:` extension fields — opponent, logos, local start time, location.
 */
export const athleticsSource = {
  id: 'athletics',
  label: 'UMass Athletics',
  url: 'https://umassathletics.com/calendar',

  async fetchEvents({ days = 21 } = {}) {
    const xml = await fetchText(RSS);
    const cutoff = Date.now() + days * 86400000;

    return parseItems(xml)
      .map(normalize)
      .filter((e) => e.start && new Date(e.start).getTime() <= cutoff)
      .filter((e) => new Date(e.end || e.start).getTime() >= Date.now() - 6 * 3600000);
  },
};

function parseItems(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml))) items.push(m[1]);
  return items;
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decodeEntities(m[1].trim()) : null;
}

function normalize(block) {
  const rawTitle = tag(block, 'title') || '';
  const link = tag(block, 'link');
  const opponent = tag(block, 's:opponent');
  const sport = tag(block, 's:sport') || guessSport(rawTitle);
  const localStart = tag(block, 's:localstartdate');
  const localEnd = tag(block, 's:localenddate');

  return {
    id: `athletics-${link || rawTitle}`,
    source: 'athletics',
    sourceLabel: 'Athletics',
    // Titles arrive as "8/5 7:00 PM Massachusetts, University of Women's Soccer vs UConn".
    // Strip the leading date/time and the verbose school name for a clean card.
    title: tidyTitle(rawTitle),
    description: [sport, opponent && `vs ${opponent}`].filter(Boolean).join(' · ') || null,
    // localstartdate has no timezone suffix but is already Eastern; pin it explicitly.
    start: toEastern(localStart) || tag(block, 'ev:startdate'),
    end: toEastern(localEnd) || tag(block, 'ev:enddate'),
    allDay: false,
    location: tag(block, 'ev:location') || tag(block, 's:location') || null,
    url: link ? link.replace('admin.umassathletics.com', 'umassathletics.com') : null,
    imageUrl: tag(block, 's:opponentlogo') || tag(block, 's:teamlogo') || null,
    category: 'Athletics',
    categories: ['Athletics', sport].filter(Boolean),
    tags: [],
    free: false,
    isUserAdded: false,
    sport,
    opponent,
  };
}

function tidyTitle(title) {
  return title
    .replace(/^\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}\s*[AP]M\s*/i, '')
    .replace(/^\d{1,2}\/\d{1,2}\s+/, '')
    .replace(/Massachusetts,\s*University of\s*/gi, 'UMass ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function guessSport(title) {
  const m = title.match(/UMass\s+(?:of\s+)?(.*?)\s+(?:vs|at)\s+/i) || title.match(/University of\s+(.*?)\s+(?:vs|at)\s+/i);
  return m ? m[1].trim() : null;
}

/** "2026-08-05T19:00:00.0000000" (Eastern, no offset) -> a correctly offset ISO string. */
function toEastern(local) {
  if (!local) return null;
  const clean = local.replace(/\.\d+$/, '');
  // Determine whether that date is in EDT (-04:00) or EST (-05:00).
  const probe = new Date(`${clean}Z`);
  if (Number.isNaN(probe.getTime())) return null;
  const offset = easternOffset(probe);
  return `${clean}${offset}`;
}

function easternOffset(date) {
  const tzName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value;
  return tzName === 'EST' ? '-05:00' : '-04:00';
}
