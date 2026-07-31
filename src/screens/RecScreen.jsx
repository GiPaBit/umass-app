import { useRef, useState } from 'react';
import { Screen } from '../components/Screen.jsx';
import { ChevronIcon } from '../components/Icons.jsx';
import { ErrorState, FailureNotice, LoadingState, RoundButton, StaleNotice } from '../components/ui.jsx';
import { RecWellSection } from '../components/rec/RecWellSection.jsx';
import { SportsSection } from '../components/rec/SportsSection.jsx';
import { getRec } from '../lib/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { useLocalState } from '../hooks/useLocalState.js';
import { KEYS } from '../lib/storage.js';

const SECTION_OPTIONS = [
  { value: 'recwell', label: 'RecWell' },
  { value: 'sports', label: 'Sports' },
];

const SCROLL_TOP_THRESHOLD = 300;

/**
 * Thin shell: owns the RecWell/Sports mode switch and the single /api/rec fetch
 * both sections share. Both sections stay mounted (`hidden` toggles visibility,
 * same pattern App.jsx uses for the five main tabs) so switching modes doesn't
 * lose a section's own sub-tab selection or scroll position.
 */
export function RecScreen() {
  const { data, error, loading, refresh } = useAsync(getRec);
  const [section, setSection] = useLocalState(KEYS.recSection, 'recwell');
  const screenRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const facilities = data?.recwell.hours.facilities || [];
  const openNow = facilities.filter((f) => f.status.state === 'open').length;

  return (
    <div className="relative h-full">
      <Screen
        ref={screenRef}
        titleMenu={{ options: SECTION_OPTIONS, value: section, onChange: setSection }}
        subtitle={data ? `${openNow} facilit${openNow === 1 ? 'y' : 'ies'} open` : undefined}
        onRefresh={refresh}
        onScroll={(top) => setShowScrollTop(top > SCROLL_TOP_THRESHOLD)}
      >
        {loading && !data && <LoadingState label="Checking RecWell…" />}
        {error && !data && <ErrorState error={error} what="Rec & Sports info" onRetry={refresh} />}

        {data && (
          <>
            <StaleNotice data={data} />
            <FailureNotice failures={data.failures} />

            <div hidden={section !== 'recwell'}>
              <RecWellSection data={data} />
            </div>
            <div hidden={section !== 'sports'}>
              <SportsSection data={data} />
            </div>
          </>
        )}
      </Screen>

      {/* iOS has no web API for a status-bar tap — this is the documented fallback. */}
      {showScrollTop && (
        <div className="absolute right-4 z-30" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 100px)' }}>
          <RoundButton onClick={() => screenRef.current?.scrollToTop()} label="Scroll to top">
            <ChevronIcon width={18} height={18} style={{ transform: 'rotate(-90deg)' }} />
          </RoundButton>
        </div>
      )}
    </div>
  );
}
