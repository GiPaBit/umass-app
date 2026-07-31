import { classifyHours, nowInAmherst, parseRanges } from '../dining.js';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Turn hour sections into facilities with a resolved status for *today*.
 * Lines look like "Monday - Friday: 7:00am -7:00pm" or "Saturday - Sunday: CLOSED".
 */
export function buildFacilities(sections) {
  const now = nowInAmherst();
  const todayIndex = now.getDay();

  return sections
    .map((section) => {
      const schedule = collapseDayRanges(
        section.lines.map((line) => parseHourLine(line)).filter(Boolean),
      );
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
export function expandDays(text) {
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

/**
 * Merge schedule entries that share identical hours text into the smallest set of
 * contiguous day-runs (circular over Sun–Sat), so "8am-10pm" written as 7 separate
 * per-day lines (or any partial grouping) collapses to as few rows as the actual
 * hours warrant — e.g. all 7 days identical becomes one "Mon–Sun" row. Generic:
 * works for any facility, does not assume anything RecWell-specific.
 */
export function collapseDayRanges(schedule) {
  if (!schedule.length) return schedule;

  const byDay = new Array(7).fill(null);
  for (const entry of schedule) {
    for (const d of entry.days) byDay[d] = entry;
  }

  const sameEntry = (a, b) => Boolean(a && b && a.timeText === b.timeText);

  // Rotate to start at a day whose entry differs from the previous day's, so a
  // run that wraps past Saturday into Sunday isn't split into two pieces.
  let start = 0;
  for (let i = 0; i < 7; i++) {
    if (!sameEntry(byDay[i], byDay[(i + 6) % 7])) {
      start = i;
      break;
    }
  }

  const runs = [];
  let i = 0;
  while (i < 7) {
    const dayIdx = (start + i) % 7;
    const entry = byDay[dayIdx];
    if (!entry) {
      i++;
      continue;
    }
    const days = [dayIdx];
    let j = i + 1;
    while (j < 7) {
      const nextIdx = (start + j) % 7;
      if (!sameEntry(byDay[nextIdx], entry)) break;
      days.push(nextIdx);
      j++;
    }
    runs.push({ days, timeText: entry.timeText, ranges: entry.ranges });
    i = j;
  }

  return runs.map((run) => ({
    days: run.days,
    dayLabel: formatDayLabel(run.days),
    timeText: run.timeText,
    ranges: run.ranges,
  }));
}

function formatDayLabel(days) {
  if (days.length === 7) return 'Mon–Sun';
  if (days.length === 1) return DAY_ABBR[days[0]];
  return `${DAY_ABBR[days[0]]}–${DAY_ABBR[days[days.length - 1]]}`;
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** Best-effort "July 28, 2026" (or "July 28") extraction out of a notice's raw text. */
function extractNoticeDate(text, now) {
  const m = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i,
  );
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  const day = Number(m[2]);
  const year = m[3] ? Number(m[3]) : now.getFullYear();
  const d = new Date(year, month, day, 23, 59, 59);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Attach a best-effort date to each notice and drop only the ones we could
 * confidently parse *and* confirm are in the past — anything undated (a date we
 * failed to parse) stays visible rather than silently vanishing.
 */
export function buildNotices(rawLines) {
  const now = nowInAmherst();
  return rawLines
    .map((text) => ({ text, date: extractNoticeDate(text, now) }))
    .filter((n) => !n.date || new Date(n.date) >= now);
}
