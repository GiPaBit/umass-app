import { useEffect, useMemo, useState } from 'react';
import { TabBar } from './components/TabBar.jsx';
import { TodayScreen } from './screens/TodayScreen.jsx';
import { AssignmentsScreen } from './screens/AssignmentsScreen.jsx';
import { DiningScreen } from './screens/DiningScreen.jsx';
import { RecScreen } from './screens/RecScreen.jsx';
import { EventsScreen } from './screens/EventsScreen.jsx';
import { SettingsScreen } from './screens/SettingsScreen.jsx';
import { OnboardingScreen } from './screens/OnboardingScreen.jsx';
import { useLocalState } from './hooks/useLocalState.js';
import { KEYS } from './lib/storage.js';
import { isToday } from './lib/dates.js';
import { isOnboarded } from './lib/profile.js';

export default function App() {
  const [tab, setTab] = useState('today');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickEvents] = useLocalState(KEYS.quickEvents, []);
  const [needsOnboarding, setNeedsOnboarding] = useState(() => !isOnboarded());
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

  // First launch: learn the basics before showing a brief that would be empty.
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
        <TodayScreen onOpenSettings={openSettings} onNavigate={setTab} />
      </TabPane>
      <TabPane active={tab === 'assignments'}>
        <AssignmentsScreen onOpenSettings={openSettings} />
      </TabPane>
      <TabPane active={tab === 'dining'}>
        <DiningScreen
          active={tab === 'dining'}
          onMapModeChange={setDiningMapActive}
          onPinSheetChange={setDiningPinOpen}
        />
      </TabPane>
      <TabPane active={tab === 'rec'}>
        <RecScreen />
      </TabPane>
      <TabPane active={tab === 'events'}>
        <EventsScreen />
      </TabPane>

      {!tabBarHidden && (
        <TabBar active={tab} onChange={setTab} badges={badges} floating={tabBarFloating} />
      )}

      <SettingsScreen open={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
