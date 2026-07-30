import { useCallback, useEffect, useRef, useState } from 'react';
import { Spinner } from './ui.jsx';

const PULL_TRIGGER = 68; // px of pull needed to fire a refresh
const PULL_MAX = 110; // hard stop so the content never flies off screen
const RESISTANCE = 0.52; // finger travel -> content travel, giving rubber-band feel

/**
 * A full tab screen: frosted nav bar, large title that collapses into the bar on
 * scroll (Settings / Music style), and pull-to-refresh.
 *
 * The large title lives inside the scroll content, so it simply scrolls away.
 * Crossing a threshold swaps in the compact title and the hairline separator.
 */
export function Screen({ title, children, onRefresh, trailing, subtitle }) {
  const scrollRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // Mirrors `pulling` as state: the transform must animate on release but track
  // the finger exactly during the drag, and render has to see that difference.
  const [dragging, setDragging] = useState(false);

  // --- title collapse -----------------------------------------------------
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        // ~ the point where the large title's baseline meets the nav bar.
        setCollapsed(el.scrollTop > 32);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // --- pull to refresh ----------------------------------------------------
  const startY = useRef(null);
  const pulling = useRef(false);

  const runRefresh = useCallback(async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    setPull(PULL_TRIGGER * 0.7); // hold the spinner in view while loading
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPull(0);
    }
  }, [onRefresh, refreshing]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onRefresh) return;

    const onTouchStart = (e) => {
      if (el.scrollTop <= 0 && e.touches.length === 1) {
        startY.current = e.touches[0].clientY;
        pulling.current = false;
      } else {
        startY.current = null;
      }
    };

    const onTouchMove = (e) => {
      if (startY.current === null || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;

      if (delta > 0 && el.scrollTop <= 0) {
        pulling.current = true;
        setDragging(true);
        // Non-passive so this can win over the browser's own overscroll.
        e.preventDefault();
        setPull(Math.min(delta * RESISTANCE, PULL_MAX));
      } else if (pulling.current) {
        pulling.current = false;
        setDragging(false);
        setPull(0);
      }
    };

    const onTouchEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      if (!pulling.current) return;
      pulling.current = false;
      setDragging(false);
      setPull((current) => {
        if (current >= PULL_TRIGGER) {
          runRefresh();
          return current;
        }
        return 0;
      });
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [onRefresh, refreshing, runRefresh]);

  const armed = pull >= PULL_TRIGGER;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-bg">
      {/* Nav bar */}
      <header className="pt-safe absolute inset-x-0 top-0 z-20">
        <div
          className={`ios-blur relative transition-shadow duration-300 ${
            collapsed ? 'shadow-[0_0.5px_0_0_var(--c-separator)]' : ''
          }`}
        >
          <div className="flex h-[44px] items-center justify-center px-4">
            <span
              className="truncate text-[17px] font-semibold text-label transition-opacity duration-200"
              style={{ opacity: collapsed ? 1 : 0 }}
            >
              {title}
            </span>
            {trailing && <div className="absolute right-3 flex items-center gap-2">{trailing}</div>}
          </div>
        </div>
      </header>

      {/* Pull-to-refresh indicator, revealed behind the content as it moves down */}
      {onRefresh && (
        <div
          className="pt-safe pointer-events-none absolute inset-x-0 top-[44px] z-10 flex justify-center"
          style={{ opacity: pull > 6 ? 1 : 0, transition: 'opacity 150ms' }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-sm"
            style={{
              transform: `translateY(${Math.max(0, pull - 34)}px) rotate(${pull * 3}deg)`,
              transition: refreshing ? 'transform 200ms var(--ease-ios)' : 'none',
            }}
          >
            {refreshing ? (
              <Spinner className="h-4 w-4 text-label-2" />
            ) : (
              <div
                className={`h-4 w-4 rounded-full border-2 transition-colors ${
                  armed ? 'border-ios-blue' : 'border-label-3'
                }`}
                style={{ borderTopColor: 'transparent' }}
              />
            )}
          </div>
        </div>
      )}

      {/* Scrolling content */}
      <div
        ref={scrollRef}
        className="ios-scroll no-scrollbar h-full overflow-y-auto"
        style={{
          transform: pull ? `translateY(${pull}px)` : 'none',
          transition: dragging ? 'none' : 'transform 320ms var(--ease-ios)',
        }}
      >
        {/* Spacer clearing the fixed nav bar */}
        <div className="pt-safe h-[44px]" />

        {/* Large title */}
        <div className="px-4 pt-2 pb-1">
          <h1 className="text-[34px] leading-[41px] font-bold tracking-[-0.4px] text-label">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[15px] text-label-2">{subtitle}</p>}
        </div>

        <div className="screen-enter pb-[calc(env(safe-area-inset-bottom)+92px)]">{children}</div>
      </div>
    </div>
  );
}
