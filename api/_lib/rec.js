import { decodeEntities, textOf } from './html.js';
import { classifyHours, nowInAmherst, parseRanges } from './dining.js';

export const REC_BASE = 'https://www.umass.edu';

export const REC_PAGES = {
  hours: '/recwell/facilities/hours-operation',
  intramurals: '/recwell/programs-and-services/intramural-sports',
  clubSports: '/recwell/club-sports',
  fitness: '/recwell/programs-and-services/fitness-programs',
  schedules: '/recwell/schedules',
};

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * RecWell runs on the standard UMass Drupal theme. Every content page is
 * `<main>` containing `<h2>/<h3>` headings followed by `<p>`/`<ul>` bodies, so a
 * single section parser serves hours, intramurals, club sports and fitness.
 */
export function parseRecSections(html) {
  const main = extractMain(html);
  const sections = [];
  const re = /<(h2|h3)\b[^>]*>([\s\S]*?)<\/\1>([\s\S]*?)(?=<h2\b|<h3\b|$)/gi;
  let m;

  while ((m = re.exec(main))) {
    const heading = textOf(m[2]);
    if (!heading) continue;

    const body = m[3];
    const lines = [];
    // <br> inside a <p> separates one day's hours from the next.
    const pRe = /<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let p;
    while ((p = pRe.exec(body))) {
      for (const raw of p[2].split(/<br\s*\/?>/i)) {
        const text = textOf(raw);
        if (text) lines.push(text);
      }
    }

    sections.push({
      level: m[1] === 'h2' ? 2 : 3,
      heading,
      lines,
      links: extractLinks(body),
    });
  }
  return sections;
}

/** Strip nav/header/footer so headings from the site chrome are not mistaken for content. */
function extractMain(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  let body = main ? main[1] : html;
  body = body
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  return body;
}

function extractLinks(html) {
  const links = [];
  const re = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const label = textOf(m[2]);
    const href = decodeEntities(m[1]);
    if (!label || href.startsWith('#')) continue;
    links.push({ label, url: href.startsWith('http') ? href : `${REC_BASE}${href}` });
  }
  // Drop duplicates that come from repeated CTA buttons.
  return links.filter((l, i) => links.findIndex((x) => x.url === l.url) === i).slice(0, 8);
}

/**
 * Turn hour sections into facilities with a resolved status for *today*.
 * Lines look like "Monday - Friday: 7:00am -7:00pm" or "Saturday - Sunday: CLOSED".
 */
export function buildFacilities(sections) {
  const now = nowInAmherst();
  const todayIndex = now.getDay();

  return sections
    .map((section) => {
      const schedule = section.lines
        .map((line) => parseHourLine(line))
        .filter(Boolean);
      return { section, schedule };
    })
    // A facility either has real day+time lines, or is a short closure notice
    // ("CLOSED until further notice"). This excludes the page's intro prose,
    // which mentions closures but is not itself a facility.
    .filter(
      ({ section, schedule }) =>
        schedule.length > 0 ||
        (section.lines.length <= 2 && /closed|no longer in use/i.test(section.lines.join(' '))),
    )
    .map(({ section, schedule }) => {
      const todayEntry = schedule.find((entry) => entry.days.includes(todayIndex));

      // Anything that is not a day+time line is prose worth surfacing, e.g.
      // "CLOSED until further notice." or "No longer in use by RecWell."
      const note = section.lines.find((l) => !parseHourLine(l)) || null;

      let status;
      if (todayEntry) status = classifyHours(todayEntry.timeText, now);
      else if (note && /closed|no longer in use/i.test(note)) status = { state: 'closed', ranges: [] };
      else status = { state: 'unknown', ranges: [] };

      return {
        name: section.heading,
        schedule,
        today: todayEntry ? { days: todayEntry.dayLabel, hoursText: todayEntry.timeText } : null,
        status,
        note,
      };
    });
}

/** "Monday - Friday: 7:00am -7:00pm" -> { days:[1..5], dayLabel, timeText } */
export function parseHourLine(line) {
  const clean = line.replace(/\s+/g, ' ').trim();
  const split = clean.match(/^(.*?)[:\s]\s*((?:\d|closed).*)$/i);
  if (!split) return null;

  const dayPart = split[1].trim();
  const timeText = split[2].trim();
  const days = expandDays(dayPart);
  if (!days.length) return null;

  // The time half must be real clock times or an explicit closure. Without this,
  // prose like "Tuesday, July 28, 2026 - Pool Maintenance" parses as a schedule.
  const ranges = parseRanges(timeText);
  if (!ranges.length && !/closed/i.test(timeText)) return null;

  return { days, dayLabel: dayPart, timeText, ranges };
}

/** "Monday - Friday" -> [1,2,3,4,5];  "Saturday & Sunday" -> [6,0];  "Tuesday" -> [2] */
function expandDays(text) {
  const lower = text.toLowerCase();
  const range = lower.match(/(\w+day)\s*[-–—]\s*(\w+day)/);
  if (range) {
    const a = DAYS.indexOf(range[1]);
    const b = DAYS.indexOf(range[2]);
    if (a === -1 || b === -1) return [];
    const out = [];
    for (let i = a; ; i = (i + 1) % 7) {
      out.push(i);
      if (i === b) break;
      if (out.length > 7) break;
    }
    return out;
  }

  const found = DAYS.map((d, i) => (lower.includes(d) ? i : -1)).filter((i) => i !== -1);
  if (found.length) return found;
  if (/daily|every day|all week/.test(lower)) return [0, 1, 2, 3, 4, 5, 6];
  return [];
}
