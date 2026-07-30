import { KEYS, read, write } from './storage.js';

/**
 * Quick-added events: things seen on a flyer or a story that should sit in the
 * same feed as official events. Stored locally — no backend, no accounts.
 *
 * They use the exact same NormalizedEvent shape the server sources emit (see
 * api/_lib/events/index.js), which is what lets the Events screen merge both
 * without any special-casing beyond the `isUserAdded` badge.
 */

export function listQuickEvents() {
  return read(KEYS.quickEvents, []);
}

export function saveQuickEvent(event) {
  const all = listQuickEvents();
  const existing = all.findIndex((e) => e.id === event.id);
  if (existing >= 0) all[existing] = event;
  else all.push(event);
  write(KEYS.quickEvents, all);
  return event;
}

export function deleteQuickEvent(id) {
  write(
    KEYS.quickEvents,
    listQuickEvents().filter((e) => e.id !== id),
  );
}

export function makeQuickEvent({ title, start, end, location, notes, imageDataUrl, url }) {
  return {
    id: `quick-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: 'quick',
    sourceLabel: 'Added by me',
    title: title?.trim() || 'Untitled',
    description: notes?.trim() || null,
    start: start || null,
    end: end || null,
    allDay: !start?.includes('T'),
    location: location?.trim() || null,
    url: url?.trim() || null,
    imageUrl: imageDataUrl || null,
    category: 'Added by me',
    categories: ['Added by me'],
    tags: [],
    free: false,
    isUserAdded: true,
    createdAt: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* Paste parsing                                                                */
/* -------------------------------------------------------------------------- */

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Best-effort extraction of a title/date/time/location from pasted flyer text.
 * Everything it guesses is shown in an editable form first — it never saves
 * blind. Deliberately simple; the point is to save typing, not to be clever.
 */
export function parsePastedText(text) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const flat = lines.join(' ');
  const result = { title: null, date: null, time: null, location: null, notes: text.trim() };

  // Title: first line that is not purely a date/time/hashtag blob.
  const titleLine =
    lines.find((l) => l.length > 2 && l.length < 120 && !/^\W*(#|@)/.test(l) && !isMostlyDate(l)) || null;

  // Track the raw fragments matched below so they can be stripped from the title.
  const consumed = [];

  // Date: "Aug 14", "August 14th", "8/14", "14 Aug"
  const monthFirst = flat.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
  );
  const dayFirst = flat.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i,
  );
  const numeric = flat.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);

  if (monthFirst) {
    result.date = buildDate(MONTHS[monthFirst[1].toLowerCase()], Number(monthFirst[2]));
    consumed.push(monthFirst[0]);
  } else if (dayFirst) {
    result.date = buildDate(MONTHS[dayFirst[2].toLowerCase()], Number(dayFirst[1]));
    consumed.push(dayFirst[0]);
  } else if (numeric) {
    const year = numeric[3]
      ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3])
      : undefined;
    result.date = buildDate(Number(numeric[1]) - 1, Number(numeric[2]), year);
    consumed.push(numeric[0]);
  } else if (/\btonight\b|\btoday\b/i.test(flat)) {
    result.date = isoDate(new Date());
  } else if (/\btomorrow\b/i.test(flat)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    result.date = isoDate(d);
  }

  // Time: "9pm", "9:30 PM"
  const time = flat.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (time) {
    let hour = Number(time[1]);
    const min = time[2] || '00';
    const mer = time[3].toLowerCase();
    if (mer === 'pm' && hour !== 12) hour += 12;
    if (mer === 'am' && hour === 12) hour = 0;
    result.time = `${String(hour).padStart(2, '0')}:${min}`;
    consumed.push(time[0]);
  }

  // Location: "Location: X" is matched against the raw text so it stops at the
  // line end rather than running into whatever came next.
  const explicit = text.match(/\blocation:\s*([^\n,.]{3,50})/i);
  const atSign = flat.match(/(?:^|\s)@\s?([A-Z][\w' .&-]{2,40})/);
  const atWord = flat.match(/\bat\s+((?:the\s+)?[A-Z][\w' .&-]{2,40})/);
  const loc = explicit || atSign || atWord;
  if (loc) {
    result.location = loc[1].trim().replace(/[\s,–—-]+$/, '');
    // "@ Puffton" is part of the title line; drop it from the title too.
    if (loc === atSign || loc === atWord) consumed.push(loc[0]);
  }

  result.title = titleLine ? cleanTitle(titleLine, consumed) : null;

  return result;
}

/** Strip the fragments already captured as date/time/location out of the title. */
function cleanTitle(line, consumed) {
  let out = line;
  for (const fragment of consumed) {
    if (!fragment) continue;
    out = out.replace(fragment, ' ');
  }
  out = out
    // Tidy the separators left behind ("Rooftop party  —  ,  , byob").
    .replace(/\s*[–—-]\s*(?=[,\s]|$)/g, ' ')
    .replace(/\s*,\s*(?=,|$)/g, '')
    .replace(/[\s,–—-]+$/, '')
    .replace(/^[\s,–—-]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  // If stripping ate the whole line, the original is the better guess.
  return out.length >= 3 ? out : line.trim();
}

function isMostlyDate(line) {
  return /^\W*\d{1,2}[/:]\d{1,2}/.test(line) || /^\W*(mon|tue|wed|thu|fri|sat|sun)/i.test(line);
}

function buildDate(month, day, year) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const d = new Date(y, month, day);
  // A bare "Aug 14" that already passed most likely means next year.
  if (!year && d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    d.setFullYear(y + 1);
  }
  return isoDate(d);
}

function isoDate(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Flyer photos are stored inline as data URLs, so they must stay small —
 * localStorage caps out around 5 MB for the whole origin.
 */
export function compressImage(file, { maxDimension = 900, quality = 0.7 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a readable image.'));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
