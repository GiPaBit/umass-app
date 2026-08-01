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
import { ChevronIcon } from '../components/Icons.jsx';
import { getDiningOverview, getHallMenu } from '../lib/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { CampusMap } from '../components/CampusMap.jsx';
import {
  ALL_VENUES,
  FOOD_TRUCK_NOTE,
  hasNoFixedLocation,
  mapLinks,
  normalise,
  venuesInGroup,
} from '../lib/diningCatalog.js';

export function DiningScreen({ active = true, onMapModeChange, onPinSheetChange }) {
  const { data, error, loading, refresh } = useAsync(getDiningOverview);
  const [view, setView] = useState('list');
  const [selectedPin, setSelectedPin] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  useEffect(() => {
    onMapModeChange?.(view === 'map');
  }, [view, onMapModeChange]);

  useEffect(() => {
    onPinSheetChange?.(Boolean(selectedPin));
  }, [selectedPin, onPinSheetChange]);

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
          resolveTarget={resolveTarget}
          onClose={() => setSelectedPin(null)}
        />
      </div>
    );
  }

  return (
    <Screen
      title="Dining"
      subtitle={data ? `${openCount} open right now` : undefined}
      onRefresh={refresh}
      scrollTopButton
    >
      <div className="sticky top-10 z-[5] bg-bg px-4 pt-1 pb-1">
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

          <SectionHeader>Food Trucks</SectionHeader>
          <ListGroup>
            {venuesInGroup('foodtrucks').map((name, i, arr) => (
              <Row
                key={name}
                last={i === arr.length - 1}
                onClick={() => setDetailTarget({ type: 'retail', venue: { name } })}
              >
                <div className="text-[17px] leading-[22px] text-label">{name}</div>
                <div className="mt-0.5 text-[13px] leading-[17px] text-label-2">{FOOD_TRUCK_NOTE}</div>
              </Row>
            ))}
          </ListGroup>

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
/* Bottom sheet for a selected map pin: peek (name + status), medium (the full  */
/* collapsed venue list — the ceiling, most of the time) and full (only if an   */
/* expanded venue's details actually don't fit in medium — Sheet promotes to    */
/* it on its own via a resize check, so tapping a venue never forces "full"     */
/* when it doesn't need to). Tapping a venue expands its details inline as a    */
/* single-open accordion row — no second modal stacked on top.                  */
/* -------------------------------------------------------------------------- */

// "Roughly a header's height" — tuned by eye, not measured, since peek only
// ever needs to show the pin's name (already in the sheet's title bar) and
// the first venue row's status at a glance.
const MAP_PIN_PEEK_PX = 108;
const MAP_PIN_DETENTS = [
  { key: 'full', height: 'viewport' },
  { key: 'medium', height: 'content' },
  { key: 'peek', height: MAP_PIN_PEEK_PX },
];

function MapPinSheet({ pin, statusOf, resolveTarget, onClose }) {
  const [expandedName, setExpandedName] = useState(null);

  useEffect(() => {
    setExpandedName(null);
  }, [pin?.id]);

  if (!pin) return null;

  const toggle = (name) => {
    setExpandedName((current) => (current === name ? null : name));
  };

  return (
    <Sheet
      open={Boolean(pin)}
      onClose={onClose}
      title={pin.label}
      detents={MAP_PIN_DETENTS}
      initialDetent="medium"
      contentKey={pin.id}
    >
      <ListGroup className="mt-1">
        {pin.venues.map((venue, i) => {
          const isOpen = expandedName === venue.name;
          return (
            <div key={venue.name} className={i === pin.venues.length - 1 ? '' : 'relative ios-separator'} style={{ '--sep-inset': '16px' }}>
              <button
                type="button"
                onClick={() => toggle(venue.name)}
                aria-expanded={isOpen}
                className="ios-press flex w-full items-center gap-3 px-4 py-[11px] text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[17px] leading-[22px] text-label">{venue.name}</div>
                </div>
                <StatusPill state={statusOf(venue.name)} />
                <ChevronIcon
                  className="shrink-0 text-label-3 transition-transform duration-300"
                  style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transitionTimingFunction: 'var(--ease-ios)' }}
                />
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr', transitionTimingFunction: 'var(--ease-ios)' }}
              >
                <div className="overflow-hidden">{isOpen && <VenueMapSummary target={resolveTarget(venue.name)} />}</div>
              </div>
            </div>
          );
        })}
      </ListGroup>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared venue detail — halls get today's hours + full menu, retail venues   */
/* get hours + the scraped description. Both get a Location section. Used     */
/* both as a full sheet (list view) and inline inside the map pin accordion.  */
/* -------------------------------------------------------------------------- */

function VenueDetailSheet({ target, onClose }) {
  const isHall = target?.type === 'hall';
  const name = isHall ? target.hall?.name : target?.venue?.name;

  return (
    <Sheet open={Boolean(target)} onClose={onClose} title={name || ''}>
      {target && <VenueDetail target={target} />}
    </Sheet>
  );
}

function VenueDetail({ target }) {
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

  const noLocation = hasNoFixedLocation(name);
  const links = name && !noLocation ? mapLinks({ name }) : null;

  return (
    <>
      {isHall && loading && <LoadingState label="Loading menu…" />}
      {isHall && error && <ErrorState error={error} what="this menu" />}

      {!isHall && (
        <div className="px-4 pt-3">
          {noLocation ? (
            <p className="text-[14px] leading-[19px] text-label-2">{FOOD_TRUCK_NOTE}</p>
          ) : venue?.status ? (
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill state={venue.status.state} />
              {(venue.hoursText || venue.status.hoursText) && (
                <span className="text-[14px] text-label-2">{venue.hoursText || venue.status.hoursText}</span>
              )}
            </div>
          ) : null}
          {!noLocation && venue?.description && (
            <p className="mt-3 text-[15px] leading-[21px] text-label">{venue.description}</p>
          )}
          {!noLocation && !venue?.status && !venue?.description && (
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
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Minimal glance-and-go card for the map pin sheet: name (already the row's   */
/* own title), status, today's hours, and the location link. No menu, no      */
/* description, no weekly hours table — that's what the List view's full      */
/* VenueDetail sheet is for.                                                   */
/* -------------------------------------------------------------------------- */

function VenueMapSummary({ target }) {
  const isHall = target?.type === 'hall';
  const hall = isHall ? target.hall : null;
  const venue = !isHall ? target?.venue : null;
  const name = isHall ? hall?.name : venue?.name;

  const noLocation = hasNoFixedLocation(name);
  const state = isHall ? hall?.status?.state : venue?.status?.state;
  const hoursText = isHall ? hall?.status?.hoursText : venue?.hoursText || venue?.status?.hoursText;
  const links = name && !noLocation ? mapLinks({ name }) : null;

  return (
    <>
      <div className="px-4 pt-3 pb-2">
        {noLocation ? (
          <p className="text-[14px] leading-[19px] text-label-2">{FOOD_TRUCK_NOTE}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill state={state || 'unknown'} />
            <span className="text-[14px] text-label-2">
              {state === 'closed' ? 'Closed today' : hoursText || 'Hours unavailable'}
            </span>
          </div>
        )}
      </div>

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
    </>
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
