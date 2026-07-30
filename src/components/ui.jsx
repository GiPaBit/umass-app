import { useEffect, useRef, useState } from 'react';
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

/** Bottom sheet with a grabber, mirroring UISheetPresentationController. */
export function Sheet({ open, onClose, title, children, action }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    // Stop the page behind the sheet from scrolling.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  // Portalled to <body>: the screen's entry animation establishes a containing
  // block, which would otherwise trap this `fixed` overlay inside the scroll area.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="backdrop-enter absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="sheet-enter relative flex max-h-[92vh] w-full max-w-[560px] flex-col rounded-t-[14px] bg-bg shadow-2xl">
        <div className="ios-blur flex shrink-0 items-center justify-between rounded-t-[14px] border-b border-separator/60 px-4 pt-3 pb-3">
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
        <div className="ios-scroll no-scrollbar flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),20px)]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

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
