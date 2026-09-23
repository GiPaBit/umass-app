import { dateKey, isToday, timeLabel, todayKey, shiftKey, dayLabelFromKey } from './dates.js';
import { matchesName, matchesSports, workoutFacilityMatch } from './profile.js';
import { venuesInGroup } from './diningCatalog.js';
import { displayCourse } from './courseNicknames.js';
import { displayVenue } from './venueNicknames.js';
import { titleWithoutCourse } from './assignments.js';

/** A brief pref reads as "on" unless explicitly set to false — matches DEFAULT_BRIEF_PREFS. */
function on(prefs, key) {
  return prefs?.[key] !== false;
}

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

/** Breakfast / lunch / dinner from the wall clock — mirrors DiningScreen's defaultMeal(). */
function currentMealLabel() {
  const hour = new Date().getHours();
  return hour < 10.5 ? 'breakfast' : hour < 16 ? 'lunch' : 'dinner';
}

/** Join a list into "a, b and c". */
function joinList(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * True when a location is already named (or clearly implied) by the title —
 * "NEST Open SkyPark" at "The Nest" reads as a stutter ("... is at 3 PM, The
 * Nest") once the location is tacked on, so that clause is worth dropping.
 */
function locationRedundant(title, location) {
  if (!title || !location) return false;
  const core = location.replace(/^\s*the\s+/i, '').trim().toLowerCase();
  return core.length > 2 && title.toLowerCase().includes(core);
}

/* -------------------------------------------------------------------------- */
/* Right now                                                                   */
/* -------------------------------------------------------------------------- */

export function composeNowBrief({ profile, assignments = [], events = [], dining, rec, weather, prefs = {} }) {
  const now = new Date();
  const seg = [];
  let nextUpId = null;

  const hello = profile?.name ? `${greeting(now.getHours())}, ${profile.name}.` : `${greeting(now.getHours())}.`;
  seg.push({ text: hello });

  // --- assignments -------------------------------------------------------
  if (on(prefs, 'showAssignments')) {
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
        nextUpId = upcoming.id;
        seg.push({ text: ' — next up is ' });
        seg.push({ text: titleWithoutCourse(upcoming.title), tab: 'assignments', strong: true });
        const course = upcoming.course ? displayCourse(upcoming.course) : null;
        seg.push({ text: `${course ? ` for ${course}` : ''} ${whenPhrase(dateKey(upcoming.due))}.` });
      } else {
        seg.push({ text: '.' });
      }
    }

    if (overdue.length) {
      seg.push({ text: ' ' });
      seg.push({ text: plural(overdue.length, 'assignment is', 'assignments are'), tab: 'assignments', strong: true });
      seg.push({ text: ' past due.' });
    }
  }

  // --- events today ------------------------------------------------------
  if (on(prefs, 'showEvents')) {
    const eventsPool = on(prefs, 'showSportsEvents') ? events : events.filter((e) => e.source !== 'athletics');
    const todaysEvents = eventsPool.filter((e) => e.start && isToday(e.start));
    const upcomingToday = todaysEvents.filter((e) => e.allDay || new Date(e.start) >= now);
    const favouriteSport = upcomingToday.find((e) => matchesSports(e, profile?.sports));
    const headline = favouriteSport || upcomingToday[0];

    if (headline) {
      seg.push({ text: favouriteSport ? ' ' : ' ' });
      seg.push({ text: headline.title, tab: 'events', strong: true });
      const showLocation = headline.location && !locationRedundant(headline.title, headline.location);
      seg.push({
        text: `${headline.allDay ? ' is on today' : ` is at ${timeLabel(headline.start)}`}${
          showLocation ? `, ${headline.location}` : ''
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
  }

  // --- dining ------------------------------------------------------------
  const diningLine = composeDining(dining, profile, on(prefs, 'useNicknames'));
  if (diningLine) seg.push(...diningLine);

  // --- rec ---------------------------------------------------------------
  const gymLine = composeGym(rec, profile, on(prefs, 'useNicknames'));
  if (gymLine) seg.push(...gymLine);

  // --- weather -------------------------------------------------------------
  if (on(prefs, 'showWeather')) {
    const weatherLine = composeWeather(weather);
    if (weatherLine) seg.push(...weatherLine);
  }

  return { segments: seg, nextUpAssignmentId: nextUpId };
}

function composeDining(dining, profile, useNicknames = true) {
  if (!dining) return null;

  const halls = dining.halls || [];
  const venues = (dining.categories || []).flatMap((c) => c.venues || []);
  const favourites = [...(profile?.diningFavourites || []), ...(profile?.cafeFavourites || [])];

  const openFavourites = [...halls, ...venues].filter(
    (place) => place.status?.state === 'open' && matchesName(place.name, favourites),
  );

  if (openFavourites.length) {
    // Every dining-commons hall picked as a favourite, and all of them open
    // right now — naming all four individually is just noise at that point.
    const allHallNames = venuesInGroup('halls');
    const allHallsFavourited =
      allHallNames.length > 0 && allHallNames.every((name) => matchesName(name, favourites));
    const openHalls = halls.filter((h) => h.status?.state === 'open');

    if (allHallsFavourited && openHalls.length === allHallNames.length) {
      return [
        { text: ' ' },
        { text: 'All dining halls', tab: 'dining', strong: true },
        { text: ` are open right now, serving ${currentMealLabel()}.` },
      ];
    }

    const shown = openFavourites.slice(0, 3);
    const seg = [{ text: ' ' }];
    seg.push({
      text: joinList(shown.map((p) => displayVenue(p.name, useNicknames))),
      tab: 'dining',
      strong: true,
    });

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

function composeGym(rec, profile, useNicknames = true) {
  const facilities = rec?.recwell?.hours?.facilities || [];
  if (!facilities.length) return null;

  // Not every workout preference maps to an hours-tracked facility (NEST has no
  // published hours; Group Fitness is a program, not a place) — those tokens
  // resolve to null and drop out, which is fine, they just don't drive this line.
  const candidates = (profile?.workoutPreferences || [])
    .map((token) => {
      const match = workoutFacilityMatch(token);
      return match ? facilities.find((f) => matchesName(f.name, [match])) : null;
    })
    .filter(Boolean);

  const target =
    candidates.find((f) => f.status?.state === 'open') ||
    candidates[0] ||
    facilities.find((f) => /recreation center/i.test(f.name));

  if (!target) return null;

  const name = displayVenue(target.name, useNicknames);
  if (target.status?.state === 'open') {
    return [
      { text: ' ' },
      { text: name, tab: 'rec', strong: true },
      { text: ` is open${target.today?.hoursText ? ` until ${closingTime(target.today.hoursText)}` : ''}.` },
    ];
  }
  return [
    { text: ' ' },
    { text: name, tab: 'rec', strong: true },
    { text: ` is closed${target.today?.hoursText ? ` (${target.today.hoursText} today)` : ''}.` },
  ];
}

/**
 * One-line current conditions from the NWS forecast (api/weather.js) — the
 * first period it returns is always "right now" (or "tonight" once night
 * falls), never a future day, so no date logic is needed here.
 */
function composeWeather(weather) {
  const current = weather?.current;
  if (!current) return null;

  return [
    { text: ' ' },
    { text: `${current.temperature}°${current.temperatureUnit}`, strong: true },
    { text: ` and ${current.shortForecast.toLowerCase()} right now.` },
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

export function composeWeekBrief({ profile, assignments = [], events = [], excludeAssignmentId = null, prefs = {} }) {
  const now = new Date();
  const today = todayKey();
  const horizon = shiftKey(today, 7);

  const inWindow = (value) => {
    if (!value) return false;
    const key = dateKey(value);
    return key > today && key <= horizon;
  };

  const seg = [];
  let upcoming = [];

  // --- coursework --------------------------------------------------------
  if (on(prefs, 'showAssignments')) {
    upcoming = assignments.filter((a) => a.type !== 'event' && inWindow(a.due));

    if (upcoming.length) {
      seg.push({ text: 'Over the next week you have ' });
      seg.push({ text: plural(upcoming.length, 'assignment', 'assignments'), tab: 'assignments', strong: true });

      const courses = [...new Set(upcoming.map((a) => a.course).filter(Boolean).map(displayCourse))];
      if (courses.length) seg.push({ text: ` across ${joinList(courses.slice(0, 3))}` });

      // Skip naming whichever assignment the "right now" brief already called
      // out as "next up" — naming the same one twice on the same screen reads
      // as a stutter. Count above still includes it; only the specific pick
      // here moves on to the next-nearest one (or drops the sentence if there
      // wasn't another one in the window). Wording says "after that" rather
      // than repeating "the first" once something's been skipped, so this
      // doesn't read as contradicting what "right now" already said.
      const wasExcluded = Boolean(excludeAssignmentId) && upcoming.some((a) => a.id === excludeAssignmentId);
      const nameable = wasExcluded ? upcoming.filter((a) => a.id !== excludeAssignmentId) : upcoming;
      const first = nameable[0];

      if (first) {
        seg.push({ text: wasExcluded ? '. After that, the next is ' : '. The first is ' });
        seg.push({ text: titleWithoutCourse(first.title), tab: 'assignments', strong: true });
        const firstCourse = first.course ? displayCourse(first.course) : null;
        seg.push({ text: `${firstCourse ? ` for ${firstCourse}` : ''}, due ${whenPhrase(dateKey(first.due))}.` });
      } else {
        seg.push({ text: " — you've already heard about that one above." });
      }
    } else {
      seg.push({ text: 'No coursework due in the next week.' });
    }
  }

  // --- sport -------------------------------------------------------------
  if (on(prefs, 'showEvents')) {
    const upcomingEvents = events.filter((e) => inWindow(e.start));

    if (on(prefs, 'showSportsEvents')) {
      const games = upcomingEvents.filter((e) => e.source === 'athletics');
      const myGames = games.filter((e) => matchesSports(e, profile?.sports));
      // Only fall back to "any game" when the user hasn't picked teams to follow —
      // once they have, an empty match should mean silence, not someone else's team.
      const showGames = profile?.sports?.length ? myGames : games;

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
  }

  if (seg.length === 0) {
    seg.push({ text: 'A quiet week ahead.' });
  } else if (seg.length === 1 && !upcoming.length) {
    seg.push({ text: ' A quiet week on the calendar.' });
  }

  return seg;
}

/** Flatten segments to a plain string (used for the skip state and a11y). */
export function segmentsToText(segments) {
  return segments.map((s) => s.text).join('');
}
