import { useMemo, useState } from 'react';
import { Screen } from '../components/Screen.jsx';
import { Button, Spinner } from '../components/ui.jsx';
import { GearIcon } from '../components/Icons.jsx';
import { TypedBrief } from '../components/TypedBrief.jsx';
import { getDiningOverview, getEvents, getRec } from '../lib/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { useLocalState } from '../hooks/useLocalState.js';
import { KEYS } from '../lib/storage.js';
import { activeSource, fetchAssignments, SOURCE } from '../lib/assignments.js';
import { composeNowBrief, composeWeekBrief } from '../lib/brief.js';
import { getProfile } from '../lib/profile.js';

/**
 * The landing tab is now just two briefs: what matters right now, and a look at
 * the week ahead. Anything named in them is tappable and jumps to the tab that
 * owns it, so this page stays a summary rather than a second copy of the app.
 */
export function TodayScreen({ onOpenSettings, onNavigate }) {
  const [calendarIds] = useLocalState(KEYS.canvasCalendars, []);
  const [feeds] = useLocalState(KEYS.feeds, []);
  const [done] = useLocalState(KEYS.doneAssignments, {});
  const [quickEvents] = useLocalState(KEYS.quickEvents, []);
  const [profileRaw] = useLocalState(KEYS.profile, null);

  // Once skipped, stay skipped for the rest of the session.
  const [skipped, setSkipped] = useState(false);

  const profile = useMemo(() => getProfile(), [profileRaw]);
  const source = activeSource();

  const dining = useAsync(getDiningOverview);
  const rec = useAsync(getRec);
  const events = useAsync(() => getEvents(14));
  const assignments = useAsync(fetchAssignments, [source, JSON.stringify(feeds), calendarIds.join(',')], {
    enabled: source !== SOURCE.none,
  });

  const refresh = async () => {
    await Promise.allSettled([dining.refresh(), rec.refresh(), events.refresh(), assignments.refresh()]);
  };

  // Ticked-off work drops out of the brief, which is what makes it feel live.
  const openAssignments = useMemo(
    () => (assignments.data || []).filter((a) => !done[a.id]),
    [assignments.data, done],
  );

  const allEvents = useMemo(
    () => [...(events.data?.events || []), ...quickEvents].filter((e) => e.start),
    [events.data, quickEvents],
  );

  // Wait for the slower sources before typing, so the text does not rewrite itself.
  const ready = !dining.loading && !rec.loading && !events.loading && !assignments.loading;

  const nowBrief = useMemo(
    () =>
      composeNowBrief({
        profile,
        assignments: openAssignments,
        events: allEvents,
        dining: dining.data,
        rec: rec.data,
      }),
    [profile, openAssignments, allEvents, dining.data, rec.data],
  );

  const weekBrief = useMemo(
    () => composeWeekBrief({ profile, assignments: openAssignments, events: allEvents }),
    [profile, openAssignments, allEvents],
  );

  const dateLine = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Screen
      title="Today"
      subtitle={dateLine}
      onRefresh={refresh}
      trailing={
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          className="ios-press-scale -m-1 p-1 text-ios-blue"
        >
          <GearIcon />
        </button>
      }
    >
      {!ready ? (
        <div className="flex flex-col items-center gap-3 py-20 text-label-2">
          <Spinner />
          <span className="text-[15px]">Putting your brief together…</span>
        </div>
      ) : (
        <>
          <BriefCard>
            <TypedBrief
              segments={nowBrief}
              onNavigate={onNavigate}
              animate={!skipped}
              onSkip={() => setSkipped(true)}
            />
          </BriefCard>

          <BriefCard title="The week ahead" delay={260}>
            <TypedBrief
              segments={weekBrief}
              onNavigate={onNavigate}
              // The second brief only starts once the first is out of the way.
              animate={false}
            />
          </BriefCard>

          {source === SOURCE.none && (
            <div className="mx-4 mt-3 rounded-[16px] bg-card p-4 text-center">
              <p className="text-[15px] leading-[20px] text-label-2">
                Connect a calendar to fold your assignments into the brief.
              </p>
              <Button variant="tinted" className="mt-3" onClick={onOpenSettings}>
                Set up
              </Button>
            </div>
          )}

          {(dining.error || rec.error || events.error || assignments.error) && (
            <p className="px-5 pt-4 text-center text-[13px] leading-[18px] text-ios-orange">
              Some sources didn’t load, so the brief may be incomplete. Pull down to try again.
            </p>
          )}
        </>
      )}
    </Screen>
  );
}

function BriefCard({ title, children, delay = 0 }) {
  return (
    <div
      className="fade-up mx-4 mt-3 rounded-[20px] bg-card p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      {title && (
        <h2 className="font-display mb-2 text-[13px] font-semibold tracking-[0.06em] text-label-3 uppercase">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
