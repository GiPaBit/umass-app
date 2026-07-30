/**
 * Minimal RFC 5545 parser, scoped to what Canvas actually emits.
 *
 * Canvas publishes each user's assignments and events as an ICS feed
 * (Calendar → "Calendar Feed"). That feed needs no OAuth — the URL itself is the
 * credential — so it can be read directly and Google Calendar drops out of the
 * picture entirely.
 */

/** Undo RFC 5545 line folding: a CRLF followed by a space/tab continues the previous line. */
function unfold(text) {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

/** Unescape the text values ICS escapes: \n \, \; \\ */
function unescapeText(value) {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

/**
 * Split "DTSTART;TZID=America/New_York:20260805T235900" into
 * { name: 'DTSTART', params: { TZID: '...' }, value: '20260805T235900' }.
 */
function parseLine(line) {
  const colon = indexOfUnquoted(line, ':');
  if (colon === -1) return null;

  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);

  const parts = head.split(';');
  const name = parts[0].toUpperCase();
  const params = {};
  for (const part of parts.slice(1)) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name, params, value };
}

/** Find a delimiter that is not inside a quoted parameter value. */
function indexOfUnquoted(str, char) {
  let quoted = false;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '"') quoted = !quoted;
    else if (str[i] === char && !quoted) return i;
  }
  return -1;
}

/**
 * Convert an ICS date-time to an ISO string.
 *  20260805T235900Z            -> UTC
 *  20260805T235900 (+ TZID)    -> that zone's wall time
 *  20260805 (VALUE=DATE)       -> all-day
 */
function toIso(value, params) {
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (dateOnly || params.VALUE === 'DATE') {
    const m = dateOnly || /^(\d{4})(\d{2})(\d{2})/.exec(value);
    return { iso: `${m[1]}-${m[2]}-${m[3]}`, allDay: true };
  }

  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(value);
  if (!m) return { iso: null, allDay: false };

  const [, y, mo, d, h, mi, s, zulu] = m;
  if (zulu) {
    return { iso: new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`).toISOString(), allDay: false };
  }

  // Floating or TZID-qualified: resolve against the stated zone, defaulting to Eastern.
  const zone = params.TZID || 'America/New_York';
  const offset = zoneOffset(`${y}-${mo}-${d}T${h}:${mi}:${s}`, zone);
  return { iso: `${y}-${mo}-${d}T${h}:${mi}:${s}${offset}`, allDay: false };
}

/** Work out the UTC offset a zone was at for a given wall-clock time. */
function zoneOffset(localStamp, zone) {
  try {
    const probe = new Date(`${localStamp}Z`);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'longOffset',
    }).formatToParts(probe);
    const name = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT-05:00';
    const m = /GMT([+-]\d{2}:\d{2})/.exec(name);
    return m ? m[1] : '-05:00';
  } catch {
    return '-05:00';
  }
}

/** Parse an ICS document into plain event objects. */
export function parseIcs(text) {
  const lines = unfold(text).split(/\r?\n/);
  const events = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) continue;

    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    const parsed = parseLine(line);
    if (!parsed) continue;
    const { name, params, value } = parsed;

    switch (name) {
      case 'UID':
        current.uid = value;
        break;
      case 'SUMMARY':
        current.summary = unescapeText(value);
        break;
      case 'DESCRIPTION':
        current.description = unescapeText(value);
        break;
      case 'LOCATION':
        current.location = unescapeText(value);
        break;
      case 'URL':
        current.url = value.trim();
        break;
      case 'DTSTART': {
        const { iso, allDay } = toIso(value, params);
        current.start = iso;
        current.allDay = allDay;
        break;
      }
      case 'DTEND': {
        current.end = toIso(value, params).iso;
        break;
      }
      case 'CATEGORIES':
        current.categories = unescapeText(value);
        break;
      default:
        break;
    }
  }

  return events;
}

/**
 * Map raw ICS events onto the shape the Assignments screen already renders —
 * identical to what the Google Calendar path returns, so the UI is unchanged.
 */
export function toAssignments(icsEvents, { daysBack = 14, daysAhead = 120 } = {}) {
  const min = Date.now() - daysBack * 86400000;
  const max = Date.now() + daysAhead * 86400000;

  return icsEvents
    .filter((e) => e.start)
    .map((e) => {
      const title = e.summary || '(untitled)';
      return {
        id: e.uid || `${title}-${e.start}`,
        calendarId: 'ics',
        title,
        description: e.description || null,
        due: e.start,
        allDay: Boolean(e.allDay),
        url: e.url || null,
        sourceUrl: e.url || extractLink(e.description),
        location: e.location || null,
        // Canvas titles read "Essay 2 [ENG 101-01]".
        course: extractCourse(title),
        // Lets the Today brief say "2 assignments due" rather than lumping
        // everything in with calendar appointments.
        type: classify(e),
      };
    })
    .filter((a) => {
      const t = new Date(a.due).getTime();
      return Number.isFinite(t) && t >= min && t <= max;
    })
    .sort((a, b) => new Date(a.due) - new Date(b.due));
}

/**
 * Assignment or plain calendar entry?
 * Canvas encodes this in the UID (`event-assignment-123` vs `event-calendar-event-123`).
 * A Google-hosted copy of the Canvas feed keeps those UIDs, so this still works
 * when the feed is read via Google. Falls back to the wording of the title.
 */
function classify(e) {
  const uid = (e.uid || '').toLowerCase();
  if (uid.includes('assignment') || uid.includes('quiz')) return 'assignment';
  if (uid.includes('calendar-event')) return 'event';
  if (/\b(due|quiz|exam|essay|problem set|homework|hw|lab report)\b/i.test(e.summary || '')) {
    return 'assignment';
  }
  return 'event';
}

function extractCourse(title) {
  const m = title.match(/\[([^\]]+)\]\s*$/);
  return m ? m[1].trim() : null;
}

function extractLink(description) {
  if (!description) return null;
  const m = description.match(/https?:\/\/[^\s"'<>]+/);
  return m ? m[0] : null;
}
