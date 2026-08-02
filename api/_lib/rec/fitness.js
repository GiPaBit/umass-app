import { fetchText } from '../http.js';
import { getOrFetch, TTL } from '../cache.js';
import { blocksByClass, decodeEntities, firstSentences, textOf } from '../html.js';
import { nowInAmherst } from '../dining.js';
import { extractMain, parseRecSections, REC_BASE, REC_PAGES } from './shared.js';

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/**
 * The group fitness schedule is a hand-built weekly calendar (not the generic
 * <h2>/<p> Drupal shape), published a handful of weeks ahead as one
 * `.weekly-schedule` block per week, each preceded by an `<h2><div>July 26 -
 * August 1</div></h2>` date-range label. Confirmed live: real server-rendered
 * markup, not a JS widget — see `<article class="event event--…">` per class,
 * with a `.event-studio` link that's the registration deep link.
 */
export async function getFitness() {
  const failures = [];
  const [overviewResult, scheduleResult] = await Promise.allSettled([
    getOrFetch('rec:fitness:overview', TTL.RARE, () => fetchText(`${REC_BASE}${REC_PAGES.fitness}`)),
    getOrFetch('rec:fitness:schedule', TTL.RARE, () => fetchText(`${REC_BASE}${REC_PAGES.fitnessSchedule}`)),
  ]);

  let sections = [];
  if (overviewResult.status === 'fulfilled') {
    sections = parseRecSections(overviewResult.value);
  } else {
    failures.push({ what: 'Fitness overview', error: String(overviewResult.reason?.message || overviewResult.reason) });
  }

  let weeks = [];
  if (scheduleResult.status === 'fulfilled') {
    weeks = parseFitnessSchedule(scheduleResult.value);
  } else {
    failures.push({ what: 'Group fitness schedule', error: String(scheduleResult.reason?.message || scheduleResult.reason) });
  }

  const firstSection = sections.find((s) => s.lines.length > 0);
  const primer = firstSection ? firstSentences(firstSection.lines.join(' ')) : null;

  return {
    fitness: {
      primer,
      weeks,
      sections,
      url: `${REC_BASE}${REC_PAGES.fitness}`,
      scheduleUrl: `${REC_BASE}${REC_PAGES.fitnessSchedule}`,
    },
    failures,
  };
}

export function parseFitnessSchedule(html) {
  const main = extractMain(html);

  const weekLabels = [];
  const headerRe = /<h2>\s*<div>([\s\S]*?)<\/div>\s*<\/h2>/gi;
  let hm;
  while ((hm = headerRe.exec(main))) {
    const label = textOf(hm[1]);
    if (label) weekLabels.push(label);
  }

  const scheduleBlocks = blocksByClass(main, 'div', 'weekly-schedule');

  return scheduleBlocks.map((block, i) => {
    const weekStart = parseWeekStartDate(weekLabels[i]);
    const days = parseWeekGrid(block);
    // The source always emits all 7 days Sunday -> Saturday in that fixed order
    // (confirmed against live markup), so each day's offset from weekStart is
    // just its index — lets the client show a real date next to "Monday" and
    // highlight/dim relative to today without doing its own date math.
    return {
      label: weekLabels[i] || null,
      weekStart,
      days: weekStart ? days.map((day, idx) => ({ ...day, date: addDaysToKey(weekStart, idx) })) : days,
    };
  });
}

function addDaysToKey(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function parseWeekGrid(block) {
  const days = [];
  const dayRe = /<h3 class="day-header"[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3 class="day-header"|$)/gi;
  let dm;
  while ((dm = dayRe.exec(block))) {
    const dayName = textOf(dm[1]);
    const body = dm[2];
    const classes = [];
    const articleRe = /<article\b[^>]*>([\s\S]*?)<\/article>/gi;
    let am;
    while ((am = articleRe.exec(body))) {
      const art = am[1];
      const name = textOf((art.match(/<div class="event-title">([\s\S]*?)<\/div>/i) || [])[1] || '');
      if (!name) continue;
      const instructor = textOf((art.match(/<div class="event-instructor">([\s\S]*?)<\/div>/i) || [])[1] || '');
      const timeText = textOf((art.match(/<div class="event-time">([\s\S]*?)<\/div>/i) || [])[1] || '');
      const linkMatch = art.match(/<a\b[^>]*class="event-studio[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      // Strip the visually-hidden "(opens in new tab)" a11y hint before the plain-text label.
      const location = linkMatch
        ? textOf(linkMatch[2].replace(/<span class="sr-only">[\s\S]*?<\/span>/i, ''))
        : null;
      const registerUrl = linkMatch ? decodeEntities(linkMatch[1]) : null;
      const [start, end] = timeText.split(/\s*-\s*/).map((s) => s?.trim() || null);

      classes.push({ name, instructor: instructor || null, timeText, start, end, location, registerUrl });
    }
    days.push({ day: dayName, classes });
  }
  return days;
}

/** "July 26 - August 1" -> "2026-07-26" (the week's start date, YYYY-MM-DD). */
function parseWeekStartDate(label) {
  if (!label) return null;
  const m = label.match(/^([A-Za-z]+)\s+(\d{1,2})/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  if (month === -1) return null;
  const day = Number(m[2]);
  const now = nowInAmherst();
  // Noon UTC keeps this clear of local-timezone rollback when sliced to a date key.
  let d = new Date(Date.UTC(now.getFullYear(), month, day, 12));
  // A date that reads as far in the past is next year's occurrence of that
  // month/day (matters for schedules that straddle a December -> January turn).
  if (d.getTime() < now.getTime() - 275 * 86400000) d = new Date(Date.UTC(now.getFullYear() + 1, month, day, 12));
  return d.toISOString().slice(0, 10);
}

