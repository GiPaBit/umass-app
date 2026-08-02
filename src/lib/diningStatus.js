/**
 * One line of smart status text to pair with a single StatusPill — never
 * duplicates "Closed"/"Open" text the pill itself already shows. Returns null
 * when there's nothing worth adding beyond the pill (e.g. a bare "Closed"
 * scrape with no computable reopen time) — callers should skip rendering the
 * line entirely in that case rather than repeat the pill's word.
 */
export function statusLine(status) {
  if (!status) return 'Hours unavailable';

  if (status.state === 'open') {
    if (status.hoursText && !/^open$/i.test(status.hoursText.trim())) return status.hoursText;
    return null;
  }

  if (status.state === 'closed') {
    if (status.opensLabel) return status.opensLabel;
    if (status.hoursText && !/^closed$/i.test(status.hoursText.trim())) return status.hoursText;
    return null;
  }

  return status.hoursText || 'Hours unavailable';
}
