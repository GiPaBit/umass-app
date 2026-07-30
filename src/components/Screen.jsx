import { useCallback, useEffect, useRef, useState } from 'react';
import { Spinner } from './ui.jsx';

const PULL_TRIGGER = 68; // px of pull needed to fire a refresh
const PULL_MAX = 110; // hard stop so the content never flies off screen
const RESISTANCE = 0.52; // finger travel -> content travel, giving rubber-band feel
const SHRINK_OVER = 56; // px of scroll across which the title collapses

/**
 * A full tab screen.
 *
 * There is no nav bar. The large title lives at the top of the scroll content and
 * shrinks in place as you scroll, staying pinned to the top rather than jumping
 * into a separate bar. A soft blur fades in behind it only once shrunk, purely so
 * text scrolling underneath stays legible — no bar, no divider.
 *
 * Safe-area inset is applied to the non-scrolling wrapper, so `sticky top-0`
 * parks the title below the notch instead of under it.
 */
export function Screen({ title, children, onRefresh, trailing, subtitle }) {
  const scrollRef = useRef(null);
  const [progress, setProgress] = useState(0); // 0 = full size, 1 = fully shrunk
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);

  // --- title shrink -------------------------------------------------------
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setProgress(Math.min(1, Math.max(0, el.scrollTop / SHRINK_OVER)));
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
    setPull(PULL_TRIGGER * 0.7);
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
        e.preventDefault(); // non-passive, so this beats the browser's overscroll
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

  // 34px large title -> 20px compact, interpolated rather than swapped.
  const titleSize = 34 - 14 * progress;
  const titleTop = 8 - 8 * progress;

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden bg-bg"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Floating actions — their own icons in the corner, not a bar. */}
      {trailing && (
        <div className="absolute top-0 right-2 z-30 flex items-center gap-1" style={{ marginTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center gap-1 pt-2">{trailing}</div>
        </div>
      )}

      {/* Pull-to-refresh indicator */}
      {onRefresh && (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 flex justify-center"
          style={{ top: 'calc(env(safe-area-inset-top) + 6px)', opacity: pull > 6 ? 1 : 0, transition: 'opacity 150ms' }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-sm"
            style={{
              transform: `translateY(${Math.max(0, pull - 30)}px) rotate(${pull * 3}deg)`,
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

      <div
        ref={scrollRef}
        className="ios-scroll no-scrollbar min-h-0 flex-1 overflow-y-auto"
        style={{
          transform: pull ? `translateY(${pull}px)` : 'none',
          transition: dragging ? 'none' : 'transform 320ms var(--ease-ios)',
        }}
      >
        {/* Title: sticks to the top and shrinks in place. */}
        <div
          className="sticky top-0 z-10 px-4"
          style={{
            paddingTop: `${titleTop + 8}px`,
            paddingBottom: `${8 + 4 * (1 - progress)}px`,
            // Blur only once shrunk, so content passing beneath stays readable.
            background: progress > 0.06 ? 'var(--c-chrome)' : 'transparent',
            backdropFilter: progress > 0.06 ? 'saturate(180%) blur(20px)' : 'none',
            WebkitBackdropFilter: progress > 0.06 ? 'saturate(180%) blur(20px)' : 'none',
            transition: 'background 200ms linear',
          }}
        >
          <h1
            className="font-display truncate font-bold text-label"
            style={{ fontSize: `${titleSize}px`, lineHeight: 1.2 }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="truncate text-[15px] text-label-2"
              style={{
                opacity: 1 - progress * 1.6,
                height: progress > 0.6 ? 0 : 'auto',
                marginTop: progress > 0.6 ? 0 : '2px',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        <div className="screen-enter pb-[calc(env(safe-area-inset-bottom)+92px)]">{children}</div>
      </div>
    </div>
  );
}
