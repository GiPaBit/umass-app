import { useEffect, useMemo, useRef, useState } from 'react';
import { Screen } from '../components/Screen.jsx';
import {
  Badge,
  Button,
  CheckCircle,
  EmptyState,
  ErrorState,
  ListGroup,
  LoadingState,
  SectionHeader,
  SegmentedControl,
  Sheet,
} from '../components/ui.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useLocalState } from '../hooks/useLocalState.js';
import { KEYS } from '../lib/storage.js';
import { activeSource, fetchAssignments, SOURCE, titleWithoutCourse } from '../lib/assignments.js';
import {
  dateKey,
  dayLabel,
  dayLabelFromKey,
  groupByDay,
  relativeLabel,
  timeLabel,
  todayKey,
} from '../lib/dates.js';

/** Build a date key straight from calendar numbers — never via a local Date. */
const makeKey = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const VIEWS = [
  { value: 'list', label: 'List' },
  { value: 'calendar', label: 'Calendar' },
];

export function AssignmentsScreen({ onOpenSettings }) {
  const [calendarIds] = useLocalState(KEYS.canvasCalendars, []);
  const [feeds] = useLocalState(KEYS.feeds, []);
  const [done, setDone] = useLocalState(KEYS.doneAssignments, {});
  const [view, setView] = useState('list');
  const [detail, setDetail] = useState(null);
  const [showDone, setShowDone] = useState(false);

  // Re-resolve whenever either source's settings change.
  const source = activeSource();

  const { data, error, loading, refresh } = useAsync(
    fetchAssignments,
    [source, JSON.stringify(feeds), calendarIds.join(',')],
    { enabled: source !== SOURCE.none },
  );

  const assignments = data || [];
  const pending = useMemo(() => assignments.filter((a) => !done[a.id]), [assignments, done]);
  const completed = useMemo(() => assignments.filter((a) => done[a.id]), [assignments, done]);

  // Rows that were just ticked stay on screen long enough for the rule to sweep
  // across them — otherwise they vanish the instant they are marked done and the
  // animation is never seen.
  const [exiting, setExiting] = useState(() => new Set());
  const exitTimers = useRef(new Map());

  useEffect(
    () => () => {
      for (const t of exitTimers.current.values()) clearTimeout(t);
    },
    [],
  );

  const visible = useMemo(
    () => (showDone ? completed : assignments.filter((a) => !done[a.id] || exiting.has(a.id))),
    [showDone, completed, assignments, done, exiting],
  );

  const days = useMemo(() => groupByDay(visible, (a) => a.due), [visible]);

  const toggle = (id) => {
    const markingDone = !done[id];

    setDone((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = new Date().toISOString();
      return next;
    });

    if (markingDone) {
      setExiting((prev) => new Set(prev).add(id));
      clearTimeout(exitTimers.current.get(id));
      exitTimers.current.set(
        id,
        // Slightly longer than the 420ms strike so the line finishes first.
        setTimeout(() => {
          setExiting((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          exitTimers.current.delete(id);
        }, 900),
      );
    } else {
      // Un-ticking should put it straight back in the open list.
      clearTimeout(exitTimers.current.get(id));
      exitTimers.current.delete(id);
      setExiting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (source === SOURCE.none) {
    return (
      <Screen title="Assignments">
        <EmptyState
          title="Connect Canvas"
          message="Paste your Canvas calendar feed link in Settings — it comes from Canvas → Calendar → “Calendar Feed”. No Google account needed."
          action={<Button onClick={onOpenSettings}>Open Settings</Button>}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Assignments"
      subtitle={`${pending.length} open${completed.length ? ` · ${completed.length} done` : ''}`}
      onRefresh={refresh}
    >
      <div className="px-4 pt-1 pb-1">
        <SegmentedControl options={VIEWS} value={view} onChange={setView} />
      </div>

      {loading && !data && <LoadingState label="Loading from Google Calendar…" />}
      {error && <ErrorState error={error} what="assignments" onRetry={refresh} />}

      {data && view === 'calendar' && (
        <MonthView assignments={pending} done={done} onSelect={setDetail} />
      )}

      {data && view === 'list' && (
        <>
          {days.length === 0 && (
            <EmptyState
              title={showDone ? 'Nothing checked off yet' : 'All caught up'}
              message={
                showDone
                  ? 'Assignments you check off appear here.'
                  : 'No assignments due in the next 60 days.'
              }
            />
          )}

          {days.map((day) => (
            <div key={day.key}>
              <SectionHeader>{day.label}</SectionHeader>
              <ListGroup>
                {day.items.map((a, i) => (
                  <AssignmentRow
                    key={a.id}
                    assignment={a}
                    checked={Boolean(done[a.id])}
                    onToggle={() => toggle(a.id)}
                    onOpen={() => setDetail(a)}
                    last={i === day.items.length - 1}
                  />
                ))}
              </ListGroup>
            </div>
          ))}

          {completed.length > 0 && (
            <div className="px-4 pt-6">
              <Button variant="gray" className="w-full" onClick={() => setShowDone((v) => !v)}>
                {showDone ? `Show open (${pending.length})` : `Show completed (${completed.length})`}
              </Button>
            </div>
          )}

          <p className="px-5 pt-5 pb-2 text-[12px] leading-[16px] text-label-3">
            Checking something off is tracked only in this app — it does not change Canvas.
          </p>
        </>
      )}

      <AssignmentDetailSheet
        assignment={detail}
        checked={detail ? Boolean(done[detail.id]) : false}
        onToggle={() => detail && toggle(detail.id)}
        onClose={() => setDetail(null)}
      />
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */

function AssignmentDetailSheet({ assignment, checked, onToggle, onClose }) {
  if (!assignment) return null;
  const overdue = !checked && assignment.due && new Date(assignment.due) < new Date();

  return (
    <Sheet open onClose={onClose} title={assignment.course || 'Assignment'}>
      <div className="px-4 pt-4">
        <h2 className="text-[22px] leading-[28px] font-bold text-label">
          {titleWithoutCourse(assignment.title)}
        </h2>

        {assignment.due && (
          <p className={`mt-1.5 text-[15px] ${overdue ? 'text-ios-red' : 'text-label-2'}`}>
            Due {dayLabel(assignment.due)}
            {!assignment.allDay && ` at ${timeLabel(assignment.due)}`} · {relativeLabel(assignment.due)}
          </p>
        )}

        {assignment.location && <p className="mt-1 text-[15px] text-label-2">{assignment.location}</p>}

        {assignment.description && (
          <p className="mt-4 text-[15px] leading-[21px] whitespace-pre-wrap text-label">
            {assignment.description}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2 pb-6">
          <Button variant={checked ? 'gray' : 'filled'} onClick={onToggle}>
            {checked ? 'Mark as not done' : 'Mark as done'}
          </Button>
          {(assignment.sourceUrl || assignment.url) && (
            <a
              href={assignment.sourceUrl || assignment.url}
              target="_blank"
              rel="noreferrer"
              className="ios-press-scale rounded-[12px] bg-fill px-4 py-[11px] text-center text-[17px] font-medium text-ios-blue"
            >
              Open in Canvas
            </a>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */

function AssignmentRow({ assignment, checked, onToggle, onOpen, last }) {
  const overdue = !checked && assignment.due && new Date(assignment.due) < new Date();

  // `struck` mirrors `checked` one commit late. A row that mounts already done
  // starts struck (no replay); ticking one flips it *after* paint, so the CSS
  // transition has a rendered 0%-width rule to animate from.
  const [struck, setStruck] = useState(checked);

  useEffect(() => {
    setStruck(checked);
  }, [checked]);

  return (
    <div
      style={{ '--sep-inset': '52px' }}
      className={`relative flex items-start gap-3 px-4 py-[11px] ${last ? '' : 'ios-separator'}`}
    >
      <div className="pt-[2px]">
        <CheckCircle checked={checked} onChange={onToggle} />
      </div>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div
          className={`strike-fade text-[16px] leading-[21px] ${
            struck ? 'text-label-3' : 'text-label'
          }`}
        >
          <span className={`strike ${struck ? 'strike-on' : ''}`}>
            {titleWithoutCourse(assignment.title)}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {assignment.course && <Badge tone="blue">{assignment.course}</Badge>}
          {!assignment.allDay && assignment.due && (
            <span className="text-[12px] text-label-2">{timeLabel(assignment.due)}</span>
          )}
          {assignment.due && (
            <span className={`text-[12px] ${overdue ? 'text-ios-red' : 'text-label-2'}`}>
              {relativeLabel(assignment.due)}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/** Month grid with a dot on any day that has an assignment due. */
function MonthView({ assignments, done, onSelect }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const byDate = useMemo(() => {
    const map = new Map();
    for (const a of assignments) {
      if (!a.due) continue;
      const key = dateKey(a.due);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    }
    return map;
  }, [assignments]);

  const [selected, setSelected] = useState(todayKey);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Cells are day numbers, not Dates, so the grid never depends on device timezone.
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const shift = (delta) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  const selectedItems = byDate.get(selected) || [];

  return (
    <>
      <div className="mx-4 mt-3 rounded-[16px] bg-card p-3">
        <div className="flex items-center justify-between px-1 pb-2">
          <button type="button" onClick={() => shift(-1)} className="ios-press-scale px-3 py-1 text-[17px] text-ios-blue">
            ‹
          </button>
          <span className="text-[17px] font-semibold text-label">
            {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button type="button" onClick={() => shift(1)} className="ios-press-scale px-3 py-1 text-[17px] text-ios-blue">
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="pb-1 text-center text-[11px] font-medium text-label-2">
              {d}
            </div>
          ))}

          {cells.map((dayNum, i) => {
            if (!dayNum) return <div key={`pad-${i}`} />;
            const key = makeKey(year, month, dayNum);
            const items = byDate.get(key) || [];
            const isToday = key === todayKey();
            const isSelected = key === selected;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className="flex flex-col items-center gap-[3px] py-[5px]"
              >
                <span
                  className={`flex h-[30px] w-[30px] items-center justify-center rounded-full text-[16px] transition-colors ${
                    isSelected
                      ? 'bg-ios-blue font-semibold text-white'
                      : isToday
                        ? 'font-semibold text-ios-blue'
                        : 'text-label'
                  }`}
                >
                  {dayNum}
                </span>
                <span className="flex h-[5px] items-center gap-[2px]">
                  {items.slice(0, 3).map((a) => (
                    <span
                      key={a.id}
                      className={`h-[5px] w-[5px] rounded-full ${
                        done[a.id] ? 'bg-label-3' : 'bg-ios-blue'
                      }`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <SectionHeader>{dayLabelFromKey(selected)}</SectionHeader>
      {selectedItems.length === 0 ? (
        <p className="px-5 py-4 text-[15px] text-label-2">Nothing due.</p>
      ) : (
        <ListGroup>
          {selectedItems.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a)}
              style={{ '--sep-inset': '16px' }}
              className={`ios-press relative block w-full px-4 py-[11px] text-left ${
                i === selectedItems.length - 1 ? '' : 'ios-separator'
              }`}
            >
              <div className="text-[16px] leading-[21px] text-label">{titleWithoutCourse(a.title)}</div>
              <div className="mt-1 flex items-center gap-1.5">
                {a.course && <Badge tone="blue">{a.course}</Badge>}
                {!a.allDay && <span className="text-[12px] text-label-2">{timeLabel(a.due)}</span>}
              </div>
            </button>
          ))}
        </ListGroup>
      )}
    </>
  );
}
