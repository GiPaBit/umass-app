import { useMemo, useState } from 'react';
import { Screen } from '../components/Screen.jsx';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  FailureNotice,
  ListGroup,
  LoadingState,
  RoundButton,
  SectionHeader,
  SegmentedControl,
  Sheet,
  StaleNotice,
} from '../components/ui.jsx';
import { PlusIcon } from '../components/Icons.jsx';
import { getEvents } from '../lib/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { useLocalState } from '../hooks/useLocalState.js';
import { KEYS } from '../lib/storage.js';
import { groupByDay, timeLabel } from '../lib/dates.js';
import { QuickAddSheet } from './QuickAddSheet.jsx';
import { deleteQuickEvent } from '../lib/quickEvents.js';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'localist', label: 'Campus' },
  { value: 'athletics', label: 'Sports' },
  { value: 'quick', label: 'Mine' },
];

export function EventsScreen() {
  const { data, error, loading, refresh } = useAsync(() => getEvents(21));
  const [quickEvents] = useLocalState(KEYS.quickEvents, []);
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);

  // Official events come from the network; mine come from localStorage. Same shape,
  // so they merge into one chronological feed.
  const merged = useMemo(() => {
    const official = data?.events || [];
    const all = [...official, ...quickEvents].filter((e) => e.start);
    return all.sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [data, quickEvents]);

  const filtered = useMemo(
    () => (filter === 'all' ? merged : merged.filter((e) => e.source === filter)),
    [merged, filter],
  );

  const days = useMemo(() => groupByDay(filtered, (e) => e.start), [filtered]);

  return (
    <Screen
      title="Events"
      subtitle={data || quickEvents.length ? `${filtered.length} upcoming` : undefined}
      onRefresh={refresh}
      trailing={
        <RoundButton onClick={() => setAdding(true)} label="Quick add an event">
          <PlusIcon />
        </RoundButton>
      }
    >
      <div className="px-4 pt-1 pb-1">
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {loading && !data && <LoadingState label="Loading events…" />}
      {error && !data && quickEvents.length === 0 && (
        <ErrorState error={error} what="events" onRetry={refresh} />
      )}

      <StaleNotice data={data} />
      {data && <FailureNotice failures={data.failures} />}

      {days.length === 0 && !loading && (
        <EmptyState
          title="Nothing coming up"
          message={
            filter === 'quick'
              ? 'Tap + to paste in a flyer or party you saw and it will show up here.'
              : 'No events in the next three weeks from this source.'
          }
          action={filter === 'quick' ? <Button onClick={() => setAdding(true)}>Quick Add</Button> : null}
        />
      )}

      {days.map((day) => (
        <div key={day.key}>
          <SectionHeader>{day.label}</SectionHeader>
          <ListGroup>
            {day.items.map((event, i) => (
              <EventRow
                key={event.id}
                event={event}
                last={i === day.items.length - 1}
                onClick={() => setDetail(event)}
              />
            ))}
          </ListGroup>
        </div>
      ))}

      {data?.sources && (
        <p className="px-5 pt-5 pb-2 text-[12px] leading-[16px] text-label-3">
          Official events from {data.sources.map((s) => s.label).join(' and ')}. Your own additions stay on
          this device.
        </p>
      )}

      <QuickAddSheet
        open={adding || Boolean(editing)}
        existing={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />

      <EventDetailSheet
        event={detail}
        onClose={() => setDetail(null)}
        onEdit={(e) => {
          setDetail(null);
          setEditing(e);
        }}
        onDelete={(e) => {
          deleteQuickEvent(e.id);
          setDetail(null);
        }}
      />
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */

function EventRow({ event, last, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ '--sep-inset': '16px' }}
      className={`ios-press relative flex w-full items-start gap-3 px-4 py-[11px] text-left ${
        last ? '' : 'ios-separator'
      }`}
    >
      <div className="w-[62px] shrink-0 pt-[1px]">
        <div className="text-[15px] font-semibold text-label">
          {event.allDay ? 'All day' : timeLabel(event.start)}
        </div>
      </div>

      <EventThumb src={event.imageUrl} />

      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-[16px] leading-[21px] text-label">{event.title}</div>
        {event.location && (
          <div className="mt-0.5 truncate text-[13px] leading-[17px] text-label-2">{event.location}</div>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge tone={sourceTone(event.source)}>{event.sourceLabel}</Badge>
          {event.category && event.category !== event.sourceLabel && (
            <Badge>{event.category}</Badge>
          )}
          {event.free && <Badge tone="green">Free</Badge>}
        </div>
      </div>
    </button>
  );
}

function sourceTone(source) {
  return { localist: 'blue', athletics: 'red', quick: 'purple' }[source] || 'gray';
}

/**
 * Event art is hotlinked from the source site, so it may 404 or be blocked.
 * Collapse the thumbnail entirely rather than leaving an empty grey square.
 */
function EventThumb({ src }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-[44px] w-[44px] shrink-0 rounded-[8px] bg-fill object-cover"
    />
  );
}

/* -------------------------------------------------------------------------- */

function EventDetailSheet({ event, onClose, onEdit, onDelete }) {
  if (!event) return null;

  return (
    <Sheet open onClose={onClose} title={event.sourceLabel}>
      {event.imageUrl && (
        <img
          src={event.imageUrl}
          alt=""
          onError={(e) => {
            e.currentTarget.hidden = true;
          }}
          className="max-h-[260px] w-full bg-fill object-cover"
        />
      )}

      <div className="px-4 pt-4">
        <h2 className="text-[22px] leading-[28px] font-bold text-label">{event.title}</h2>
        <p className="mt-1.5 text-[15px] text-label-2">
          {new Date(event.start).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
          {!event.allDay && ` · ${timeLabel(event.start)}`}
          {event.end && !event.allDay && ` – ${timeLabel(event.end)}`}
        </p>
        {event.location && <p className="mt-1 text-[15px] text-label-2">{event.location}</p>}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.categories?.filter(Boolean).map((c) => (
            <Badge key={c}>{c}</Badge>
          ))}
          {event.free && <Badge tone="green">Free</Badge>}
          {event.ticketCost && <Badge tone="orange">{event.ticketCost}</Badge>}
        </div>

        {event.description && (
          <p className="mt-4 text-[15px] leading-[21px] whitespace-pre-wrap text-label">
            {event.description}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2 pb-6">
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noreferrer"
              className="ios-press-scale rounded-[12px] bg-ios-blue px-4 py-[11px] text-center text-[17px] font-medium text-white"
            >
              Open original
            </a>
          )}
          {event.ticketUrl && (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noreferrer"
              className="ios-press-scale rounded-[12px] bg-fill px-4 py-[11px] text-center text-[17px] font-medium text-ios-blue"
            >
              Tickets / registration
            </a>
          )}
          {event.isUserAdded && (
            <>
              <Button variant="gray" onClick={() => onEdit(event)}>
                Edit
              </Button>
              <Button variant="destructive" onClick={() => onDelete(event)}>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
}
