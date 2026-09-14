import { ChevronIcon } from '../Icons.jsx';
import { ListGroup, Row, SectionHeader, StatusPill } from '../ui.jsx';
import { useLocalState } from '../../hooks/useLocalState.js';
import { KEYS } from '../../lib/storage.js';

/** Mostly unchanged from before — day-collapsed hours (server-side) + notices moved to the bottom, date-filtered. */
export function HoursTab({ data }) {
  const facilities = data.recwell.hours.facilities;
  const notices = data.recwell.notices;
  const alert = data.recwell.hours.alert;
  const hoursUrl = data.recwell.hours.url;

  // Collapsing remembers the *specific* alert (by heading) rather than just
  // "collapsed" — once the live banner's text changes (a new schedule window),
  // it reads as new information and reopens on its own.
  const [collapsedHeading, setCollapsedHeading] = useLocalState(KEYS.recAlertCollapsed, null);
  const collapsed = Boolean(alert) && collapsedHeading === alert.heading;

  return (
    <>
      {alert && (
        <div className="mx-4 mt-3 mb-1 rounded-[12px] bg-ios-orange/12 px-4 py-3">
          <button
            type="button"
            onClick={() => setCollapsedHeading(collapsed ? null : alert.heading)}
            aria-expanded={!collapsed}
            className="ios-press flex w-full items-center justify-between gap-2 text-left"
          >
            <div className="text-[13px] font-semibold text-ios-orange">{alert.heading}</div>
            <ChevronIcon
              width={14}
              height={14}
              strokeWidth={2.8}
              className="shrink-0 text-ios-orange transition-transform duration-200"
              style={{ transform: collapsed ? 'rotate(90deg)' : 'rotate(-90deg)' }}
            />
          </button>
          {!collapsed && (
            <>
              {alert.lines.map((line, i) => (
                <p key={i} className="mt-1 text-[13px] leading-[17px] text-label-2">
                  {line}
                </p>
              ))}
              <a
                href={hoursUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-[13px] font-medium text-ios-blue"
              >
                Hours may vary — check the official page →
              </a>
            </>
          )}
        </div>
      )}

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
