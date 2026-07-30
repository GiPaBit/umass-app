import { useMemo, useState } from 'react';
import { Screen } from '../components/Screen.jsx';
import { Button, RoundButton, Spinner, StaleNotice } from '../components/ui.jsx';
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
  const [nowDone, setNowDone] = useState(false);
  const [lookedAhead, setLookedAhead] = useState(false);

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

  const weekBriefRaw = useMemo(
    () => composeWeekBrief({ profile, assignments: openAssignments, events: allEvents }),
    [profile, openAssignments, allEvents],
  );

  // Reads as a continuation of the daily brief rather than a new section, once
  // "Look ahead" reveals it.
  const weekBrief = useMemo(() => {
    if (!weekBriefRaw.length) return weekBriefRaw;
    const [first, ...rest] = weekBriefRaw;
    return [{ text: 'Looking ahead — ' }, { ...first, text: lowerFirst(first.text) }, ...rest];
  }, [weekBriefRaw]);

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
        <RoundButton onClick={onOpenSettings} label="Settings">
          <GearIcon />
        </RoundButton>
      }
    >
      {!ready ? (
        <div className="flex flex-col items-center gap-3 py-20 text-label-2">
          <Spinner />
          <span className="text-[15px]">Putting your brief together…</span>
        </div>
      ) : (
        <>
          <div className="fade-up mx-5 mt-4">
            <TypedBrief
              segments={nowBrief}
              onNavigate={onNavigate}
              animate={!skipped}
              onSkip={() => setSkipped(true)}
              onComplete={() => setNowDone(true)}
            />

            {nowDone && !lookedAhead && (
              <button
                type="button"
                onClick={() => setLookedAhead(true)}
                className="ios-press-scale mt-1 rounded-full bg-fill px-3.5 py-[6px] text-[13px] font-medium text-label-2"
              >
                Look ahead
              </button>
            )}

            {lookedAhead && (
              <div className="mt-2">
                <TypedBrief segments={weekBrief} onNavigate={onNavigate} animate />
              </div>
            )}
          </div>

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

function lowerFirst(text) {
  return text ? text[0].toLowerCase() + text.slice(1) : text;
}
