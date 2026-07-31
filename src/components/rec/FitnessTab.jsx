import { useState } from 'react';
import { ChevronIcon } from '../Icons.jsx';
import { Badge, EmptyState } from '../ui.jsx';
import { FaqSection, RecSections } from './FaqSection.jsx';
import { ExpandableText } from './ExpandableText.jsx';
import { shortDateLabel, todayKey } from '../../lib/dates.js';

/**
 * Weekly calendar view modeled on the real group-fitness-schedule-1 page.
 * Pagination is clamped to whatever RecWell has actually published — the site
 * itself only ever publishes a handful of weeks ahead within the current
 * semester, so bounding navigation to `weeks.length` already satisfies "don't
 * allow empty states at the boundary" without a separate semester calendar.
 */
export function FitnessTab({ data }) {
  const fitness = data.recwell.fitness;
  const weeks = fitness.weeks || [];
  const [index, setIndex] = useState(0);
  const week = weeks[index];
  const today = todayKey();

  return (
    <>
      {fitness.primer && (
        <div className="mx-4 mt-3 rounded-[12px] bg-fill px-4 py-3">
          <ExpandableText text={fitness.primer} className="text-[13px] leading-[18px] text-label-2" />
        </div>
      )}

      {weeks.length === 0 ? (
        <EmptyState title="No schedule published" message="Check back closer to the semester start." />
      ) : (
        <>
          <div className="mx-4 mt-3 flex items-center justify-between">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              aria-label="Previous week"
              className="ios-press-scale flex h-8 w-8 items-center justify-center rounded-full bg-fill text-label disabled:opacity-30"
            >
              <ChevronIcon width={16} height={16} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <div className="text-[15px] font-semibold text-label">{week?.label || 'This week'}</div>
            <button
              type="button"
              disabled={index === weeks.length - 1}
              onClick={() => setIndex((i) => Math.min(weeks.length - 1, i + 1))}
              aria-label="Next week"
              className="ios-press-scale flex h-8 w-8 items-center justify-center rounded-full bg-fill text-label disabled:opacity-30"
            >
              <ChevronIcon width={16} height={16} />
            </button>
          </div>

          {week?.days.map((day) => {
            const isToday = day.date === today;
            const isPast = day.date && day.date < today;
            return (
              <div
                key={day.day}
                className={`mx-4 mt-3 overflow-hidden rounded-[16px] bg-card ${isPast ? 'opacity-50' : ''} ${
                  isToday ? 'ring-2 ring-ios-blue' : ''
                }`}
              >
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <span className="text-[15px] font-semibold text-label">
                    {day.day}
                    {day.date && <span className="ml-1 font-normal text-label-2">· {shortDateLabel(day.date)}</span>}
                  </span>
                  {isToday && <Badge tone="blue">Today</Badge>}
                </div>
                {day.classes.length === 0 ? (
                  <p className="px-4 pb-3 text-[13px] text-label-2">No classes</p>
                ) : (
                  <div className="px-4 pb-1">
                    {day.classes.map((c, i) => (
                      <a
                        key={i}
                        href={c.registerUrl || fitness.scheduleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`ios-press flex items-center justify-between gap-3 py-2.5 ${
                          i === day.classes.length - 1 ? '' : 'ios-separator'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[15px] font-medium text-label">{c.name}</div>
                          <div className="truncate text-[13px] text-label-2">
                            {c.instructor ? `${c.instructor} · ` : ''}
                            {c.location || ''}
                          </div>
                        </div>
                        <div className="shrink-0 text-[13px] text-label-2">{c.timeText}</div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      <FaqSection title="Fitness & Group Exercise">
        <RecSections sections={fitness.sections} />
      </FaqSection>
    </>
  );
}
