import { fetchJson } from '../http.js';

const ENGAGE_API = 'https://umassamherst.campuslabs.com/engage/api/discovery/search/organizations';
const ENGAGE_ORG_BASE = 'https://umassamherst.campuslabs.com/engage/organization';
export const ENGAGE_CSC_URL = `${ENGAGE_ORG_BASE}/csc`;

/**
 * The official RecWell club-sports page has no real per-club list (just a
 * contact email) — the only structured directory is this unauthenticated,
 * *unofficial/undocumented* JSON endpoint the Campus Labs "Engage" site's own
 * search box calls (found by inspecting its own frontend requests, confirmed
 * live). It could change shape or disappear without notice — this module
 * degrades the same way every other source here does (empty clubs list,
 * `sourceFailed: true`, entry in `failures[]`), never a thrown error the UI has
 * to handle specially.
 */
export async function getClubSports() {
  const failures = [];
  let clubs = [];
  try {
    const url = `${ENGAGE_API}?top=200&query=${encodeURIComponent('club sport')}`;
    const data = await fetchJson(url);
    const raw = data?.value || [];
    clubs = raw
      .filter(
        (v) =>
          v.Status === 'Active' &&
          v.WebsiteKey !== 'csc' &&
          (v.CategoryNames || []).some((c) => /club sport/i.test(c)),
      )
      .map((v) => {
        const officialUrl = `${ENGAGE_ORG_BASE}/${v.WebsiteKey}`;
        const externalUrl = extractExternalLink(v.Description) || extractExternalLink(v.Summary);
        return {
          name: v.Name,
          link: externalUrl || officialUrl,
          linkTier: externalUrl ? 'signup' : 'official',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    failures.push({ what: 'Club sports directory', error: String(err.message || err) });
  }

  return {
    clubSports: {
      clubs,
      sourceFailed: clubs.length === 0 && failures.length > 0,
      url: ENGAGE_CSC_URL,
    },
    failures,
  };
}

/** Pull the first non-Engage link out of a club's HTML description/summary, if any. */
function extractExternalLink(html) {
  if (!html) return null;
  const m = html.match(/<a\b[^>]*href="([^"]+)"/i);
  if (!m) return null;
  const url = m[1];
  if (/campuslabs\.com/i.test(url)) return null;
  return url;
}
