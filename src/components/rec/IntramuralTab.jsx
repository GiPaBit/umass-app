import { Badge, ListGroup, Row, SectionHeader } from '../ui.jsx';
import { relativeDayLabel } from '../../lib/dates.js';
import { FaqSection, RecSections } from './FaqSection.jsx';

export function IntramuralTab({ data }) {
  const intramural = data.sports.intramural;
  const sports = intramural.sports || [];
  const now = Date.now();

  const open = sports
    .filter((s) => !s.closesAt || new Date(s.closesAt).getTime() >= now)
    .sort((a, b) => new Date(a.closesAt || 0) - new Date(b.closesAt || 0));
  const closed = sports
    .filter((s) => s.closesAt && new Date(s.closesAt).getTime() < now)
    .sort((a, b) => new Date(b.closesAt) - new Date(a.closesAt));

  return (
    <>
      <div className="mx-4 mt-3 overflow-hidden rounded-[16px] bg-card p-4">
        {intramural.overview && <p className="text-[14px] leading-[19px] text-label-2">{intramural.overview}</p>}
        {intramural.registrationNote && (
          <p className="mt-2 text-[13px] leading-[18px] text-label-2">{intramural.registrationNote}</p>
        )}
      </div>

      {open.length > 0 && (
        <>
          <SectionHeader>Open Registration</SectionHeader>
          <ListGroup>
            {open.map((s, i) => (
              <Row
                key={s.name}
                last={i === open.length - 1}
                trailing={<Badge tone={isUrgent(s.closesAt) ? 'orange' : 'blue'}>{relativeDayLabel(s.closesAt)}</Badge>}
              >
                <div className="text-[17px] leading-[22px] text-label">{s.name}</div>
              </Row>
            ))}
          </ListGroup>
        </>
      )}

      {closed.length > 0 && (
        <>
          <SectionHeader>Registration Closed</SectionHeader>
          <ListGroup className="opacity-50">
            {closed.map((s, i) => (
              <Row key={s.name} last={i === closed.length - 1} trailing={<Badge tone="gray">Closed</Badge>}>
                <div className="text-[17px] leading-[22px] text-label">{s.name}</div>
              </Row>
            ))}
          </ListGroup>
        </>
      )}

      <FaqSection title="Intramurals — Rules & FAQ">
        {/* The per-sport sections are already promoted into the structured lists above. */}
        <RecSections sections={(intramural.sections || []).filter((s) => !sports.some((sp) => sp.name === s.heading))} />
      </FaqSection>
    </>
  );
}

function isUrgent(closesAt) {
  if (!closesAt) return false;
  const days = (new Date(closesAt).getTime() - Date.now()) / 86400000;
  return days <= 3;
}
