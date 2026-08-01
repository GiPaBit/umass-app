import { useEffect, useRef, useState } from 'react';
import { CheckIcon, ChevronIcon } from './Icons.jsx';

/**
 * A tappable screen title that opens a small dropdown to switch between a
 * handful of top-level modes (e.g. RecWell vs Sports). No precedent for this
 * elsewhere in the app — `Screen` composes this in place of a plain `<h1>` when
 * a `titleMenu` prop is given.
 */
export function TitleMenu({ options, value, onChange, fontSize, lineHeight = 1.2 }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const active = options.find((o) => o.value === value) || options[0];

  return (
    <div ref={rootRef} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="ios-press-scale -m-1 flex items-center gap-1 p-1"
      >
        <h1
          className="font-display truncate font-bold text-label"
          style={{ fontSize: `${fontSize}px`, lineHeight }}
        >
          {active?.label}
        </h1>
        <ChevronIcon
          width={16}
          height={16}
          className="mt-[2px] shrink-0 text-label-3 transition-transform duration-200"
          style={{ transform: open ? 'rotate(-90deg)' : 'rotate(90deg)', transitionTimingFunction: 'var(--ease-ios)' }}
        />
      </button>

      {open && (
        <div className="fade-up absolute left-0 top-full z-30 mt-1 min-w-[180px] overflow-hidden rounded-[14px] bg-bg-elevated py-1 shadow-lg ring-1 ring-black/5">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="ios-press flex w-full items-center justify-between gap-6 px-4 py-2.5 text-left"
            >
              <span className={`text-[16px] ${o.value === value ? 'font-semibold text-ios-blue' : 'text-label'}`}>
                {o.label}
              </span>
              {o.value === value && <CheckIcon width={16} height={16} className="text-ios-blue" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
