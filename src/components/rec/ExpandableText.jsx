import { useState } from 'react';

const TRUNCATE_AT = 220;

/** A blurb that starts clipped and expands in place on tap — no separate sheet/modal. */
export function ExpandableText({ text, className = 'text-[14px] leading-[19px] text-label-2' }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;

  const long = text.length > TRUNCATE_AT;
  if (!long) return <p className={className}>{text}</p>;

  return (
    <button type="button" onClick={() => setOpen((v) => !v)} className={`ios-press block w-full text-left ${className}`}>
      {open ? text : `${text.slice(0, TRUNCATE_AT).trim()}…`}{' '}
      <span className="font-medium text-ios-blue">{open ? 'Show less' : 'More'}</span>
    </button>
  );
}
