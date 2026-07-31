import { CollapsibleCard } from '../ui.jsx';

/**
 * The "FAQ / More Info" pattern used at the bottom of every Rec & Sports tab —
 * a thin wrapper around `CollapsibleCard` (already existed in ui.jsx, unused
 * anywhere until now). Collapsed by default so it reads as supplementary, not
 * the main event.
 */
export function FaqSection({ title = 'FAQ & More Info', children }) {
  return (
    <CollapsibleCard title={title} defaultOpen={false}>
      <div className="space-y-4 px-4 py-4">{children}</div>
    </CollapsibleCard>
  );
}

/** Renders RecWell's own scraped headings/prose/links — the long-form copy migrated out of the main tab view. */
export function RecSections({ sections }) {
  const meaningful = (sections || []).filter((s) => s.lines.length > 0);
  if (!meaningful.length) {
    return <p className="text-[14px] text-label-2">Nothing published here right now.</p>;
  }

  return (
    <>
      {meaningful.map((section, i) => (
        <div key={`${section.heading}-${i}`}>
          <div className="text-[15px] font-semibold text-label">{section.heading}</div>
          {section.lines.slice(0, 8).map((line, j) => (
            <p key={j} className="mt-1 text-[14px] leading-[19px] text-label-2">
              {line}
            </p>
          ))}
          {section.links?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {section.links.slice(0, 4).map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ios-press-scale rounded-[8px] bg-fill px-3 py-[6px] text-[13px] font-medium text-ios-blue"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
