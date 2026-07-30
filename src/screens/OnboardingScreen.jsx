import { PreferencesFlow } from './PreferencesFlow.jsx';

/** First launch — the same questionnaire Settings reopens later. */
export function OnboardingScreen({ onDone }) {
  return (
    <div className="h-full bg-bg" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <PreferencesFlow onDone={onDone} finishLabel="Get started" />
    </div>
  );
}
