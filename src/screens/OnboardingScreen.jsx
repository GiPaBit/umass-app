import { useState } from 'react';
import { WelcomeScreen } from './WelcomeScreen.jsx';
import { PreferencesFlow } from './PreferencesFlow.jsx';
import { CalendarSetupScreen } from './CalendarSetupScreen.jsx';
import { setProfile } from '../lib/profile.js';

/**
 * First launch, standalone mode only: welcome -> questionnaire -> calendar
 * setup -> main app. `onboarded` (the flag `App.jsx` gates on) is only set
 * once calendar setup is reached, not right after the questionnaire — see
 * the note in `PreferencesFlow.finish()`.
 */
export function OnboardingScreen({ onDone }) {
  const [step, setStep] = useState('welcome');

  const finish = () => {
    setProfile({ onboarded: true });
    onDone();
  };

  return (
    <div className="h-full bg-bg">
      {step === 'welcome' && <WelcomeScreen onDone={() => setStep('questionnaire')} />}
      {step === 'questionnaire' && (
        <div className="h-full" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <PreferencesFlow onDone={() => setStep('calendar')} finishLabel="Continue" />
        </div>
      )}
      {step === 'calendar' && <CalendarSetupScreen onDone={finish} />}
    </div>
  );
}
