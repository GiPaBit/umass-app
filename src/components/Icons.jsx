/**
 * SF-Symbols-flavoured icons drawn as strokes so they read correctly at tab-bar
 * size in both weights. `filled` renders the selected (solid) variant iOS uses.
 */

const base = {
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function TodayIcon({ filled, ...p }) {
  return (
    <svg {...base} {...p}>
      <path
        d="M12 3.2 20.5 9v10.3a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 19.3V9L12 3.2Z"
        fill={filled ? 'currentColor' : 'none'}
      />
      <path d="M9.5 20.8v-6.3h5v6.3" stroke={filled ? 'var(--c-chrome)' : 'currentColor'} />
    </svg>
  );
}

export function AssignmentsIcon({ filled, ...p }) {
  return (
    <svg {...base} {...p}>
      <rect x="4" y="3.2" width="16" height="17.6" rx="3" fill={filled ? 'currentColor' : 'none'} />
      <path d="m8.4 11.6 2.3 2.3 4.6-4.6" stroke={filled ? 'var(--c-chrome)' : 'currentColor'} />
    </svg>
  );
}

export function DiningIcon({ filled, ...p }) {
  return (
    <svg {...base} {...p}>
      <path
        d="M6.5 3.2v7a2.4 2.4 0 0 0 2.4 2.4h.1v8.2"
        fill="none"
        strokeWidth={filled ? 2.4 : 1.7}
      />
      <path d="M6.5 3.2v5.4M9 3.2v5.4" strokeWidth={filled ? 2.4 : 1.7} />
      <path
        d="M17 3.2c-1.7 1.3-2.6 3.4-2.6 5.8 0 1.9.9 3.2 2.6 3.4v8.4"
        strokeWidth={filled ? 2.4 : 1.7}
      />
    </svg>
  );
}

export function RecIcon({ filled, ...p }) {
  return (
    <svg {...base} {...p}>
      <path d="M4.2 9.2v5.6M7 7.4v9.2M17 7.4v9.2M19.8 9.2v5.6" strokeWidth={filled ? 2.6 : 1.8} />
      <path d="M7 12h10" strokeWidth={filled ? 2.6 : 1.8} />
    </svg>
  );
}

export function EventsIcon({ filled, ...p }) {
  return (
    <svg {...base} {...p}>
      <rect x="3.4" y="5" width="17.2" height="15.6" rx="3" fill={filled ? 'currentColor' : 'none'} />
      <path d="M3.4 9.8h17.2" stroke={filled ? 'var(--c-chrome)' : 'currentColor'} />
      <path d="M8 3.4v3.2M16 3.4v3.2" />
      {filled && <circle cx="8.4" cy="14" r="1.35" fill="var(--c-chrome)" stroke="none" />}
    </svg>
  );
}

export function GearIcon(p) {
  return (
    <svg {...base} width={22} height={22} {...p}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H2.5a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V2.5a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

export function ChevronIcon(p) {
  return (
    <svg {...base} width={18} height={18} strokeWidth={2.4} {...p}>
      <path d="m9.5 5.5 6.2 6.5-6.2 6.5" />
    </svg>
  );
}

export function PlusIcon(p) {
  return (
    <svg {...base} width={22} height={22} strokeWidth={2.2} {...p}>
      <path d="M12 5.2v13.6M5.2 12h13.6" />
    </svg>
  );
}

export function CloseIcon(p) {
  return (
    <svg {...base} width={20} height={20} strokeWidth={2.2} {...p}>
      <path d="M6.2 6.2l11.6 11.6M17.8 6.2 6.2 17.8" />
    </svg>
  );
}

export function CheckIcon(p) {
  return (
    <svg {...base} width={20} height={20} strokeWidth={2.6} {...p}>
      <path d="m5 12.5 4.6 4.5L19 6.6" />
    </svg>
  );
}

export function RefreshIcon(p) {
  return (
    <svg {...base} width={20} height={20} {...p}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4.2V10h-5.8" />
    </svg>
  );
}

export function ExternalIcon(p) {
  return (
    <svg {...base} width={16} height={16} strokeWidth={2} {...p}>
      <path d="M14 4h6v6M20 4l-8.4 8.4" />
      <path d="M18 14.5v4a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </svg>
  );
}

export function SearchIcon(p) {
  return (
    <svg {...base} width={18} height={18} strokeWidth={2.2} {...p}>
      <circle cx="10.8" cy="10.8" r="6.4" />
      <path d="m15.6 15.6 4 4" />
    </svg>
  );
}
