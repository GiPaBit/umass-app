import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, ChevronIcon, CloseIcon, ExternalIcon, RefreshIcon } from './Icons.jsx';

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

const SHEET_DISMISS_PX = 90; // dragged down this far (or a fast flick) counts as "let go"
const SHEET_EXPAND_PX = 36; // dragged up this far snaps straight to the full detent
const SHEET_FLICK_VELOCITY = 0.55; // px/ms — a fast flick overrides the distance thresholds

/**
 * Bottom sheet with a real drag handle, two detents (partial/full), swipe-down
 * to dismiss and swipe-up to expand. Used for every modal/popup surface in the
 * app so gesture behavior only has to be right in one place.
 *
 * Drag detection lives on raw DOM listeners (not JSX touch props) because React
 * attaches JSX touch handlers as passive — `preventDefault()` there is silently
 * ignored, same reason `Screen.jsx`'s pull-to-refresh does the same thing.
 *
 * `ref` exposes `expand()` / `collapse()` / `close()` so a parent can drive the
 * sheet programmatically (e.g. auto-expanding when an accordion row opens).
 */
export const Sheet = forwardRef(function Sheet(
  { open, onClose, title, children, action, initialDetent = 'partial' },
  ref,
) {
  const handleRef = useRef(null);
  const contentRef = useRef(null);
  const contentInnerRef = useRef(null);
  const detentRef = useRef(initialDetent);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [detent, setDetentState] = useState(initialDetent);
  const [partialPx, setPartialPx] = useState(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);

  const setDetent = (next) => {
    detentRef.current = next;
    setDetentState(next);
  };

  useImperativeHandle(ref, () => ({
    expand: () => setDetent('full'),
    collapse: () => setDetent('partial'),
    close: () => onCloseRef.current?.(),
  }));

  // Reset to a clean state every time the sheet (re)opens.
  useEffect(() => {
    if (!open) return;
    setDetent(initialDetent);
    setClosing(false);
    setDragY(0);
    setDragging(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Measure the partial detent from actual content, capped at 92vh — the same
  // ceiling the old fixed-height sheet used — so short content still looks
  // content-sized instead of always opening at a fixed fraction of the screen.
  //
  // Observing `contentInnerRef` (the unconstrained wrapper around `children`)
  // rather than the scrollable `contentRef` itself matters: `contentRef`'s own
  // box is pinned by the flex layout once a height is set, so it never resizes
  // even when the content inside it shrinks or grows — ResizeObserver watches
  // an element's rendered box, not its `scrollHeight`.
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const h = handleRef.current?.offsetHeight || 0;
      const c = contentInnerRef.current?.offsetHeight || 0;
      setPartialPx(Math.min(h + c + 24, window.innerHeight * 0.92));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (handleRef.current) ro.observe(handleRef.current);
    if (contentInnerRef.current) ro.observe(contentInnerRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [open]);

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

  // --- drag to dismiss / expand ------------------------------------------
  useEffect(() => {
    if (!open) return;
    const handle = handleRef.current;
    const content = contentRef.current;
    if (!handle || !content) return;

    const g = { startY: null, startScrollTop: 0, origin: null, engaged: false, startT: 0, lastY: 0, lastT: 0 };

    const makeStart = (origin) => (e) => {
      if (e.touches.length !== 1) return;
      g.startY = e.touches[0].clientY;
      g.lastY = g.startY;
      g.startT = Date.now();
      g.lastT = g.startT;
      g.origin = origin;
      g.engaged = false;
      g.startScrollTop = content.scrollTop;
    };
    const onHandleStart = makeStart('handle');
    const onContentStart = makeStart('content');

    const onMove = (e) => {
      if (g.startY === null) return;
      const t = e.touches[0];
      const delta = t.clientY - g.startY;

      if (!g.engaged) {
        // Only hijack the content's own scroll when it's already at the top —
        // otherwise this would fight normal scrolling at the full detent.
        const atTop = g.origin === 'handle' || g.startScrollTop <= 0;
        if (g.origin === 'handle') g.engaged = true;
        else if (atTop && Math.abs(delta) > 8) g.engaged = true;
        else return;
      }

      e.preventDefault();
      g.lastY = t.clientY;
      g.lastT = Date.now();
      setDragging(true);

      if (delta < 0) {
        // Swipe up: snap straight to the full detent past a small threshold
        // rather than live-growing an auto-sized box.
        if (detentRef.current !== 'full' && delta < -SHEET_EXPAND_PX) {
          setDetent('full');
          g.startY = null;
          g.engaged = false;
          setDragging(false);
          setDragY(0);
          return;
        }
        setDragY(0);
      } else {
        setDragY(delta);
      }
    };

    const onEnd = () => {
      if (g.startY === null) return;
      const wasEngaged = g.engaged;
      const finalDelta = g.lastY - g.startY;
      const dt = Math.max(1, g.lastT - g.startT);
      const velocity = finalDelta / dt;
      g.startY = null;
      g.engaged = false;
      setDragging(false);
      setDragY(0);

      if (!wasEngaged) return;
      const past = finalDelta > SHEET_DISMISS_PX || velocity > SHEET_FLICK_VELOCITY;
      if (detentRef.current === 'full') {
        if (past) setDetent('partial');
      } else if (past) {
        setClosing(true);
        window.setTimeout(() => onCloseRef.current?.(), 260);
      }
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
  }, [open]);

  if (!open) return null;

  const heightStyle = detent === 'full' ? 'calc(100dvh - env(safe-area-inset-top) - 8px)' : partialPx != null ? `${partialPx}px` : undefined;
  const translateY = closing ? '100%' : `${Math.max(0, dragY)}px`;

  // Portalled to <body>: the screen's entry animation establishes a containing
  // block, which would otherwise trap this `fixed` overlay inside the scroll area.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="backdrop-enter absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={`sheet-enter relative flex w-full max-w-[560px] flex-col rounded-t-[14px] bg-bg shadow-2xl ${heightStyle ? '' : 'max-h-[92vh]'}`}
        style={{
          height: heightStyle,
          transform: `translateY(${translateY})`,
          transition: dragging ? 'none' : 'height 340ms var(--ease-ios), transform 340ms var(--ease-ios)',
        }}
      >
        <div ref={handleRef} className="ios-blur shrink-0 rounded-t-[14px] border-b border-separator/60 pt-2 pb-3">
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
