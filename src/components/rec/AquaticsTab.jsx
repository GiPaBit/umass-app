import { EmptyState, StatusPill } from '../ui.jsx';
import { FaqSection, RecSections } from './FaqSection.jsx';
import { MapThumbnail } from './MapThumbnail.jsx';

export function AquaticsTab({ data }) {
  const aquatics = data.recwell.aquatics;
  const pools = aquatics.pools || [];

  return (
    <>
      {pools.length === 0 && (
        <EmptyState title="No pool data" message="Couldn’t load pool hours right now." />
      )}

      {pools.map((pool) => (
        <div key={pool.name} className="mx-4 mt-3 overflow-hidden rounded-[16px] bg-card">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="text-[17px] font-semibold text-label">{pool.name}</div>
            <StatusPill state={pool.hours.status.state} />
          </div>
          <div className="px-4 pb-3">
            {pool.hours.schedule.map((entry, i) => (
              <div key={i} className="flex justify-between gap-3 py-[3px]">
                <span className="text-[14px] text-label-2">{entry.dayLabel}</span>
                <span className="text-right text-[14px] text-label">{entry.timeText}</span>
              </div>
            ))}
          </div>

          {pool.notices.length > 0 && (
            <div className="border-t border-separator/50 px-4 py-3">
              <div className="text-[12px] font-semibold text-ios-orange">Notices</div>
              {pool.notices.map((n, i) => (
                <p key={i} className="mt-1 text-[13px] leading-[17px] text-label-2">
                  {n.text}
                </p>
              ))}
            </div>
          )}

          <div className="border-t border-separator/50 px-4 py-3">
            <div className="text-[12px] font-semibold text-label-2">Programming</div>
            {pool.events.length === 0 ? (
              <p className="mt-1 text-[13px] text-label-2">
                Nothing published for this pool specifically — see the schedules page.
              </p>
            ) : (
              pool.events.map((e, i) => (
                <p key={i} className="mt-1 text-[13px] text-label">
                  {e.title}
                </p>
              ))
            )}
          </div>
        </div>
      ))}

      {pools.map((pool) => (
        <MapThumbnail key={`map-${pool.name}`} label={pool.name} query={pool.mapQuery} />
      ))}

      <FaqSection title="Aquatics & Swim Programs">
        <RecSections sections={aquatics.sections} />
      </FaqSection>
    </>
  );
}
