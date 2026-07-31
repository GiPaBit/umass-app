/**
 * Installed-as-webapp vs. still-in-Safari detection. `display-mode: standalone`
 * covers the modern/Android case; `navigator.standalone` is the older
 * iOS-Safari-specific flag and is still what iOS sets once a page has been
 * added to the home screen.
 */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone);
}

/**
 * Stamps `data-standalone` on <html> so CSS can key off install state, and
 * nudges WebKit to recompute `env(safe-area-inset-*)`. iOS has a known quirk
 * where those values can go stale — frozen at whatever the layout viewport
 * was when a home-screen app was launched (or resumed from the app switcher's
 * back-forward cache) — leaving extra dead space above the home indicator
 * until something forces a real layout pass. A synchronous reflow on load and
 * on `pageshow` (which fires on bfcache restores, the common trigger) is the
 * standard mitigation.
 */
export function initPlatformDetection() {
  if (typeof document === 'undefined') return;

  const apply = () => {
    document.documentElement.setAttribute('data-standalone', String(isStandalone()));
    // Force a synchronous reflow so the engine re-derives safe-area insets
    // against current viewport geometry rather than a cached value.
    void document.body.offsetHeight;
  };

  apply();
  window.addEventListener('pageshow', apply);
  window.addEventListener('orientationchange', apply);
}
