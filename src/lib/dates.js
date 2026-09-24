/**
 * Campus dates are always Eastern.
 *
 * Every "is this today?" question in the app means "today in Amherst", not
 * today on whatever timezone the device happens to be in. So day bucketing and
 * comparison all run through the Eastern wall clock rather than local time.
 */
export const TZ = 'America/New_York';

const KEY_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * "2026-07-29" for the given value, as seen in Amherst.
 *
 * A date-only string is already a calendar date with no instant attached — an
 * all-day assignment due "2026-08-10" is due on the 10th everywhere. Converting
 * it would parse as UTC midnight and land on the 9th in Eastern, so it is
 * returned untouched.
 */
export function dateKey(date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return KEY_FMT.format(new Date(date));
}

/** Today's key in Amherst. */
export function todayKey() {
  return dateKey(new Date());
}

/** Shift a date key by n days, staying in key space. */
export function shiftKey(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  // Noon UTC keeps the arithmetic clear of DST edges.
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** A Date positioned at midday of that key — safe for formatting a label. */
export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function isSameDay(a, b) {
  if (!a || !b) return false;
  return dateKey(a) === dateKey(b);
}

export function isToday(date) {
  return Boolean(date) && dateKey(date) === todayKey();
}

export function isTomorrow(date) {
  return Boolean(date) && dateKey(date) === shiftKey(todayKey(), 1);
}

/** "Today", "Tomorrow", "Yesterday", else "Mon, Aug 4". */
export function dayLabel(date) {
  if (!date) return '';
  const key = dateKey(date);
  const today = todayKey();
  if (key === today) return 'Today';
  if (key === shiftKey(today, 1)) return 'Tomorrow';
  if (key === shiftKey(today, -1)) return 'Yesterday';
  return keyToDate(key).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Label straight from a date key, without round-tripping through an instant. */
export function dayLabelFromKey(key) {
  const today = todayKey();
  if (key === today) return 'Today';
  if (key === shiftKey(today, 1)) return 'Tomorrow';
  if (key === shiftKey(today, -1)) return 'Yesterday';
  return keyToDate(key).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** UTC offset (e.g. "-04:00") Amherst was at for a given wall-clock instant. */
function easternOffset(localStamp) {
  try {
    const probe = new Date(`${localStamp}Z`);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      timeZoneName: 'longOffset',
    }).formatToParts(probe);
    const name = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT-05:00';
    const m = /GMT([+-]\d{2}:\d{2})/.exec(name);
    return m ? m[1] : '-05:00';
  } catch {
    return '-05:00';
  }
}

/**
 * The actual instant a due date falls at. A bare "YYYY-MM-DD" (an all-day
 * assignment with no time of its own, e.g. Canvas's or Google Calendar's
 * "due this day") isn't due at UTC midnight — `new Date('2026-08-10')` lands
 * at 8pm Aug 9 in Eastern, hours before the day it's supposedly due even
 * starts. It's due at the end of that Amherst calendar day, so resolve it to
 * 11:59:59pm Eastern instead. A timestamped due date is returned untouched.
 */
export function dueInstant(date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const offset = easternOffset(`${date}T23:59:59`);
    return new Date(`${date}T23:59:59${offset}`);
  }
  return new Date(date);
}

/** Whether a due date's instant has already passed. */
export function isOverdue(date) {
  return Boolean(date) && dueInstant(date).getTime() < Date.now();
}

/** "7:00 PM" in Amherst — drops ":00" so it reads like the Calendar app. */
export function timeLabel(date) {
  if (!date) return '';
  const s = new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TZ,
  });
  return s.replace(':00', '');
}

/** "in 2h", "in 15m", "3d ago" — relative wording for due dates. */
export function relativeLabel(date) {
  if (!date) return '';
  const diff = dueInstant(date).getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  // Calendar-day diff, not raw hours — two due dates on the same Amherst
  // calendar day at different times of day must read the same "in Nd"
  // regardless of what time "now" happens to be. A raw `abs / 86400000`
  // round used to make e.g. a 10am-Thursday and a 11:59pm-Thursday due date
  // disagree ("in 3d" vs "in 2d") purely based on the current time of day.
  const days = Math.abs(Math.round((keyToDate(dateKey(date)) - keyToDate(todayKey())) / 86400000));

  if (mins < 1) return 'now';
  const value = mins < 60 ? `${mins}m` : hours < 24 ? `${hours}h` : `${days}d`;
  return diff >= 0 ? `in ${value}` : `${value} ago`;
}

/** "Jul 27" from a date key — a compact date to pair with a weekday name. */
export function shortDateLabel(key) {
  if (!key) return '';
  return keyToDate(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "Closes today" / "Closes tomorrow" / "Closes in 7 days" — for a deadline date. */
export function relativeDayLabel(date, { verb = 'Closes' } = {}) {
  if (!date) return '';
  const key = dateKey(date);
  const today = todayKey();
  if (key < today) return 'Closed';
  if (key === today) return `${verb} today`;
  if (key === shiftKey(today, 1)) return `${verb} tomorrow`;
  const days = Math.round((keyToDate(key) - keyToDate(today)) / 86400000);
  return `${verb} in ${days} day${days === 1 ? '' : 's'}`;
}

/** Group items into [{ key, label, items }] buckets by Amherst calendar day. */
export function groupByDay(items, getDate) {
  const buckets = new Map();
  for (const item of items) {
    const raw = getDate(item);
    if (!raw) continue;
    const key = dateKey(raw);
    if (!buckets.has(key)) buckets.set(key, { key, label: dayLabelFromKey(key), items: [] });
    buckets.get(key).items.push(item);
  }
  return [...buckets.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
}
