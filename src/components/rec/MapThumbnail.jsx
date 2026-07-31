/**
 * No Maps API key exists in this app (checked CLAUDE.md's env table — none
 * present), so this deliberately isn't a real static map tile — it's a styled
 * placeholder that deep-links to the platform's native maps app, same as every
 * other external link in the app (plain <a href>, no API key required).
 */
function isApplePlatform() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
}

export function MapThumbnail({ label, query }) {
  const href = isApplePlatform()
    ? `https://maps.apple.com/?q=${encodeURIComponent(query)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="ios-press-scale mx-4 mt-3 flex items-center gap-3 overflow-hidden rounded-[16px] bg-card p-4"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ios-red/15 text-ios-red">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" />
          <circle cx="12" cy="9" r="2.4" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-label">{label}</div>
        <div className="text-[13px] text-label-2">Open in Maps</div>
      </div>
    </a>
  );
}
