import { useMemo, useState } from 'react';
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
  StatusPill,
} from '../components/ui.jsx';
import { getDiningOverview, getHallMenu } from '../lib/api.js';
import { useAsync } from '../hooks/useAsync.js';

export function DiningScreen() {
  const { data, error, loading, refresh } = useAsync(getDiningOverview);
  const [openHall, setOpenHall] = useState(null);

  const openCount = useMemo(() => {
    if (!data) return 0;
    const halls = data.halls.filter((h) => h.status.state === 'open').length;
    const venues = data.categories.flatMap((c) => c.venues).filter((v) => v.status.state === 'open').length;
    return halls + venues;
  }, [data]);

  return (
    <Screen
      title="Dining"
      subtitle={data ? `${openCount} open right now` : undefined}
      onRefresh={refresh}
    >
      {loading && !data && <LoadingState label="Checking menus…" />}
      {error && !data && <ErrorState error={error} what="dining" onRetry={refresh} />}

      {data && (
        <>
          <FailureNotice failures={data.failures} />

          <SectionHeader>Dining Commons</SectionHeader>
          <ListGroup>
            {data.halls.map((hall, i) => (
              <Row
                key={hall.slug}
                last={i === data.halls.length - 1}
                onClick={() => setOpenHall(hall)}
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

      <HallMenuSheet hall={openHall} onClose={() => setOpenHall(null)} />
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */

function HallMenuSheet({ hall, onClose }) {
  const { data, error, loading } = useAsync(
    () => (hall ? getHallMenu(hall.slug) : Promise.resolve(null)),
    [hall?.slug],
    { enabled: Boolean(hall) },
  );

  const [meal, setMeal] = useState(null);
  const meals = data?.meals || [];
  // Default to the meal that best matches the current time, like the dining app does.
  const activeMeal = meal && meals.some((m) => m.meal === meal) ? meal : defaultMeal(meals);
  const current = meals.find((m) => m.meal === activeMeal);

  return (
    <Sheet open={Boolean(hall)} onClose={onClose} title={hall?.name || ''}>
      {loading && <LoadingState label="Loading menu…" />}
      {error && <ErrorState error={error} what="this menu" />}

      {data && (
        <>
          <div className="px-4 pt-3">
            <p className="text-[13px] text-label-2">{data.dateLabel}</p>
          </div>

          {data.hoursSections?.length > 0 && (
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
                            line.kind === 'hours'
                              ? 'text-[15px] text-label'
                              : 'text-[13px] text-label-2'
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

          {meals.length === 0 ? (
            <EmptyState
              title="No menu posted"
              message="This dining hall has no menu published for today — it may be closed for the season."
            />
          ) : (
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
