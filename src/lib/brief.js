import { dateKey, isToday, timeLabel, todayKey, shiftKey, dayLabelFromKey } from './dates.js';
import { matchesName, matchesSports } from './profile.js';

/**
 * Builds the two Today-tab briefs as arrays of segments:
 *
 *   { text }                     plain prose
 *   { text, tab: 'assignments' } tappable — jumps to that tab
 *   { text, strong: true }       emphasised
 *
 * Segments rather than a plain string so the typing animation can reveal the
 * text character by character while the finished parts stay tappable.
 */

function greeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Turn a date key into a phrase that reads naturally mid-sentence.
 * "today"/"tomorrow" lowercase fine; a weekday needs its capitals and an "on".
 */
function whenPhrase(key) {
  const label = dayLabelFromKey(key);
  return /^(Today|Tomorrow|Yesterday)$/.test(label) ? label.toLowerCase() : `on ${label}`;
}

/** Join a list into "a, b and c". */
function joinList(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/* -------------------------------------------------------------------------- */
/* Right now                                                                   */
/* -------------------------------------------------------------------------- */

export function composeNowBrief({ profile, assignments = [], events = [], dining, rec }) {
  const now = new Date();
  const seg = [];

  const hello = profile?.name ? `${greeting(now.getHours())}, ${profile.name}.` : `${greeting(now.getHours())}.`;
  seg.push({ text: hello });

  // --- assignments -------------------------------------------------------
  const dueToday = assignments.filter((a) => a.type !== 'event' && isToday(a.due));
  const overdue = assignments.filter((a) => a.due && new Date(a.due) < now && !isToday(a.due));

  if (dueToday.length) {
    seg.push({ text: ' You have ' });
    seg.push({ text: plural(dueToday.length, 'assignment', 'assignments'), tab: 'assignments', strong: true });
    seg.push({ text: ' due today' });

    const next = dueToday.find((a) => !a.allDay && new Date(a.due) > now);
    if (next) seg.push({ text: `, the next at ${timeLabel(next.due)}` });
    seg.push({ text: '.' });
  } else if (assignments.length) {
    seg.push({ text: ' Nothing is due today' });
    const upcoming = nextAssignment(assignments, now);
    if (upcoming) {
      seg.push({ text: ' — next up is ' });
      seg.push({ text: upcoming.title, tab: 'assignments', strong: true });
      seg.push({ text: ` ${whenPhrase(dateKey(upcoming.due))}.` });
    } else {
      seg.push({ text: '.' });
    }
  }

  if (overdue.length) {
    seg.push({ text: ' ' });
    seg.push({ text: plural(overdue.length, 'assignment is', 'assignments are'), tab: 'assignments', strong: true });
    seg.push({ text: ' past due.' });
  }

  // --- events today ------------------------------------------------------
  const todaysEvents = events.filter((e) => e.start && isToday(e.start));
  const upcomingToday = todaysEvents.filter((e) => e.allDay || new Date(e.start) >= now);
  const favouriteSport = upcomingToday.find((e) => matchesSports(e, profile?.sports));
  const headline = favouriteSport || upcomingToday[0];

  if (headline) {
    seg.push({ text: favouriteSport ? ' ' : ' ' });
    seg.push({ text: headline.title, tab: 'events', strong: true });
    seg.push({
      text: `${headline.allDay ? ' is on today' : ` is at ${timeLabel(headline.start)}`}${
        headline.location ? `, ${headline.location}` : ''
      }`,
    });
    if (upcomingToday.length > 1) {
      seg.push({ text: ', plus ' });
      seg.push({
        text: `${upcomingToday.length - 1} other${upcomingToday.length - 1 === 1 ? '' : 's'}`,
        tab: 'events',
      });
      seg.push({ text: '.' });
    } else {
      seg.push({ text: '.' });
    }
  } else if (todaysEvents.length === 0) {
    seg.push({ text: ' Nothing on the campus calendar today.' });
  }

  // --- dining ------------------------------------------------------------
  const diningLine = composeDining(dining, profile);
  if (diningLine) seg.push(...diningLine);

  // --- rec ---------------------------------------------------------------
  const gymLine = composeGym(rec, profile);
  if (gymLine) seg.push(...gymLine);

  return seg;
}

function composeDining(dining, profile) {
  if (!dining) return null;

  const halls = dining.halls || [];
  const venues = (dining.categories || []).flatMap((c) => c.venues || []);
  const favourites = [...(profile?.diningFavourites || []), ...(profile?.cafeFavourites || [])];

  const openFavourites = [...halls, ...venues].filter(
    (place) => place.status?.state === 'open' && matchesName(place.name, favourites),
  );

  if (openFavourites.length) {
    const shown = openFavourites.slice(0, 3);
    const seg = [{ text: ' ' }];
    seg.push({ text: joinList(shown.map((p) => p.name)), tab: 'dining', strong: true });

    // Only quote hours when a single place is named — otherwise the times read
    // as though they applied to all of them.
    const hours =
      shown.length === 1 ? shown[0].status?.hoursText || shown[0].hoursText || null : null;

    seg.push({ text: `${shown.length === 1 ? ' is' : ' are'} open${hours ? ` until ${closingTime(hours)}` : ''}.` });
    return seg;
  }

  // No favourite open — say what is.
  const openNow = [...halls, ...venues].filter((p) => p.status?.state === 'open');
  if (!openNow.length) return [{ text: ' Nothing is serving right now.' }];
  if (!favourites.length) return null;

  return [
    { text: ' None of your usual spots are open, but ' },
    { text: `${openNow.length} other places`, tab: 'dining', strong: true },
    { text: ' are serving.' },
  ];
}

function composeGym(rec, profile) {
  const facilities = rec?.facilities || [];
  if (!facilities.length) return null;

  const favourite = profile?.gymFavourite;
  const target =
    (favourite && favourite !== 'No preference'
      ? facilities.find((f) => matchesName(f.name, [favourite]))
      : null) || facilities.find((f) => /recreation center/i.test(f.name));

  if (!target) return null;

  if (target.status?.state === 'open') {
    return [
      { text: ' ' },
      { text: target.name, tab: 'rec', strong: true },
      { text: ` is open${target.today?.hoursText ? ` until ${closingTime(target.today.hoursText)}` : ''}.` },
    ];
  }
  return [
    { text: ' ' },
    { text: target.name, tab: 'rec', strong: true },
    { text: ` is closed${target.today?.hoursText ? ` (${target.today.hoursText} today)` : ''}.` },
  ];
}

/** Pull the closing half out of "7:00am - 7:00pm". */
function closingTime(hoursText) {
  const m = hoursText.split(/[-–—]/).pop();
  return (m || hoursText).trim();
}

function nextAssignment(assignments, now) {
  return assignments
    .filter((a) => a.type !== 'event' && a.due && new Date(a.due) > now)
    .sort((a, b) => new Date(a.due) - new Date(b.due))[0];
}

/* -------------------------------------------------------------------------- */
/* The week ahead                                                              */
/* -------------------------------------------------------------------------- */

export function composeWeekBrief({ profile, assignments = [], events = [] }) {
  const now = new Date();
  const today = todayKey();
  const horizon = shiftKey(today, 7);

  const inWindow = (value) => {
    if (!value) return false;
    const key = dateKey(value);
    return key > today && key <= horizon;
  };

  const seg = [];

  // --- coursework --------------------------------------------------------
  const upcoming = assignments.filter((a) => a.type !== 'event' && inWindow(a.due));

  if (upcoming.length) {
    seg.push({ text: 'Over the next week you have ' });
    seg.push({ text: plural(upcoming.length, 'assignment', 'assignments'), tab: 'assignments', strong: true });

    const courses = [...new Set(upcoming.map((a) => a.course).filter(Boolean))];
    if (courses.length) seg.push({ text: ` across ${joinList(courses.slice(0, 3))}` });

    const first = upcoming[0];
    seg.push({
      text: `. The first is `,
    });
    seg.push({ text: first.title, tab: 'assignments', strong: true });
    seg.push({ text: `, due ${whenPhrase(dateKey(first.due))}.` });
  } else {
    seg.push({ text: 'No coursework due in the next week.' });
  }

  // --- sport -------------------------------------------------------------
  const upcomingEvents = events.filter((e) => inWindow(e.start));
  const games = upcomingEvents.filter((e) => e.source === 'athletics');
  const myGames = games.filter((e) => matchesSports(e, profile?.sports));
  const showGames = myGames.length ? myGames : games;

  if (showGames.length) {
    const g = showGames[0];
    seg.push({ text: myGames.length ? ' ' : ' ' });
    seg.push({ text: g.title, tab: 'events', strong: true });
    seg.push({
      text: ` plays ${whenPhrase(dateKey(g.start))}${g.allDay ? '' : ` at ${timeLabel(g.start)}`}`,
    });
    if (showGames.length > 1) {
      seg.push({ text: ', with ' });
      seg.push({ text: `${showGames.length - 1} more`, tab: 'events' });
      seg.push({ text: ' on the schedule.' });
    } else {
      seg.push({ text: '.' });
    }
  }

  // --- everything else ---------------------------------------------------
  const otherEvents = upcomingEvents.filter((e) => e.source !== 'athletics');
  const mine = otherEvents.filter((e) => e.isUserAdded);

  if (mine.length) {
    seg.push({ text: ' You have pinned ' });
    seg.push({ text: plural(mine.length, 'thing', 'things'), tab: 'events', strong: true });
    seg.push({ text: ` of your own — ${mine[0].title} ${whenPhrase(dateKey(mine[0].start))}.` });
  } else if (otherEvents.length) {
    seg.push({ text: ' There are also ' });
    seg.push({ text: `${otherEvents.length} campus events`, tab: 'events', strong: true });
    seg.push({ text: ' on, from talks to fairs.' });
  }

  if (seg.length === 1 && !upcoming.length) {
    seg.push({ text: ' A quiet week on the calendar.' });
  }

  return seg;
}

/** Flatten segments to a plain string (used for the skip state and a11y). */
export function segmentsToText(segments) {
  return segments.map((s) => s.text).join('');
}
