import { SectionHeader } from '../ui.jsx';
import { FaqSection, RecSections } from './FaqSection.jsx';
import { ExpandableText } from './ExpandableText.jsx';

/** Climbing has no occupancy indicator by design — no live feed exists and there's no historical data to build even a static histogram from. */
export function AdventureTab({ data }) {
  const { climbing, nest } = data.recwell.adventure;

  return (
    <>
      <SectionHeader>RockWell Climbing Gym</SectionHeader>
      <div className="mx-4 overflow-hidden rounded-[16px] bg-card p-4">
        <ExpandableText text={climbing.overview} />
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={climbing.orientationUrl}
            target="_blank"
            rel="noreferrer"
            className="ios-press-scale rounded-[10px] bg-ios-blue px-4 py-[9px] text-[14px] font-medium text-white"
          >
            Register for orientation
          </a>
        </div>
        <p className="mt-3 text-[12px] leading-[16px] text-label-3">
          First time? Orientation is required before you can climb — book it above.
        </p>

        <div className="mt-3 border-t border-separator/50 pt-3">
          <div className="text-[12px] font-semibold text-label-2">Upcoming Events</div>
          {(climbing.events || []).length === 0 ? (
            <p className="mt-1 text-[13px] text-label-2">Nothing scheduled yet — stay tuned!</p>
          ) : (
            climbing.events.map((e) => (
              <a
                key={e.name}
                href={e.url}
                target="_blank"
                rel="noreferrer"
                className="ios-press mt-1 flex items-center justify-between gap-3 py-1.5"
              >
                <span className="text-[14px] font-medium text-ios-blue">{e.name}</span>
                <span className="text-[12px] text-label-2">{e.when || 'Stay tuned!'}</span>
              </a>
            ))
          )}
        </div>
      </div>

      <SectionHeader>NEST Challenge Course</SectionHeader>
      <div className="mx-4 overflow-hidden rounded-[16px] bg-card p-4">
        <ExpandableText text={nest.overview} />
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={nest.bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="ios-press-scale rounded-[10px] bg-ios-blue px-4 py-[9px] text-[14px] font-medium text-white"
          >
            Book SkyPark
          </a>
          <a
            href={nest.requestFormUrl}
            target="_blank"
            rel="noreferrer"
            className="ios-press-scale rounded-[10px] bg-fill px-4 py-[9px] text-[14px] font-medium text-ios-blue"
          >
            Request a group program
          </a>
        </div>
        <p className="mt-3 text-[12px] leading-[16px] text-label-3">
          Group programs (Break the Ice, Building the NEST, and similar) go through a
          request form rather than a live slot picker — no session-capacity data is
          published anywhere this app can read.
        </p>
      </div>

      <FaqSection title="Climbing & NEST — More Info">
        <RecSections sections={[...(climbing.sections || []), ...(nest.sections || [])]} />
      </FaqSection>
    </>
  );
}
