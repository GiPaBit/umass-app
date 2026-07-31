import { Badge, EmptyState, ListGroup, Row, SectionHeader } from '../ui.jsx';
import { FaqSection } from './FaqSection.jsx';

/** Alphabetical directory — the Engage API's categories are all just "Club Sport Organization", so there's no real category to group by. */
export function ClubSportsTab({ data }) {
  const clubSports = data.sports.clubSports;
  const clubs = clubSports.clubs || [];

  return (
    <>
      {clubs.length === 0 ? (
        <EmptyState
          title="Directory unavailable"
          message="Couldn’t load the club sports directory right now."
          action={
            <a
              href={clubSports.url}
              target="_blank"
              rel="noreferrer"
              className="ios-press-scale inline-block rounded-[10px] bg-ios-blue px-4 py-[9px] text-[14px] font-medium text-white"
            >
              Open Club Sport Council page
            </a>
          }
        />
      ) : (
        <>
          <SectionHeader>{`All Clubs (${clubs.length})`}</SectionHeader>
          <ListGroup>
            {clubs.map((c, i) => (
              <Row
                key={c.name}
                last={i === clubs.length - 1}
                href={c.link}
                trailing={<Badge tone={c.linkTier === 'signup' ? 'green' : 'blue'}>{c.linkTier === 'signup' ? 'Signup' : 'Info'}</Badge>}
              >
                <div className="text-[17px] leading-[22px] text-label">{c.name}</div>
              </Row>
            ))}
          </ListGroup>
        </>
      )}

      <FaqSection title="Club Sports — More Info">
        <p className="text-[14px] leading-[19px] text-label-2">
          This directory is sourced from UMass Campus Pulse (Engage) — an unofficial
          endpoint, so it can occasionally be out of date or briefly unavailable. Each
          club links to the single most useful thing available: an external signup or
          tryout link if the club listed one in its description, otherwise its official
          Engage organization page.
        </p>
      </FaqSection>
    </>
  );
}
