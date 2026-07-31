import { ListGroup, Row, SectionHeader, StatusPill } from '../ui.jsx';

/** Mostly unchanged from before — day-collapsed hours (server-side) + notices moved to the bottom, date-filtered. */
export function HoursTab({ data }) {
  const facilities = data.recwell.hours.facilities;
  const notices = data.recwell.notices;

  return (
    <>
      <SectionHeader>Today</SectionHeader>
      <ListGroup>
        {facilities.map((f, i) => (
          <Row key={f.name} last={i === facilities.length - 1} trailing={<StatusPill state={f.status.state} />}>
            <div className="text-[17px] leading-[22px] text-label">{f.name}</div>
            <div className="mt-0.5 text-[13px] leading-[17px] text-label-2">
              {f.today?.hoursText || f.note || 'Hours unavailable'}
            </div>
          </Row>
        ))}
      </ListGroup>

      <SectionHeader>Full Week</SectionHeader>
      {facilities
        .filter((f) => f.schedule.length > 0)
        .map((f) => (
          <div key={f.name} className="mx-4 mb-3 overflow-hidden rounded-[16px] bg-card">
            <div className="px-4 pt-3 pb-1 text-[15px] font-semibold text-label">{f.name}</div>
            <div className="px-4 pb-3">
              {f.schedule.map((entry, i) => (
                <div key={i} className="flex justify-between gap-3 py-[3px]">
                  <span className="text-[14px] text-label-2">{entry.dayLabel}</span>
                  <span className="text-right text-[14px] text-label">{entry.timeText}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

      {notices.length > 0 && (
        <div className="mx-4 mt-3 mb-1 rounded-[12px] bg-ios-orange/12 px-4 py-3">
          <div className="text-[13px] font-semibold text-ios-orange">Notices</div>
          {notices.map((n, i) => (
            <p key={i} className="mt-1 text-[13px] leading-[17px] text-label-2">
              {n.text}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
