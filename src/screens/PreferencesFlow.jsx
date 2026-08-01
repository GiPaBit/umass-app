import { useState } from 'react';
import { Button } from '../components/ui.jsx';
import { DiningPicker } from '../components/DiningPicker.jsx';
import { WorkoutPreferencePicker } from '../components/WorkoutPreferencePicker.jsx';
import { SPORT_CHOICES, getProfile, setProfile } from '../lib/profile.js';

/**
 * The interests questionnaire. Used twice: full-screen on first launch, and
 * again inside Settings → Preferences, where it starts from what you already
 * chose rather than from blank.
 */
export function PreferencesFlow({ onDone, onCancel, finishLabel = 'Save' }) {
  const [draft, setDraft] = useState(() => {
    const p = getProfile();
    return {
      name: p.name || '',
      diningFavourites: p.diningFavourites || [],
      workoutPreferences: p.workoutPreferences || [],
      sports: p.sports || [],
    };
  });
  const [step, setStep] = useState(0);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const toggleSport = (sport) =>
    set({
      sports: draft.sports.includes(sport)
        ? draft.sports.filter((s) => s !== sport)
        : [...draft.sports, sport],
    });

  const steps = [
    {
      title: 'Hey there',
      caption: 'What should the app call you? This shows up in your daily brief.',
      body: (
        <input
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Your name"
          className="w-full rounded-[14px] bg-card px-4 py-3.5 text-[17px] text-label placeholder:text-label-3 focus:outline-none"
        />
      ),
    },
    {
      title: 'Where do you eat?',
      caption:
        'Pick the spots you actually use — they get top billing in your brief when they’re open. Tap a group to expand it.',
      body: (
        <DiningPicker
          selected={draft.diningFavourites}
          onChange={(diningFavourites) => set({ diningFavourites })}
        />
      ),
    },
    {
      title: 'Where do you work out?',
      caption: 'Pick as many as apply — your brief will tell you whether they’re open.',
      body: (
        <WorkoutPreferencePicker
          selected={draft.workoutPreferences}
          onChange={(workoutPreferences) => set({ workoutPreferences })}
        />
      ),
    },
    {
      title: 'Which teams do you follow?',
      caption: 'Games for these get called out ahead of everything else.',
      body: <Chips options={SPORT_CHOICES} selected={draft.sports} onToggle={toggleSport} />,
    },
  ];

  const current = steps[step];
  const last = step === steps.length - 1;

  const finish = () => {
    // Not `onboarded: true` here — during first launch that flag is only set
    // once the onboarding shell reaches (or skips) calendar setup, so a
    // force-quit mid-flow doesn't drop someone into the app having skipped
    // the calendar pitch. Reused from Settings, `onboarded` is already true.
    setProfile({ ...draft, name: draft.name.trim() });
    onDone();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pt-4">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? 'bg-ios-blue' : 'bg-fill'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="ios-scroll no-scrollbar min-h-0 flex-1 overflow-y-auto px-4">
        <div key={step} className="fade-up pt-6">
          <h1 className="font-display text-[30px] leading-[36px] font-bold text-label">
            {current.title}
          </h1>
          <p className="mt-2 text-[16px] leading-[22px] text-label-2">{current.caption}</p>
          <div className="mt-5 pb-6">{current.body}</div>
        </div>
      </div>

      <div className="shrink-0 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="flex items-center gap-3">
          {step > 0 ? (
            <Button variant="gray" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          ) : (
            onCancel && (
              <Button variant="gray" onClick={onCancel}>
                Cancel
              </Button>
            )
          )}
          <Button className="flex-1" onClick={last ? finish : () => setStep((s) => s + 1)}>
            {last ? finishLabel : 'Continue'}
          </Button>
        </div>
        {!onCancel && (
          <button
            type="button"
            onClick={finish}
            className="ios-press-scale mt-2 w-full py-2 text-[15px] text-label-2"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

export function Chips({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const on = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`ios-press-scale rounded-full px-4 py-[9px] text-[15px] font-medium transition-colors ${
              on ? 'bg-ios-blue text-white' : 'bg-card text-label'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
