import { useEffect, useMemo, useState } from 'react';
import { Screen } from '../components/Screen.jsx';
import {
  Badge,
  EmptyState,
  ErrorState,
  FailureNotice,
  ListGroup,
  LoadingState,
  Row,
  SectionHeader,
  SegmentedControl,
  Sheet,
  StaleNotice,
  StatusPill,
} from '../components/ui.jsx';
import { CloseIcon } from '../components/Icons.jsx';
import { getDiningOverview, getHallMenu } from '../lib/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { CampusMap } from '../components/CampusMap.jsx';
import { ALL_VENUES, mapLinks, normalise } from '../lib/diningCatalog.js';

export function DiningScreen({ active = true, onMapModeChange }) {
  const { data, error, loading, refresh } = useAsync(getDiningOverview);
  const [view, setView] = useState('list');
  const [selectedPin, setSelectedPin] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  useEffect(() => {
    onMapModeChange?.(view === 'map');
  }, [view, onMapModeChange]);

  // Leaving the Dining tab (or the map sub-view) should never leave a pin
  // selected for next time you come back.
  useEffect(() => {
    if (!active) setSelectedPin(null);
  }, [active]);

  const changeView = (next) => {
    if (next !== 'map') setSelectedPin(null);
    setView(next);
  };

  /** Every live hall/venue, indexed by normalised name, so catalogue venues can be matched to live data either way. */
  const liveIndex = useMemo(() => {
    const map = new Map();
    if (!data) return map;
    for (const h of data.halls) map.set(normalise(h.name), { type: 'hall', hall: h });
    for (const c of data.categories) {
      for (const v of c.venues) map.set(normalise(v.name), { type: 'retail', venue: v });
    }
    return map;
  }, [data]);

  const lookupLive = (name) => {
    const key = normalise(name);
    if (liveIndex.has(key)) return liveIndex.get(key);
    for (const [k, hit] of liveIndex) {
      if (k.includes(key) || key.includes(k)) return hit;
    }
    return null;
  };

  const statusOf = (name) => {
    const hit = lookupLive(name);
    if (!hit) return 'unknown';
    return (hit.type === 'hall' ? hit.hall.status : hit.venue.status)?.state || 'unknown';
  };

  const hoursOf = (name) => {
    const hit = lookupLive(name);
    if (!hit) return null;
    return hit.type === 'hall'
      ? hit.hall.status?.hoursText || null
      : hit.venue.hoursText || hit.venue.status?.hoursText || null;
  };

  /** Build a detail-sheet target for a catalogue venue name, falling back to a bare name if nothing live matched. */
  const resolveTarget = (name) => lookupLive(name) || { type: 'retail', venue: { name } };

  const openCount = useMemo(() => {
    if (!data) return 0;
    const halls = data.halls.filter((h) => h.status.state === 'open').length;
    const venues = data.categories.flatMap((c) => c.venues).filter((v) => v.status.state === 'open').length;
    return halls + venues;
  }, [data]);

  if (data && view === 'map') {
    return (
      <div className="relative h-full w-full overflow-hidden bg-bg">
        <div className="absolute inset-0">
          <CampusMap
            venues={ALL_VENUES}
            statusOf={statusOf}
            selectedPinId={selectedPin?.id}
            onSelectPin={setSelectedPin}
          />
        </div>

        <div
          className="ios-blur absolute left-4 inline-block max-w-[62%] rounded-[18px] px-4 py-2.5 shadow-sm"
          style={{ top: 'calc(env(safe-area-inset-top) + 10px)' }}
        >
          <h1 className="font-display text-[26px] leading-[30px] font-bold text-label">Dining</h1>
          {data && <p className="text-[13px] text-label-2">{openCount} open right now</p>}
        </div>

        <div
          className="ios-blur absolute left-4 w-[168px] rounded-[14px] p-1.5 shadow-sm"
          style={{ top: 'calc(env(safe-area-inset-top) + 68px)' }}
        >
          <SegmentedControl
            options={[
              { value: 'list', label: 'List' },
              { value: 'map', label: 'Map' },
            ]}
            value={view}
            onChange={changeView}
          />
        </div>

        <MapPinSheet
          pin={selectedPin}
          statusOf={statusOf}
          hoursOf={hoursOf}
          onClose={() => setSelectedPin(null)}
          onSelectVenue={(name) => setDetailTarget(resolveTarget(name))}
        />

        <VenueDetailSheet target={detailTarget} onClose={() => setDetailTarget(null)} />
      </div>
    );
  }

  return (
    <Screen
      title="Dining"
      subtitle={data ? `${openCount} open right now` : undefined}
      onRefresh={refresh}
    >
      <div className="px-4 pt-1 pb-1">
        <SegmentedControl
          options={[
            { value: 'list', label: 'List' },
            { value: 'map', label: 'Map' },
          ]}
          value={view}
          onChange={changeView}
        />
      </div>

      {loading && !data && <LoadingState label="Checking menus…" />}
      {error && !data && <ErrorState error={error} what="dining" onRetry={refresh} />}

      {data && (
        <>
          <StaleNotice data={data} />
          <FailureNotice failures={data.failures} />

          <SectionHeader>Dining Commons</SectionHeader>
          <ListGroup>
            {data.halls.map((hall, i) => (
              <Row
                key={hall.slug}
                last={i === data.halls.length - 1}
                onClick={() => setDetailTarget({ type: 'hall', hall })}
                trailing={<StatusPill state={hall.status.state} />}
              >
                <div className="text-[17px] leading-[22px] text-label">{hall.name}</div>
                <div className="mt-0.5 text-[13px] leading-[17px] text-label-2">
                  {hall.status.hoursText || 'Hours unavailable'}
                </div>
              </Row>
            ))}
          </ListGroup>

          {data.categories.map((cat) => (
            <div key={cat.slug}>
              <SectionHeader>{cat.name}</SectionHeader>
              <ListGroup>
                {cat.venues.map((venue, i) => (
                  <Row
                    key={`${venue.name}-${i}`}
                    last={i === cat.venues.length - 1}
                    onClick={() => setDetailTarget({ type: 'retail', venue })}
                    trailing={<StatusPill state={venue.status.state} />}
                  >
                    <div className="text-[17px] leading-[22px] text-label">{venue.name}</div>
                    <div className="mt-0.5 text-[13px] leading-[17px] text-label-2">
                      {venue.hoursText || 'Hours unavailable'}
                    </div>
                  </Row>
                ))}
              </ListGroup>
            </div>
          ))}

          <p className="px-5 pt-5 pb-2 text-[12px] leading-[16px] text-label-3">
            Live from umassdining.com. Menus are published for the current day only.
          </p>
        </>
      )}

      <VenueDetailSheet target={detailTarget} onClose={() => setDetailTarget(null)} />
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/* Apple-Maps-style bottom sheet for a selected pin — not the full modal Sheet, */
/* so the map stays visible and interactive above it.                          */
/* -------------------------------------------------------------------------- */

function MapPinSheet({ pin, statusOf, hoursOf, onClose, onSelectVenue }) {
  if (!pin) return null;

  return (
    <div
      className="sheet-enter absolute inset-x-0 bottom-0 z-20 flex max-h-[50vh] flex-col rounded-t-[20px] bg-bg shadow-2xl"
      style={{ minHeight: '32vh' }}
    >
      <div className="flex shrink-0 items-center justify-between px-4 pt-3 pb-2">
        <div className="flex-1">
          <div className="mx-auto mb-2 h-[5px] w-[36px] rounded-full bg-fill-strong" />
          <h2 className="text-[19px] font-bold text-label">{pin.label}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="ios-press-scale ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fill text-label-2"
        >
          <CloseIcon width={16} height={16} />
        </button>
      </div>

      <div className="ios-scroll no-scrollbar flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <ListGroup className="mt-1">
          {pin.venues.map((venue, i) => (
            <Row
              key={venue.name}
              last={i === pin.venues.length - 1}
              onClick={() => onSelectVenue(venue.name)}
              trailing={<StatusPill state={statusOf(venue.name)} />}
            >
              <div className="text-[17px] leading-[22px] text-label">{venue.name}</div>
              <div className="mt-0.5 text-[13px] leading-[17px] text-label-2">
                {hoursOf(venue.name) || venue.groupName}
              </div>
            </Row>
          ))}
        </ListGroup>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared venue detail — halls get today's hours + full menu, retail venues   */
/* get hours + the scraped description. Both get a Location section.          */
/* -------------------------------------------------------------------------- */

function VenueDetailSheet({ target, onClose }) {
  const isHall = target?.type === 'hall';
  const hall = isHall ? target.hall : null;
  const venue = !isHall ? target?.venue : null;
  const name = isHall ? hall?.name : venue?.name;

  const { data, error, loading } = useAsync(
    () => (isHall && hall ? getHallMenu(hall.slug) : Promise.resolve(null)),
    [isHall, hall?.slug],
    { enabled: Boolean(isHall && hall) },
  );

  const [meal, setMeal] = useState(null);
  const meals = data?.meals || [];
  // Default to the meal that best matches the current time, like the dining app does.
  const activeMeal = meal && meals.some((m) => m.meal === meal) ? meal : defaultMeal(meals);
  const current = meals.find((m) => m.meal === activeMeal);

  const links = name ? mapLinks({ name }) : null;

  return (
    <Sheet open={Boolean(target)} onClose={onClose} title={name || ''}>
      {isHall && loading && <LoadingState label="Loading menu…" />}
      {isHall && error && <ErrorState error={error} what="this menu" />}

      {!isHall && (
        <div className="px-4 pt-3">
          {venue?.status && (
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill state={venue.status.state} />
              {(venue.hoursText || venue.status.hoursText) && (
                <span className="text-[14px] text-label-2">{venue.hoursText || venue.status.hoursText}</span>
              )}
            </div>
          )}
          {venue?.description && (
            <p className="mt-3 text-[15px] leading-[21px] text-label">{venue.description}</p>
          )}
          {!venue?.status && !venue?.description && (
            <p className="text-[14px] leading-[19px] text-label-2">
              No live details for this spot right now.
            </p>
          )}
        </div>
      )}

      {isHall && data && (
        <div className="px-4 pt-3">
          <p className="text-[13px] text-label-2">{data.dateLabel}</p>
        </div>
      )}

      {links && (
        <>
          <SectionHeader>Location</SectionHeader>
          <div className="flex gap-2 px-4 pb-2">
            <a
              href={links.apple}
              target="_blank"
              rel="noreferrer"
              className="ios-press-scale flex-1 rounded-[12px] bg-fill px-3 py-[10px] text-center text-[14px] font-medium text-ios-blue"
            >
              Open in Apple Maps
            </a>
            <a
              href={links.google}
              target="_blank"
              rel="noreferrer"
              className="ios-press-scale flex-1 rounded-[12px] bg-fill px-3 py-[10px] text-center text-[14px] font-medium text-ios-blue"
            >
              Open in Google Maps
            </a>
          </div>
        </>
      )}

      {!isHall && venue?.infoUrl && (
        <div className="px-4 pb-2">
          <a
            href={venue.infoUrl}
            target="_blank"
            rel="noreferrer"
            className="ios-press-scale block rounded-[12px] bg-fill px-4 py-[10px] text-center text-[15px] font-medium text-ios-blue"
          >
            More info at umassdining.com
          </a>
        </div>
      )}

      {isHall && data?.hoursSections?.length > 0 && (
        <>
          <SectionHeader>Hours</SectionHeader>
          <ListGroup>
            {data.hoursSections.map((section, i) => (
              <div
                key={`${section.title}-${i}`}
                className={`px-4 py-3 ${i === data.hoursSections.length - 1 ? '' : 'relative ios-separator'}`}
                style={{ '--sep-inset': '16px' }}
              >
                <div className="text-[15px] font-medium text-label">{section.title}</div>
                <div className="mt-1 space-y-0.5">
                  {section.lines.map((line, j) => (
                    <div
                      key={j}
                      className={
                        line.kind === 'hours' ? 'text-[15px] text-label' : 'text-[13px] text-label-2'
                      }
                    >
                      {line.text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </ListGroup>
        </>
      )}

      {isHall && data && meals.length === 0 && (
        <EmptyState
          title="No menu posted"
          message="This dining hall has no menu published for today — it may be closed for the season."
        />
      )}

      {isHall && meals.length > 0 && (
        <>
          <div className="px-4 pt-5">
            <SegmentedControl
              options={meals.map((m) => ({ value: m.meal, label: m.label }))}
              value={activeMeal}
              onChange={setMeal}
            />
          </div>

          {current?.stations.map((station) => (
            <div key={station.name}>
              <SectionHeader>{station.name}</SectionHeader>
              <ListGroup>
                {station.items.map((item, i) => (
                  <Row key={`${item.name}-${i}`} last={i === station.items.length - 1}>
                    <div className="text-[16px] leading-[21px] text-label">{item.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {item.calories != null && (
                        <span className="text-[12px] text-label-2">{item.calories} cal</span>
                      )}
                      {item.diets.slice(0, 3).map((d) => (
                        <Badge key={d} tone={dietTone(d)}>
                          {d}
                        </Badge>
                      ))}
                      {item.allergens.length > 0 && (
                        <span className="text-[12px] text-ios-orange">
                          {item.allergens.slice(0, 3).join(', ')}
                        </span>
                      )}
                    </div>
                  </Row>
                ))}
              </ListGroup>
            </div>
          ))}
        </>
      )}
    </Sheet>
  );
}

function dietTone(diet) {
  const d = diet.toLowerCase();
  if (d.includes('vegan') || d.includes('plant')) return 'green';
  if (d.includes('halal')) return 'teal';
  if (d.includes('vegetarian')) return 'green';
  if (d.includes('whole grain')) return 'orange';
  return 'gray';
}

/** Pick breakfast / lunch / dinner from the wall clock. */
function defaultMeal(meals) {
  if (!meals.length) return null;
  const hour = new Date().getHours();
  const want = hour < 10.5 ? 'breakfast' : hour < 16 ? 'lunch' : 'dinner';
  return meals.find((m) => m.meal === want)?.meal || meals[0].meal;
}
