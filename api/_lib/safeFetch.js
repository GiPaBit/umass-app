import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { UA } from './http.js';

/**
 * fetchText for URLs a *user* supplied, as opposed to the hardcoded umass.edu hosts the
 * other routes scrape.
 *
 * On Vercel these feeds were fetched from a throwaway sandbox with nothing interesting
 * on its network. Self-hosted, the same code runs on someone's own box, one hop from a
 * router admin page and the Docker gateway — so a calendar URL pasted into a text box
 * becomes a request-forgery primitive. This resolves the host first, refuses anything
 * that is not publicly routable, and follows redirects by hand so a public host cannot
 * bounce us inward after the check has already passed.
 *
 * Residual risk, documented rather than fixed: between the lookup and the connection the
 * DNS answer could change (rebinding). Closing that needs a custom undici Agent with its
 * own `lookup`, which would be this project's first runtime dependency. The check below
 * stops the realistic version of the attack — a redirect or a hostname that simply
 * resolves inward.
 */

const ALLOW_PRIVATE = process.env.ALLOW_PRIVATE_FEEDS === '1';

export async function fetchPublicText(startUrl, { timeout = 15000, maxBytes = 5_000_000, maxHops = 5 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let url = new URL(startUrl);

  try {
    for (let hop = 0; ; hop++) {
      if (hop > maxHops) throw new Error('Too many redirects.');
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error('Feed URL must be an http(s) or webcal link.');
      }
      await assertPubliclyRoutable(url.hostname);

      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'user-agent': UA, accept: 'text/calendar, text/plain, */*' },
        // The whole point: `follow` would hand redirect-following to undici, which does
        // not re-run the check above for each hop.
        redirect: 'manual',
      });

      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        url = new URL(location, url);
        continue;
      }
      if (!res.ok) throw new Error(`Upstream ${res.status} ${res.statusText} for ${url}`);

      return await readCapped(res, maxBytes);
    }
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Upstream timed out after ${timeout}ms: ${url}`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Read a body but stop at maxBytes — res.text() on an attacker-chosen URL is unbounded. */
async function readCapped(res, maxBytes) {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let out = '';
  let seen = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    seen += value.byteLength;
    if (seen > maxBytes) {
      await reader.cancel();
      throw new Error(`That calendar is larger than ${Math.round(maxBytes / 1e6)} MB.`);
    }
    out += decoder.decode(value, { stream: true });
  }
  return out + decoder.decode();
}

async function assertPubliclyRoutable(hostname) {
  if (ALLOW_PRIVATE) return; // opt-out for a calendar hosted on your own LAN

  // A bare IP in the URL skips DNS entirely.
  const literal = hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(literal) ? [{ address: literal }] : await lookup(hostname, { all: true });

  if (!addresses.length) throw new Error(`Could not resolve ${hostname}.`);
  for (const { address } of addresses) {
    if (isPrivate(address)) {
      throw new Error(`${hostname} resolves to a private address (${address}); refusing to fetch it.`);
    }
  }
}

/** True for anything not routable on the public internet — and for anything unparseable. */
function isPrivate(ip) {
  const kind = isIP(ip);
  if (kind === 6) return isPrivateV6(ip.toLowerCase());
  if (kind !== 4) return true; // not an address we can reason about, so refuse it

  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || // 0.0.0.0/8
    a === 10 || // private
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // 100.64/10 carrier NAT
    (a === 169 && b === 254) || // link local, incl. cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    (a === 192 && b === 0) || // 192.0.0/24 protocol assignments
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast and reserved
  );
}

function isPrivateV6(v6) {
  const g = v6Groups(v6);
  if (!g) return true; // unparseable, so refuse rather than guess

  // Several v6 forms carry a v4 address in the low 32 bits, and the kernel will happily
  // use them to reach it — judge those as the v4 address they wrap. Note that new URL()
  // rewrites "::ffff:127.0.0.1" to "::ffff:7f00:1", so matching only the dotted-quad
  // spelling would miss every one of them.
  const embedsV4 =
    (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) || // ::ffff:0:0/96 v4-mapped
    g.slice(0, 6).every((x) => x === 0) || // ::/96 v4-compatible, plus :: and ::1
    (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)); // 64:ff9b::/96 NAT64
  if (embedsV4) {
    return isPrivate(`${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`);
  }

  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7  unique local
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
  return false;
}

/** Expand an IPv6 address to its eight 16-bit groups, or null if it will not parse. */
function v6Groups(addr) {
  let s = addr;

  // A trailing dotted quad occupies the last two groups; convert it to hex first.
  const quad = s.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (quad) {
    const [a, b, c, d] = quad.slice(1).map(Number);
    if ([a, b, c, d].some((n) => n > 255)) return null;
    s = `${s.slice(0, quad.index)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }

  const parts = s.split('::');
  if (parts.length > 2) return null;
  const head = parts[0] ? parts[0].split(':') : [];
  const tail = parts.length === 2 && parts[1] ? parts[1].split(':') : [];

  const groups =
    parts.length === 1 ? head : [...head, ...Array(8 - head.length - tail.length).fill('0'), ...tail];
  if (groups.length !== 8) return null;

  const out = [];
  for (const part of groups) {
    const n = parseInt(part, 16);
    if (!/^[0-9a-f]{1,4}$/.test(part) || Number.isNaN(n)) return null;
    out.push(n);
  }
  return out;
}
