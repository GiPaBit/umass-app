import { useEffect, useMemo, useRef, useState } from 'react';
import { TabBar } from './components/TabBar.jsx';
import { TodayScreen } from './screens/TodayScreen.jsx';
import { AssignmentsScreen } from './screens/AssignmentsScreen.jsx';
import { DiningScreen } from './screens/DiningScreen.jsx';
import { RecScreen } from './screens/RecScreen.jsx';
import { EventsScreen } from './screens/EventsScreen.jsx';
import { SettingsScreen } from './screens/SettingsScreen.jsx';
import { CalendarSetupScreen } from './screens/CalendarSetupScreen.jsx';
import { OnboardingScreen } from './screens/OnboardingScreen.jsx';
import { InstallScreen } from './screens/InstallScreen.jsx';
import { useLocalState } from './hooks/useLocalState.js';
import { KEYS } from './lib/storage.js';
import { isToday } from './lib/dates.js';
import { isOnboarded } from './lib/profile.js';
import { isStandalone } from './lib/platform.js';

// Flip to true once ready to make the install page a hard gate on every
// browser visit. Left off for now so "continue in browser" (dismiss-and-
// remember, below) is what actually runs — otherwise every local dev visit
// via `docker compose up` would hit this page on every reload.
const ALWAYS_SHOW_INSTALL_PAGE = false;

export default function App() {
  const [tab, setTab] = useState('today');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calendarSetupOpen, setCalendarSetupOpen] = useState(false);
  const [quickEvents] = useLocalState(KEYS.quickEvents, []);
  const [needsOnboarding, setNeedsOnboarding] = useState(() => !isOnboarded());
  const [standalone] = useState(isStandalone);
  const [installDismissed, setInstallDismissed] = useLocalState(KEYS.installDismissed, false);
  // The dining map takes over the whole screen and turns the tab bar into a
  // floating island — only while that tab is both active and on its map view.
  const [diningMapActive, setDiningMapActive] = useState(false);
  // A selected pin's detail sheet rises from the same bottom edge the floating
  // tab bar sits at — without this, the island tab bar draws on top of the
  // sheet's own bottom rows, which is what "blocked by the home bar" reports
  // to. Hiding it for as long as a pin is open keeps that area clear.
  const [diningPinOpen, setDiningPinOpen] = useState(false);
  const tabBarFloating = tab === 'dining' && diningMapActive;
  const tabBarHidden = tabBarFloating && diningPinOpen;

  // Badge the Events tab with anything the user pinned for today.
  const badges = useMemo(
    () => ({ events: quickEvents.filter((e) => e.start && isToday(e.start)).length }),
    [quickEvents],
  );

  // Keep the tab bar out of the way when the on-screen keyboard is up.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      document.documentElement.style.setProperty(
        '--keyboard-inset',
        `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`,
      );
    };
    vv.addEventListener('resize', onResize);
    onResize();
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  const openSettings = () => setSettingsOpen(true);
  const openCalendarSetup = () => {
    setSettingsOpen(false);
    setCalendarSetupOpen(true);
  };

  // Re-tapping the already-active tab scrolls it to top instead of no-op'ing,
  // matching iOS's status-bar-tap behavior — each screen exposes scrollToTop
  // off its ref (see Screen.jsx).
  const todayRef = useRef(null);
  const assignmentsRef = useRef(null);
  const diningRef = useRef(null);
  const recRef = useRef(null);
  const eventsRef = useRef(null);
  const screenRefs = { today: todayRef, assignments: assignmentsRef, dining: diningRef, rec: recRef, events: eventsRef };
  const handleTabChange = (id) => {
    if (id === tab) screenRefs[id].current?.scrollToTop();
    else setTab(id);
  };

  // Opened as a regular browser tab, not installed: this is the entry point
  // in browser mode, not an interstitial — the primary call to action is
  // installing, but browsing on is always one tap away.
  if (!standalone && (ALWAYS_SHOW_INSTALL_PAGE || !installDismissed)) {
    return <InstallScreen onContinue={() => setInstallDismissed(true)} />;
  }

  // First launch in standalone mode: learn the basics before showing a brief
  // that would be empty.
  if (needsOnboarding) {
    return <OnboardingScreen onDone={() => setNeedsOnboarding(false)} />;
  }

  return (
    <div className="relative h-full overflow-hidden bg-bg">
      {/*
        Each tab stays mounted but only the active one is displayed, so scroll
        position and loaded data survive tab switches like they do on iOS.
      */}
      <TabPane active={tab === 'today'}>
        <TodayScreen
          ref={todayRef}
          onOpenSettings={openSettings}
          onSetupCalendar={openCalendarSetup}
          onNavigate={setTab}
        />
      </TabPane>
      <TabPane active={tab === 'assignments'}>
        <AssignmentsScreen ref={assignmentsRef} onSetupCalendar={openCalendarSetup} />
      </TabPane>
      <TabPane active={tab === 'dining'}>
        <DiningScreen
          ref={diningRef}
          active={tab === 'dining'}
          onMapModeChange={setDiningMapActive}
          onPinSheetChange={setDiningPinOpen}
        />
      </TabPane>
      <TabPane active={tab === 'rec'}>
        <RecScreen ref={recRef} />
      </TabPane>
      <TabPane active={tab === 'events'}>
        <EventsScreen ref={eventsRef} />
      </TabPane>

      {!tabBarHidden && (
        <TabBar active={tab} onChange={handleTabChange} badges={badges} floating={tabBarFloating} />
      )}

      <SettingsScreen
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSetupCalendar={openCalendarSetup}
      />

      {calendarSetupOpen && (
        <div className="absolute inset-0 z-40 bg-bg">
          <CalendarSetupScreen onDone={() => setCalendarSetupOpen(false)} />
        </div>
      )}
    </div>
  );
}

function TabPane({ active, children }) {
  // `hidden` rather than unmounting: keeps state, and keeps inactive panes out
  // of the accessibility tree and the tab order.
  return (
    <div className="absolute inset-0" hidden={!active} aria-hidden={!active}>
      {children}
    </div>
  );
}
