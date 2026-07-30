// Minimal HTML helpers. The pages we parse are regular enough that a linear scan
// beats pulling in a full DOM parser, and it keeps the serverless bundle tiny.

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  ndash: '–', mdash: '—', hellip: '…', eacute: 'é', deg: '°',
};

/** Decode the HTML entities that actually show up in UMass pages. */
export function decodeEntities(str = '') {
  return str
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/** Strip tags and collapse whitespace into a single clean line of text. */
export function textOf(html = '') {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/** Read one attribute out of a single tag's source, tolerating single or double quotes. */
export function attr(tagSource, name) {
  const m =
    tagSource.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i')) ||
    tagSource.match(new RegExp(`\\s${name}\\s*=\\s*'([^']*)'`, 'i'));
  return m ? decodeEntities(m[1]).trim() : '';
}

/** Pull the inner HTML of every element matching a tag + class name. */
export function blocksByClass(html, tag, className) {
  const out = [];
  const open = new RegExp(`<${tag}\\b[^>]*class\\s*=\\s*["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, 'gi');
  let m;
  while ((m = open.exec(html))) {
    const start = m.index + m[0].length;
    // Walk forward counting nested opens/closes so we grab the matching end tag.
    const scanner = new RegExp(`<${tag}\\b|</${tag}>`, 'gi');
    scanner.lastIndex = start;
    let depth = 1;
    let s;
    while ((s = scanner.exec(html))) {
      depth += s[0].startsWith('</') ? -1 : 1;
      if (depth === 0) {
        out.push(html.slice(start, s.index));
        break;
      }
    }
  }
  return out;
}
