import { decodeEntities, textOf } from '../html.js';

export const REC_BASE = 'https://www.umass.edu';
export const FUSION_BASE = 'https://recwell.umass.edu';

export const REC_PAGES = {
  hours: '/recwell/facilities/hours-operation',
  intramurals: '/recwell/programs-and-services/intramural-sports',
  clubSports: '/recwell/club-sports',
  fitness: '/recwell/programs-and-services/fitness-programs',
  fitnessSchedule: '/recwell/group-fitness-schedule-1',
  aquatics: '/recwell/programs-and-services/aquatics',
  climbing: '/recwell/programs-and-services/climbing',
  nest: '/recwell/nest',
  schedules: '/recwell/schedules',
  membership: '/recwell/membership',
};

/**
 * RecWell runs on the standard UMass Drupal theme. Every content page is
 * `<main>` containing `<h2>/<h3>` headings followed by `<p>`/`<ul>` bodies, so a
 * single section parser serves hours, intramurals, club sports, fitness, aquatics,
 * climbing and NEST alike.
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
    // <br> inside a <p> separates one thought from the next.
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
export function extractMain(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  let body = main ? main[1] : html;
  body = body
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  return body;
}

export function extractLinks(html) {
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

/** Find the first link on a page whose visible text matches a pattern. */
export function findLinkByLabel(sections, pattern) {
  for (const s of sections) {
    const hit = s.links.find((l) => pattern.test(l.label));
    if (hit) return hit.url;
  }
  return null;
}
