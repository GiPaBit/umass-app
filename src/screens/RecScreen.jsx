import { Screen } from '../components/Screen.jsx';
import { ErrorState, FailureNotice, LoadingState, StaleNotice } from '../components/ui.jsx';
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

/**
 * Thin shell: owns the RecWell/Sports mode switch and the single /api/rec fetch
 * both sections share. Both sections stay mounted (`hidden` toggles visibility,
 * same pattern App.jsx uses for the five main tabs) so switching modes doesn't
 * lose a section's own sub-tab selection or scroll position.
 */
export function RecScreen() {
  const { data, error, loading, refresh } = useAsync(getRec);
  const [section, setSection] = useLocalState(KEYS.recSection, 'recwell');

  const facilities = data?.recwell.hours.facilities || [];
  const openNow = facilities.filter((f) => f.status.state === 'open').length;

  return (
    <Screen
      titleMenu={{ options: SECTION_OPTIONS, value: section, onChange: setSection }}
      subtitle={data ? `${openNow} facilit${openNow === 1 ? 'y' : 'ies'} open` : undefined}
      onRefresh={refresh}
      scrollTopButton
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
  );
}
