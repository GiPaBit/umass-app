import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, ChevronIcon, CloseIcon, ExternalIcon, RefreshIcon } from './Icons.jsx';
import { createSpring } from '../lib/spring.js';

/* -------------------------------------------------------------------------- */
/* Lists — the iOS "inset grouped" table style                                  */
/* -------------------------------------------------------------------------- */

export function SectionHeader({ children, action }) {
  return (
    <div className="flex items-end justify-between px-5 pt-6 pb-2">
      <h2 className="text-[13px] font-normal uppercase tracking-[0.06em] text-label-2">{children}</h2>
      {action}
    </div>
  );
}

/** A rounded card that clips its rows, like a grouped UITableView section. */
export function ListGroup({ children, className = '' }) {
  return (
    <div className={`mx-4 overflow-hidden rounded-[16px] bg-card ${className}`}>{children}</div>
  );
}

/**
 * One row. Renders as a <button> when interactive so it gets the pressed state
 * and correct semantics for free.
 */
export function Row({
  title,
  subtitle,
  detail,
  leading,
  trailing,
  onClick,
  href,
  last = false,
  sepInset = 16,
  className = '',
  children,
}) {
  const interactive = Boolean(onClick || href);
  const Tag = href ? 'a' : onClick ? 'button' : 'div';

  const props = href
    ? { href, target: '_blank', rel: 'noreferrer' }
    : onClick
      ? { type: 'button', onClick }
      : {};

  return (
    <Tag
      {...props}
      style={{ '--sep-inset': `${sepInset}px` }}
      className={`relative flex w-full items-center gap-3 px-4 py-[11px] text-left ${
        interactive ? 'ios-press' : ''
      } ${last ? '' : 'ios-separator'} ${className}`}
    >
      {leading}
      <div className="min-w-0 flex-1">
        {children ?? (
          <>
            <div className="truncate text-[17px] leading-[22px] text-label">{title}</div>
            {subtitle && (
              <div className="mt-0.5 line-clamp-2 text-[13px] leading-[17px] text-label-2">{subtitle}</div>
            )}
          </>
        )}
      </div>
      {detail && <div className="shrink-0 text-[15px] text-label-2">{detail}</div>}
      {trailing}
      {href && <ExternalIcon className="shrink-0 text-label-3" />}
      {onClick && !trailing && <ChevronIcon className="shrink-0 text-label-3" />}
    </Tag>
  );
}

/* -------------------------------------------------------------------------- */
/* Status                                                                       */
/* -------------------------------------------------------------------------- */

/** Open / Closed / unknown, in iOS semantic colours. */
export function StatusPill({ state, children }) {
  const styles = {
    open: 'bg-ios-green/15 text-ios-green',
    closed: 'bg-ios-red/15 text-ios-red',
    unknown: 'bg-fill text-label-2',
  };
  const label = children ?? { open: 'Open', closed: 'Closed', unknown: '—' }[state] ?? state;
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-[3px] text-[12px] font-semibold ${
        styles[state] || styles.unknown
      }`}
    >
      {label}
    </span>
  );
}

export function Badge({ children, tone = 'gray' }) {
  const tones = {
    gray: 'bg-fill text-label-2',
    blue: 'bg-ios-blue/15 text-ios-blue',
    green: 'bg-ios-green/15 text-ios-green',
    orange: 'bg-ios-orange/15 text-ios-orange',
    purple: 'bg-ios-purple/15 text-ios-purple',
    red: 'bg-ios-red/15 text-ios-red',
    teal: 'bg-ios-teal/15 text-ios-teal',
  };
  return (
    <span className={`rounded-[6px] px-[6px] py-[2px] text-[11px] font-medium ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                     */
/* -------------------------------------------------------------------------- */

/** iOS segmented control with a sliding selected pill. */
export function SegmentedControl({ options, value, onChange, className = '' }) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <div className={`relative flex rounded-[9px] bg-fill p-[2px] ${className}`}>
      <div
        className="absolute inset-y-[2px] rounded-[7px] bg-bg-elevated shadow-sm transition-transform duration-[280ms]"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(calc(${index} * 100%))`,
          transitionTimingFunction: 'var(--ease-ios)',
        }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`relative z-10 flex-1 truncate rounded-[7px] px-2 py-[6px] text-[13px] font-medium transition-colors ${
            option.value === value ? 'text-label' : 'text-label-2'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ${
        checked ? 'bg-ios-green' : 'bg-fill-strong'
      }`}
    >
      <span
        className="absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-[280ms]"
        style={{
          transform: checked ? 'translateX(20px)' : 'none',
          transitionTimingFunction: 'var(--ease-ios)',
        }}
      />
    </button>
  );
}

/** A checkbox drawn as an iOS Reminders-style circle. */
export function CheckCircle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full border-[1.6px] transition-colors ${
        checked ? 'border-ios-blue bg-ios-blue text-white' : 'border-label-3 text-transparent'
      }`}
    >
      <CheckIcon width={14} height={14} strokeWidth={3} />
    </button>
  );
}

export function Button({ children, variant = 'filled', onClick, type = 'button', className = '', disabled }) {
  const variants = {
    filled: 'bg-ios-blue text-white',
    tinted: 'bg-ios-blue/15 text-ios-blue',
    gray: 'bg-fill text-label',
    destructive: 'bg-ios-red/15 text-ios-red',
    plain: 'text-ios-blue',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`ios-press-scale rounded-[12px] px-4 py-[11px] text-[17px] font-medium disabled:opacity-40 ${
        variants[variant]
      } ${className}`}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Sheet                                                                        */
/* -------------------------------------------------------------------------- */

const DETENT_COMMIT_FRACTION = 0.25; // dragged past this fraction of the gap to a neighboring detent commits to it
const FLICK_VELOCITY_PX_S = 550; // a release faster than this overrides the position threshold
const BACKDROP_MAX_OPACITY = 0.4;
const CONTENT_MARGIN_PX = 24; // handle + content + this ≈ a "content" detent's natural height
const VIEWPORT_TOP_GAP_PX = 10; // sliver of background left below the safe area, matching native iOS full presentation

const DEFAULT_DETENTS = [{ key: 'resting', height: 'content' }];

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * `env(safe-area-inset-top)` can't be read directly from JS — measure it via a
 * zero-size probe whose only height comes from that padding. Used so the
 * `'viewport'` detent caps at the safe area instead of the physical top of the
 * screen, where it would slide under the notch/Dynamic Island.
 */
function measureSafeAreaInsetTop() {
  if (typeof document === 'undefined') return 0;
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;padding-top:env(safe-area-inset-top);pointer-events:none;visibility:hidden;';
  document.body.appendChild(probe);
  const inset = probe.offsetHeight;
  document.body.removeChild(probe);
  return inset;
}

/** Resolve one detent's configured height into a concrete px number for this measurement pass. */
function resolveHeightPx(entry, { containerPx, contentPx }) {
  if (entry.height === 'viewport') return containerPx;
  if (entry.height === 'content') return contentPx == null ? null : Math.min(contentPx, containerPx);
  return Math.min(entry.height, containerPx);
}

/**
 * Turn a `detents` config (tallest → shortest) into concrete pixel heights and
 * the translateY each one sits at relative to the tallest (0 = tallest, larger
 * = shorter/lower). `null` while anything it depends on hasn't measured yet.
 */
function resolveDetents(detents, { containerPx, contentPx }) {
  if (containerPx == null) return null;
  const resolved = [];
  for (const entry of detents) {
    const px = resolveHeightPx(entry, { containerPx, contentPx });
    if (px == null) return null;
    resolved.push({ key: entry.key, px, translateY: containerPx - px });
  }
  return resolved;
}

/**
 * Given a live drag/settle position `y` and the detent index it started from,
 * decide which neighboring detent (by index into `resolvedDetents`, or
 * `resolvedDetents.length` to mean "dismiss") a release commits to — by
 * position (past ~25% of the gap) or velocity (a fast enough flick), in
 * whichever direction the gesture was headed. Otherwise springs back.
 */
function resolveRelease({ resolvedDetents, dismissY, fromIndex, y, velocityPxS }) {
  const positions = [...resolvedDetents.map((d) => d.translateY), dismissY];
  const current = positions[fromIndex];
  const downY = positions[fromIndex + 1] ?? null;
  const upY = fromIndex > 0 ? positions[fromIndex - 1] : null;

  if (y > current && downY != null) {
    const gap = downY - current;
    const frac = gap > 0 ? (y - current) / gap : 1;
    if (frac > DETENT_COMMIT_FRACTION || velocityPxS > FLICK_VELOCITY_PX_S) return fromIndex + 1;
  } else if (y < current && upY != null) {
    const gap = current - upY;
    const frac = gap > 0 ? (current - y) / gap : 1;
    if (frac > DETENT_COMMIT_FRACTION || -velocityPxS > FLICK_VELOCITY_PX_S) return fromIndex - 1;
  }
  return fromIndex;
}

/**
 * Bottom sheet with a real drag handle, spring-driven motion and a
 * configurable, ordered list of detents (tallest → shortest). Used for every
 * modal/popup surface in the app so gesture/motion behavior only has to be
 * right in one place — one shared spring (`src/lib/spring.js`), per-sheet
 * detent config.
 *
 * `detents`: `[{ key, height }]`, tallest first. `height` is either `'content'`
 * (measured from children, at most once per open — see below), `'viewport'`
 * (near-full-screen), or a literal px number (e.g. a `peek` detent — "roughly
 * a header's height" doesn't need to be measured, just eyeballed). Defaults to
 * a single `resting` content detent: the common "modal task" case (Settings,
 * Add a calendar, Quick Add, detail sheets) where there's no peek and the
 * height is frozen for the sheet's whole open session — that's the fix for
 * the add-a-calendar bug, where switching Google/Canvas/Other tabs used to
 * re-measure and re-snap the sheet live.
 *
 * `contentKey`: only matters for multi-detent sheets (the dining map pin is
 * the one user of this) — pass something that changes when the sheet's
 * subject changes (e.g. the pin's id) so the `content` detent re-measures for
 * genuinely new content, without re-measuring on every incidental internal
 * resize the way the old `ResizeObserver`-driven version did.
 *
 * Drag detection lives on raw DOM listeners (not JSX touch props) because React
 * attaches JSX touch handlers as passive — `preventDefault()` there is silently
 * ignored, same reason `Screen.jsx`'s pull-to-refresh does the same thing.
 *
 * `ref` exposes `expand()` / `collapse()` / `close()` so a parent can still
 * drive the sheet programmatically if it needs to.
 */
export const Sheet = forwardRef(function Sheet(
  { open, onClose, title, children, action, detents = DEFAULT_DETENTS, initialDetent, contentKey },
  ref,
) {
  const handleRef = useRef(null);
  const contentRef = useRef(null);
  const contentInnerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const reducedMotion = useRef(prefersReducedMotion());
  const spring = useRef(null);
  if (!spring.current) spring.current = createSpring(0);

  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [containerPx, setContainerPx] = useState(null);
  const [contentPx, setContentPx] = useState(null);
  const [motion, setMotion] = useState({ y: 0, opacity: 0 });
  const enteredRef = useRef(false);
  const detentIndexRef = useRef(0);

  const hasViewportDetent = detents[0]?.height === 'viewport';

  useImperativeHandle(ref, () => ({
    expand: () => goToDetent(0),
    collapse: () => goToDetent(detents.length - 1),
    close: () => onCloseRef.current?.(),
  }));

  // Reset for a fresh open; on close, keep the node mounted until the exit
  // animation (driven below) actually finishes, instead of unmounting the
  // instant the parent flips `open` false — that instant unmount was why
  // dismiss (X button, backdrop tap) never animated. Layout effect so a
  // reopen's stale `contentPx` is cleared before the measurement effects
  // below read it, instead of flashing the previous session's size first.
  useLayoutEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      enteredRef.current = false;
      setContentPx(null);
      reducedMotion.current = prefersReducedMotion();
    } else if (mounted && !closing) {
      beginClose(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Measure the "content" detent once per open (or when `contentKey` changes
  // for a genuinely new subject) — never on incidental internal resizes.
  //
  // Depends on `mounted`, not just `open`: the reset effect above flips
  // `mounted` true via its own `setState`, which — because `if (!mounted)
  // return null` gates the JSX — means the *first* render after `open`
  // becomes true still renders nothing (mounted hasn't caught up yet) and
  // `handleRef`/`contentInnerRef` are still null. Keying only on `open`
  // measured on that render and froze in a bogus ~0px reading forever, since
  // nothing was left to trigger a second measurement. `mounted` itself only
  // flips on the *next* render, once the real DOM has actually committed.
  useLayoutEffect(() => {
    if (!mounted) return;
    const h = handleRef.current?.offsetHeight || 0;
    const c = contentInnerRef.current?.offsetHeight || 0;
    setContentPx(h + c + CONTENT_MARGIN_PX);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, contentKey]);

  // The "viewport" detent (dining map pin's `full`) is screen-driven, not
  // content-driven — legitimate to recompute on resize/orientation change.
  useLayoutEffect(() => {
    if (!mounted) return;
    const measure = () => {
      if (hasViewportDetent) {
        setContainerPx(window.innerHeight - measureSafeAreaInsetTop() - VIEWPORT_TOP_GAP_PX);
      } else {
        setContainerPx(contentPx == null ? null : Math.min(contentPx, window.innerHeight * 0.92));
      }
    };
    measure();
    if (!hasViewportDetent) return;
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [mounted, hasViewportDetent, contentPx]);

  const resolvedDetents = useMemo(
    () => resolveDetents(detents, { containerPx, contentPx }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detents, containerPx, contentPx],
  );
  const dismissY = containerPx;

  function goToDetent(index, velocity) {
    if (!resolvedDetents?.[index]) return;
    detentIndexRef.current = index;
    if (reducedMotion.current) spring.current.jumpTo(resolvedDetents[index].translateY);
    else spring.current.setTarget(resolvedDetents[index].translateY, { velocity });
  }

  function beginClose(velocity) {
    setClosing(true);
    const target = dismissY ?? 0;
    // Reduced motion (or closing before the sheet ever finished measuring)
    // has no animation to wait on, so finalize immediately rather than
    // relying on the spring subscriber below to notice it "settled" — a
    // `jumpTo` stops the animation loop and never fires another frame.
    if (reducedMotion.current || dismissY == null) {
      spring.current.jumpTo(target);
      onCloseRef.current?.();
      setMounted(false);
    } else {
      spring.current.setTarget(target, { velocity });
    }
  }

  // Drive the entrance the same way every other transition happens — spring
  // from fully off-screen to the initial detent — once we know how tall
  // things are. Interruptible for free: it's the same spring every gesture
  // below reads from and writes to. Layout effect so the first paint never
  // shows the default (0, 0) motion state — that would flash a multi-detent
  // sheet open at its tallest detent for a frame before snapping to the
  // configured initial one.
  useLayoutEffect(() => {
    if (!open || enteredRef.current || !resolvedDetents || dismissY == null) return;
    enteredRef.current = true;
    const startIndex = Math.max(
      0,
      detents.findIndex((d) => d.key === (initialDetent ?? detents[0].key)),
    );
    detentIndexRef.current = startIndex;
    spring.current.jumpTo(dismissY);
    if (reducedMotion.current) spring.current.jumpTo(resolvedDetents[startIndex].translateY);
    else spring.current.setTarget(resolvedDetents[startIndex].translateY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resolvedDetents, dismissY]);

  // If the content behind the *current* detent genuinely changes size after
  // the initial entrance — the dining map pin sheet swapping to a different
  // pin while sitting at `medium`, "replacing content in place" per the spec
  // — glide to match, but only while at rest, so this can't interrupt a drag
  // or fight an in-flight settle.
  useEffect(() => {
    if (!open || !enteredRef.current || !resolvedDetents || !spring.current.settled) return;
    const target = resolvedDetents[detentIndexRef.current]?.translateY;
    if (target == null || Math.abs(spring.current.value - target) < 0.5) return;
    if (reducedMotion.current) spring.current.jumpTo(target);
    else spring.current.setTarget(target);
  }, [open, resolvedDetents]);

  // Subscribe the spring's per-frame value into render state (translate +
  // backdrop opacity, the latter a continuous function of position so it
  // never needs its own separate timed fade).
  useEffect(() => {
    const unsubscribe = spring.current.subscribe((y) => {
      const ref = dismissY || 1;
      const opacity = BACKDROP_MAX_OPACITY * Math.min(1, Math.max(0, 1 - y / ref));
      setMotion({ y, opacity });
      if (closing && spring.current.settled) {
        onCloseRef.current?.();
        setMounted(false);
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing, dismissY]);

  // Auto-promote to the next taller detent if content genuinely outgrows the
  // current one (e.g. the dining map pin's accordion expanding past `medium`)
  // — one-directional only, never demotes on its own, so this can't turn into
  // the same live-resnapping bug the frozen "content" detent above fixes.
  useEffect(() => {
    if (!open || !resolvedDetents || resolvedDetents.length < 2 || !contentInnerRef.current) return;
    const el = contentInnerRef.current;
    const ro = new ResizeObserver(() => {
      const measured = (handleRef.current?.offsetHeight || 0) + el.offsetHeight + CONTENT_MARGIN_PX;
      const idx = detentIndexRef.current;
      if (idx > 0 && measured > resolvedDetents[idx].px + 4) goToDetent(idx - 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resolvedDetents]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current?.();
    document.addEventListener('keydown', onKey);
    // Stop the page behind the sheet from scrolling.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // --- drag: scroll/drag arbitration + detent stepping -------------------
  useEffect(() => {
    if (!open || !resolvedDetents) return;
    const handle = handleRef.current;
    const content = contentRef.current;
    if (!handle || !content) return;

    const g = { startY: null, origin: null, engaged: false, startT: 0, lastY: 0, lastT: 0, startValue: 0 };

    const makeStart = (origin) => (e) => {
      if (e.touches.length !== 1) return;
      g.startY = e.touches[0].clientY;
      g.lastY = g.startY;
      g.startT = performance.now();
      g.lastT = g.startT;
      g.origin = origin;
      g.engaged = false;
      g.startScrollTop = content.scrollTop;
      g.scrollable = content.scrollHeight > content.clientHeight + 1;
      g.startValue = spring.current.value;
    };
    const onHandleStart = makeStart('handle');
    const onContentStart = makeStart('content');

    const onMove = (e) => {
      if (g.startY === null) return;
      const t = e.touches[0];
      const delta = t.clientY - g.startY;

      if (!g.engaged) {
        if (g.origin === 'handle') {
          g.engaged = true;
        } else {
          // Content only ever hands its own pan to the sheet when it's
          // already scrolled to the top and the pan is headed down — panning
          // up at the top is left to native scroll (with momentum) rather
          // than grabbed, and content shorter than its box always drags.
          const atTop = g.startScrollTop <= 0;
          if (!g.scrollable || (atTop && delta > 8)) g.engaged = true;
          else return;
        }
        // Grabbing mid-animation (e.g. mid-settle from a previous release)
        // must stop the spring's own rAF loop, or it fights the direct
        // `setValue` calls below for the rest of the drag.
        if (g.engaged) spring.current.stop();
      }

      e.preventDefault();
      g.lastY = t.clientY;
      g.lastT = performance.now();

      const min = resolvedDetents[0].translateY; // 0 — the tallest detent
      const raw = g.startValue + delta;
      const rubberBanded = raw < min ? min + (raw - min) / 3 : raw;
      spring.current.setValue(Math.min(rubberBanded, dismissY ?? rubberBanded));
    };

    const onEnd = () => {
      if (g.startY === null) return;
      const wasEngaged = g.engaged;
      const finalDelta = g.lastY - g.startY;
      const dtSeconds = Math.max(1, g.lastT - g.startT) / 1000;
      const velocityPxS = finalDelta / dtSeconds;
      g.startY = null;
      g.engaged = false;
      if (!wasEngaged) return;

      const releaseIndex = resolveRelease({
        resolvedDetents,
        dismissY,
        fromIndex: detentIndexRef.current,
        y: spring.current.value,
        velocityPxS,
      });
      if (releaseIndex >= resolvedDetents.length) beginClose(velocityPxS);
      else goToDetent(releaseIndex, velocityPxS);
    };

    handle.addEventListener('touchstart', onHandleStart, { passive: true });
    content.addEventListener('touchstart', onContentStart, { passive: true });
    handle.addEventListener('touchmove', onMove, { passive: false });
    content.addEventListener('touchmove', onMove, { passive: false });
    handle.addEventListener('touchend', onEnd, { passive: true });
    content.addEventListener('touchend', onEnd, { passive: true });
    handle.addEventListener('touchcancel', onEnd, { passive: true });
    content.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      handle.removeEventListener('touchstart', onHandleStart);
      content.removeEventListener('touchstart', onContentStart);
      handle.removeEventListener('touchmove', onMove);
      content.removeEventListener('touchmove', onMove);
      handle.removeEventListener('touchend', onEnd);
      content.removeEventListener('touchend', onEnd);
      handle.removeEventListener('touchcancel', onEnd);
      content.removeEventListener('touchcancel', onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resolvedDetents, dismissY]);

  if (!mounted) return null;

  const ready = resolvedDetents != null && containerPx != null;
  const heightPx = containerPx;
  // Near-fully-transparent (the map pin sheet's `peek`) means the map
  // underneath reads as usable — a full-screen click-catcher at that point
  // would silently eat taps on pins instead of letting them reach the map,
  // breaking "tap a different pin while open." Has to go on the outer
  // `fixed inset-0` wrapper, not just the backdrop div — that wrapper covers
  // the whole viewport too and would otherwise still catch the hit-test even
  // with the backdrop itself made non-interactive.
  const mapPassThrough = motion.opacity < BACKDROP_MAX_OPACITY * 0.15;

  // Portalled to <body>: the screen's entry animation establishes a containing
  // block, which would otherwise trap this `fixed` overlay inside the scroll area.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      style={{ pointerEvents: mapPassThrough ? 'none' : 'auto' }}
    >
      <div
        className={reducedMotion.current ? 'transition-opacity duration-150' : ''}
        style={{ position: 'absolute', inset: 0, background: '#000', opacity: motion.opacity }}
        onClick={onClose}
      />
      <div
        className={`relative flex w-full max-w-[560px] flex-col rounded-t-[var(--radius-sheet)] bg-bg shadow-2xl ${
          reducedMotion.current ? 'transition-opacity duration-150' : ''
        } ${ready ? '' : 'max-h-[92vh]'}`}
        style={{
          height: heightPx != null ? `${heightPx}px` : undefined,
          transform: `translate3d(0, ${ready ? motion.y : heightPx || 0}px, 0)`,
          visibility: ready ? 'visible' : 'hidden',
          opacity: reducedMotion.current ? (closing ? 0 : 1) : 1,
          // Re-enable regardless of the wrapper above — the sheet itself
          // (handle, content, close button) must stay interactive even while
          // passed-through at `peek`.
          pointerEvents: 'auto',
        }}
      >
        <div
          ref={handleRef}
          className="ios-blur shrink-0 rounded-t-[var(--radius-sheet)] border-b border-separator/60 pt-2 pb-3"
        >
          <div className="mx-auto mb-2 h-[5px] w-[36px] rounded-full bg-fill-strong" />
          <div className="flex items-center justify-between px-4">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="ios-press-scale -m-1 p-1 text-label-2"
            >
              <CloseIcon />
            </button>
            <div className="truncate px-2 text-[17px] font-semibold text-label">{title}</div>
            <div className="min-w-[28px] text-right">{action}</div>
          </div>
        </div>
        <div
          ref={contentRef}
          className="ios-scroll no-scrollbar flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),20px)]"
        >
          <div ref={contentInnerRef}>{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
});

/* -------------------------------------------------------------------------- */
/* States                                                                       */
/* -------------------------------------------------------------------------- */

export function Spinner({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={`spin h-5 w-5 ${className}`} fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-label-2">
      <Spinner />
      <span className="text-[15px]">{label}</span>
    </div>
  );
}

export function EmptyState({ title, message, icon, action }) {
  return (
    <div className="flex flex-col items-center gap-2 px-10 py-14 text-center">
      {icon && <div className="mb-1 text-label-3">{icon}</div>}
      <div className="text-[17px] font-semibold text-label">{title}</div>
      {message && <p className="text-[15px] leading-[20px] text-label-2">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Shown when an upstream site is down or changed shape — always offers a retry. */
export function ErrorState({ error, onRetry, what = 'this' }) {
  return (
    <div className="mx-4 mt-4 rounded-[16px] bg-card p-5 text-center">
      <div className="text-[17px] font-semibold text-label">Couldn’t load {what}</div>
      <p className="mt-1.5 text-[14px] leading-[19px] text-label-2">
        {error?.message || 'Something went wrong.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ios-press-scale mt-4 inline-flex items-center gap-1.5 rounded-[10px] bg-fill px-4 py-2 text-[15px] font-medium text-ios-blue"
        >
          <RefreshIcon width={16} height={16} />
          Try again
        </button>
      )}
    </div>
  );
}

/** Shown when data came from the offline snapshot instead of the network. */
export function StaleNotice({ data }) {
  if (!data?.stale) return null;
  const when = data.cachedAt
    ? new Date(data.cachedAt).toLocaleString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'earlier';
  return (
    <div className="mx-4 mt-3 rounded-[12px] bg-fill px-4 py-2.5">
      <p className="text-[13px] leading-[18px] text-label-2">
        You’re offline — showing what was last loaded {when}.
      </p>
    </div>
  );
}

/** A circular floating action, used where there is no nav bar to sit in. */
export function RoundButton({ children, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="ios-press-scale ios-blur flex h-9 w-9 items-center justify-center rounded-full text-ios-blue shadow-sm"
    >
      {children}
    </button>
  );
}

/** Non-fatal per-source warnings ("Athletics didn't load, everything else did"). */
export function FailureNotice({ failures }) {
  if (!failures?.length) return null;
  return (
    <div className="mx-4 mt-3 rounded-[12px] bg-ios-orange/12 px-4 py-3">
      <div className="text-[13px] font-semibold text-ios-orange">Some sources didn’t load</div>
      <ul className="mt-1 space-y-0.5">
        {failures.map((f) => (
          <li key={f.what || f.source} className="text-[12px] leading-[16px] text-label-2">
            {f.what || f.label}: {f.error}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Collapsible card — used for the Today tab's sections                         */
/* -------------------------------------------------------------------------- */

export function CollapsibleCard({ title, accessory, defaultOpen = true, children, count }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef(null);

  return (
    <div className="mx-4 mt-3 overflow-hidden rounded-[16px] bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ios-press flex w-full items-center gap-2 px-4 py-[13px] text-left"
      >
        <span className="flex-1 text-[17px] font-semibold text-label">{title}</span>
        {typeof count === 'number' && count > 0 && (
          <span className="rounded-full bg-fill px-2 py-[2px] text-[13px] font-medium text-label-2">
            {count}
          </span>
        )}
        {accessory}
        <ChevronIcon
          className="text-label-3 transition-transform duration-300"
          style={{ transform: open ? 'rotate(90deg)' : 'none', transitionTimingFunction: 'var(--ease-ios)' }}
        />
      </button>
      <div
        ref={bodyRef}
        className="grid transition-[grid-template-rows] duration-300"
        style={{
          gridTemplateRows: open ? '1fr' : '0fr',
          transitionTimingFunction: 'var(--ease-ios)',
        }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-separator/50">{children}</div>
        </div>
      </div>
    </div>
  );
}
