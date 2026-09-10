import { forwardRef, useEffect, useMemo, useState } from 'react';
import { Screen } from '../components/Screen.jsx';
import {
  Button,
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
import { ChevronIcon, StarIcon } from '../components/Icons.jsx';
import { MenuScreen } from './MenuScreen.jsx';
import { getDiningOverview, getHallMenu } from '../lib/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { useLocalState } from '../hooks/useLocalState.js';
import { CampusMap } from '../components/CampusMap.jsx';
import {
  ALL_VENUES,
  FOOD_TRUCK_NOTE,
  findVenue,
  hasNoFixedLocation,
  mapLinks,
  normalise,
  venueEntriesInGroup,
} from '../lib/diningCatalog.js';
import { preferredMapUrl } from '../lib/platform.js';
import { statusLine } from '../lib/diningStatus.js';
import { KEYS } from '../lib/storage.js';
import { getProfile, matchesName, setProfile } from '../lib/profile.js';

export const DiningScreen = forwardRef(function DiningScreen(
  { active = true, onMapModeChange, onPinSheetChange },
  ref,
) {
  const { data, error, loading, refresh } = useAsync(getDiningOverview);
  const [view, setView] = useState('list');
  const [selectedPin, setSelectedPin] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [menuHall, setMenuHall] = useState(null);

  // Re-renders whenever the profile changes (e.g. pinning from Settings'
  // Favorite Dining picker) so this list's stars stay in sync both ways.
  useLocalState(KEYS.profile, null);
  const diningFavourites = getProfile().diningFavourites || [];
  const isPinned = (name) => matchesName(name, diningFavourites);
  const togglePin = (name) => {
    // Store the catalogue's canonical name (e.g. "Worcester Commons"), not
    // whatever short form the live site uses ("Worcester") — DiningPicker's
    // checkboxes match against the catalogue exactly, so the two views would
    // otherwise disagree about what's pinned.
    const canonical = findVenue(name)?.name || name;
    setProfile({
      diningFavourites: isPinned(name)
        ? diningFavourites.filter((f) => !matchesName(name, [f]))
        : [...diningFavourites, canonical],
    });
  };

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

  // Same for a full menu page left open — never leave it showing for next visit.
  useEffect(() => {
    if (!active) setMenuHall(null);
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

  // Pinned halls/venues move to their own section at the top, out of their
  // normal one — food trucks have no fixed location and aren't pinnable.
  const unpinnedHalls = data ? data.halls.filter((h) => !isPinned(h.name)) : [];
  const pinnedItems = data
    ? [
        ...data.halls.filter((h) => isPinned(h.name)).map((hall) => ({ type: 'hall', hall })),
        ...data.categories
          .flatMap((c) => c.venues)
          .filter((v) => isPinned(v.name))
          .map((venue) => ({ type: 'retail', venue })),
      ]
    : [];

  // Full-screen menu takes over from either the list or map view — closing it
  // returns to whichever was showing, with the venue's sheet (still tracked
  // in `detailTarget`) open exactly where it was left.
  if (menuHall) {
    return <MenuScreen hall={menuHall} onClose={() => setMenuHall(null)} />;
  }

  if (data && view === 'map') {
    return (
      <div className="relative h-full w-full overflow-hidden bg-bg">
        <div className="absolute inset-0">
          <CampusMap
            venues={ALL_VENUES}
            statusOf={statusOf}
            selectedPinId={selectedPin?.id}
            onSelectPin={(pin) => {
              // A pin with exactly one venue has nothing to disambiguate —
              // skip straight to its full detail sheet instead of the
              // accordion-of-venues popup.
              if (pin && pin.venues.length === 1) {
                setDetailTarget(resolveTarget(pin.venues[0].name));
              } else {
                setSelectedPin(pin);
              }
            }}
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

        <VenueDetailSheet target={detailTarget} onClose={() => setDetailTarget(null)} onViewFullMenu={setMenuHall} />
      </div>
    );
  }

  return (
    <Screen
      ref={ref}
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

          {pinnedItems.length > 0 && (
            <>
              <SectionHeader>Pinned</SectionHeader>
              <ListGroup>
                {pinnedItems.map((item, i) => (
                  <PinnableRow
                    key={item.type === 'hall' ? item.hall.slug : `${item.venue.name}-${i}`}
                    name={item.type === 'hall' ? item.hall.name : item.venue.name}
                    status={item.type === 'hall' ? item.hall.status : item.venue.status}
                    last={i === pinnedItems.length - 1}
                    pinned
                    onTogglePin={() =>
                      togglePin(item.type === 'hall' ? item.hall.name : item.venue.name)
                    }
                    onClick={() => setDetailTarget(item)}
                  />
                ))}
              </ListGroup>
            </>
          )}

          {unpinnedHalls.length > 0 && (
            <>
              <SectionHeader>Dining Commons</SectionHeader>
              <ListGroup>
                {unpinnedHalls.map((hall, i) => (
                  <PinnableRow
                    key={hall.slug}
                    name={hall.name}
                    status={hall.status}
                    last={i === unpinnedHalls.length - 1}
                    pinned={false}
                    onTogglePin={() => togglePin(hall.name)}
                    onClick={() => setDetailTarget({ type: 'hall', hall })}
                  />
                ))}
              </ListGroup>
            </>
          )}

          {data.categories.map((cat) => {
            const venues = cat.venues.filter((venue) => !isPinned(venue.name));
            if (venues.length === 0) return null;
            return (
              <div key={cat.slug}>
                <SectionHeader>{cat.name}</SectionHeader>
                <ListGroup>
                  {venues.map((venue, i) => (
                    <PinnableRow
                      key={`${venue.name}-${i}`}
                      name={venue.name}
                      status={venue.status}
                      last={i === venues.length - 1}
                      pinned={false}
                      onTogglePin={() => togglePin(venue.name)}
                      onClick={() => setDetailTarget({ type: 'retail', venue })}
                    />
                  ))}
                </ListGroup>
              </div>
            );
          })}

          <SectionHeader>Food Trucks</SectionHeader>
          <ListGroup>
            {venueEntriesInGroup('foodtrucks').map((truck, i, arr) => (
              <Row
                key={truck.name}
                last={i === arr.length - 1}
                onClick={() => setDetailTarget({ type: 'retail', venue: { name: truck.name } })}
              >
                <div className="text-[17px] leading-[22px] text-label">{truck.name}</div>
                <div className="mt-0.5 text-[13px] leading-[17px] text-label-2">
                  {truck.blurb || FOOD_TRUCK_NOTE}
                </div>
                {(truck.instagram || truck.website) && (
                  <div className="mt-1.5 flex gap-3">
                    {truck.instagram && (
                      <a
                        href={truck.instagram}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[13px] font-medium text-ios-blue"
                      >
                        Instagram
                      </a>
                    )}
                    {truck.website && (
                      <a
                        href={truck.website}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[13px] font-medium text-ios-blue"
                      >
                        Website
                      </a>
                    )}
                  </div>
                )}
              </Row>
            ))}
          </ListGroup>

          <p className="px-5 pt-5 pb-2 text-[12px] leading-[16px] text-label-3">
            Live from umassdining.com. Menus are published for the current day only.
          </p>
        </>
      )}

      <VenueDetailSheet target={detailTarget} onClose={() => setDetailTarget(null)} onViewFullMenu={setMenuHall} />
    </Screen>
  );
});

/**
 * A dining-list row with a leading pin/star toggle, synced with
 * `profile.diningFavourites`. Built from two sibling buttons rather than
 * `Row`'s usual single clickable element — nesting the star button inside
 * Row's own `<button>` is invalid HTML and breaks click handling in some
 * browsers.
 */
function PinnableRow({ name, status, last, pinned, onTogglePin, onClick }) {
  return (
    <div
      className={`relative flex w-full items-center ${last ? '' : 'ios-separator'}`}
      style={{ '--sep-inset': '16px' }}
    >
      <button
        type="button"
        onClick={onTogglePin}
        aria-label={pinned ? `Unpin ${name}` : `Pin ${name}`}
        className="ios-press-scale shrink-0 py-[11px] pl-4 pr-2"
      >
        <StarIcon filled={pinned} width={20} height={20} className={pinned ? 'text-ios-yellow' : 'text-label-3'} />
      </button>
      <button
        type="button"
        onClick={onClick}
        className="ios-press flex min-w-0 flex-1 items-center gap-3 py-[11px] pr-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="text-[17px] leading-[22px] text-label">{name}</div>
          {statusLine(status) && (
            <div className="mt-0.5 text-[13px] leading-[17px] text-label-2">{statusLine(status)}</div>
          )}
        </div>
        <StatusPill state={status.state} />
      </button>
    </div>
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

// Two detents so a long menu/hours list can be dragged up to full height,
// same as the map pin sheet — previously a single fixed "content" detent
// capped at 92vh, which is what made a tall sheet awkward to scroll.
const VENUE_DETAIL_DETENTS = [
  { key: 'full', height: 'viewport' },
  { key: 'content', height: 'content' },
];

function VenueDetailSheet({ target, onClose, onViewFullMenu }) {
  const isHall = target?.type === 'hall';
  const name = isHall ? target.hall?.name : target?.venue?.name;

  return (
    <Sheet
      open={Boolean(target)}
      onClose={onClose}
      title={name || ''}
      detents={VENUE_DETAIL_DETENTS}
      initialDetent="content"
      contentKey={name}
    >
      {target && <VenueDetail target={target} onViewFullMenu={onViewFullMenu} />}
    </Sheet>
  );
}

function VenueDetail({ target, onViewFullMenu }) {
  const isHall = target?.type === 'hall';
  const hall = isHall ? target.hall : null;
  const venue = !isHall ? target?.venue : null;
  const name = isHall ? hall?.name : venue?.name;

  const { data, error, loading } = useAsync(
    () => (isHall && hall ? getHallMenu(hall.slug) : Promise.resolve(null)),
    [isHall, hall?.slug],
    { enabled: Boolean(isHall && hall) },
  );

  const meals = data?.meals || [];
  const noLocation = hasNoFixedLocation(name);
  const links = name && !noLocation ? mapLinks({ name }) : null;
  // Every location gets a one-line blurb: the live scrape's own teaser for
  // retail venues when there is one, else the catalog's hand-written copy —
  // dining halls never get a scraped teaser at all, so this is their only
  // description.
  const blurb = (!isHall && venue?.description) || findVenue(name)?.blurb || null;

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
              {statusLine(venue.status) && (
                <span className="text-[14px] text-label-2">{statusLine(venue.status)}</span>
              )}
            </div>
          ) : null}
          {!noLocation && blurb && <p className="mt-3 text-[15px] leading-[21px] text-label">{blurb}</p>}
          {!noLocation && !venue?.status && !blurb && (
            <p className="text-[14px] leading-[19px] text-label-2">
              No live details for this spot right now.
            </p>
          )}
        </div>
      )}

      {isHall && (blurb || data) && (
        <div className="px-4 pt-3">
          {blurb && <p className="text-[15px] leading-[21px] text-label">{blurb}</p>}
          {data && <p className={blurb ? 'mt-2 text-[13px] text-label-2' : 'text-[13px] text-label-2'}>{data.dateLabel}</p>}
        </div>
      )}

      {links && (
        <>
          <SectionHeader>Location</SectionHeader>
          <div className="px-4 pb-2">
            <a
              href={preferredMapUrl(links)}
              target="_blank"
              rel="noreferrer"
              className="ios-press-scale block rounded-[12px] bg-fill px-4 py-[10px] text-center text-[14px] font-medium text-ios-blue"
            >
              Directions
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
        <div className="px-4 pt-5 pb-2">
          <Button variant="tinted" className="w-full" onClick={() => onViewFullMenu?.(hall)}>
            View Full Menu
          </Button>
        </div>
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
  const status = isHall ? hall?.status : venue?.status;
  const links = name && !noLocation ? mapLinks({ name }) : null;
  const blurb = (!isHall && venue?.description) || findVenue(name)?.blurb || null;

  return (
    <>
      <div className="px-4 pt-3 pb-2">
        {noLocation ? (
          <p className="text-[14px] leading-[19px] text-label-2">{FOOD_TRUCK_NOTE}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill state={status?.state || 'unknown'} />
            {statusLine(status) && (
              <span className="text-[14px] text-label-2">{statusLine(status)}</span>
            )}
          </div>
        )}
        {!noLocation && blurb && <p className="mt-2 text-[14px] leading-[19px] text-label-2">{blurb}</p>}
      </div>

      {links && (
        <>
          <SectionHeader>Location</SectionHeader>
          <div className="px-4 pb-2">
            <a
              href={preferredMapUrl(links)}
              target="_blank"
              rel="noreferrer"
              className="ios-press-scale block rounded-[12px] bg-fill px-4 py-[10px] text-center text-[14px] font-medium text-ios-blue"
            >
              Directions
            </a>
          </div>
        </>
      )}
    </>
  );
}

