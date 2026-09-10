import { useState } from 'react';
import {
  Badge,
  EmptyState,
  ErrorState,
  ListGroup,
  LoadingState,
  Row,
  SectionHeader,
  SegmentedControl,
} from '../components/ui.jsx';
import { ChevronIcon } from '../components/Icons.jsx';
import { getHallMenu } from '../lib/api.js';
import { useAsync } from '../hooks/useAsync.js';

/**
 * Full page for one dining hall's today menu — pushed from `VenueDetail`'s
 * "View Full Menu" action instead of the old in-sheet meal tab, which made a
 * long station-by-station list cramped inside a half-screen popup.
 */
export function MenuScreen({ hall, onClose }) {
  const { data, error, loading } = useAsync(() => getHallMenu(hall.slug), [hall.slug]);

  const [meal, setMeal] = useState(null);
  const meals = data?.meals || [];
  // Default to the meal that best matches the current time, like the dining app does.
  const activeMeal = meal && meals.some((m) => m.meal === meal) ? meal : defaultMeal(meals);
  const current = meals.find((m) => m.meal === activeMeal);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-bg" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="ios-blur shrink-0 border-b border-separator/60 px-2 pt-2 pb-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="ios-press-scale flex items-center gap-0.5 p-2 text-[17px] text-ios-blue"
          >
            <ChevronIcon width={20} height={20} style={{ transform: 'rotate(180deg)' }} />
            Back
          </button>
        </div>
        <h1 className="font-display px-3 pt-1 text-[22px] leading-[26px] font-bold text-label">{hall.name}</h1>
        {data?.dateLabel && <p className="px-3 pt-0.5 text-[13px] text-label-2">{data.dateLabel}</p>}
      </div>

      <div className="ios-scroll no-scrollbar min-h-0 flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),20px)]">
        {loading && !data && <LoadingState label="Loading menu…" />}
        {error && !data && <ErrorState error={error} what="this menu" />}

        {data && meals.length === 0 && (
          <EmptyState
            title="No menu posted"
            message="This dining hall has no menu published for today — it may be closed for the season."
          />
        )}

        {meals.length > 0 && (
          <>
            <div className="px-4 pt-4">
              <SegmentedControl
                options={meals.map((m) => ({ value: m.meal, label: m.label }))}
                value={activeMeal}
                onChange={setMeal}
              />
              {current?.timeLabel && (
                <p className="mt-2 text-center text-[13px] text-label-2">{current.timeLabel}</p>
              )}
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
      </div>
    </div>
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

/** Pick the meal whose window (see MEAL_TIMES in api/_lib/dining.js) contains the wall clock right now. */
function defaultMeal(meals) {
  if (!meals.length) return null;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const want =
    minutes < 11 * 60 ? 'breakfast' : minutes < 16.5 * 60 ? 'lunch' : minutes < 21 * 60 ? 'dinner' : 'latenight';
  return meals.find((m) => m.meal === want)?.meal || meals[0].meal;
}
