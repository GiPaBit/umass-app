import { useState } from 'react';
import { Button } from '../components/ui.jsx';
import {
  CAFE_CHOICES,
  DINING_CHOICES,
  GYM_CHOICES,
  SPORT_CHOICES,
  setProfile,
} from '../lib/profile.js';

/**
 * First launch: a few taps to learn who you are and what you care about, so the
 * Today brief can lead with your dining halls, your gym and your teams.
 * Everything here is editable later in Settings, and every step is skippable.
 */
export function OnboardingScreen({ onDone }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({
    name: '',
    diningFavourites: [],
    cafeFavourites: [],
    gymFavourite: '',
    sports: [],
  });

  const toggle = (key, value) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(value) ? d[key].filter((v) => v !== value) : [...d[key], value],
    }));

  const steps = [
    {
      title: 'Hey there',
      caption: 'What should the app call you? This shows up in your daily brief.',
      body: (
        <input
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="Your name"
          autoFocus
          className="w-full rounded-[14px] bg-card px-4 py-3.5 text-[17px] text-label placeholder:text-label-3 focus:outline-none"
        />
      ),
    },
    {
      title: 'Where do you eat?',
      caption: 'Pick the dining commons you actually use. They get top billing when they’re open.',
      body: (
        <ChipGrid
          options={DINING_CHOICES}
          selected={draft.diningFavourites}
          onToggle={(v) => toggle('diningFavourites', v)}
        />
      ),
    },
    {
      title: 'Any go-to cafes?',
      caption: 'Blue Wall spots and cafes around campus.',
      body: (
        <ChipGrid
          options={CAFE_CHOICES}
          selected={draft.cafeFavourites}
          onToggle={(v) => toggle('cafeFavourites', v)}
        />
      ),
    },
    {
      title: 'Where do you work out?',
      caption: 'Your brief will tell you whether it’s open.',
      body: (
        <ChipGrid
          options={GYM_CHOICES}
          selected={draft.gymFavourite ? [draft.gymFavourite] : []}
          onToggle={(v) =>
            setDraft((d) => ({ ...d, gymFavourite: d.gymFavourite === v ? '' : v }))
          }
        />
      ),
    },
    {
      title: 'Which teams do you follow?',
      caption: 'Games for these get called out ahead of everything else.',
      body: (
        <ChipGrid options={SPORT_CHOICES} selected={draft.sports} onToggle={(v) => toggle('sports', v)} />
      ),
    },
  ];

  const current = steps[step];
  const last = step === steps.length - 1;

  const finish = () => {
    setProfile({ ...draft, name: draft.name.trim(), onboarded: true });
    onDone();
  };

  return (
    <div className="flex h-full flex-col bg-bg">
      {/* Progress */}
      <div className="pt-safe shrink-0 px-4">
        <div className="flex gap-1.5 pt-4">
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

      <div className="ios-scroll no-scrollbar flex-1 overflow-y-auto px-4">
        <div key={step} className="fade-up pt-8">
          <h1 className="font-display text-[32px] leading-[38px] font-bold text-label">
            {current.title}
          </h1>
          <p className="mt-2 text-[16px] leading-[22px] text-label-2">{current.caption}</p>
          <div className="mt-6 pb-6">{current.body}</div>
        </div>
      </div>

      <div className="pb-safe shrink-0 px-4 pt-3">
        <div className="flex items-center gap-3 pb-3">
          {step > 0 && (
            <Button variant="gray" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          <Button className="flex-1" onClick={last ? finish : () => setStep((s) => s + 1)}>
            {last ? 'Get started' : 'Continue'}
          </Button>
        </div>
        <button
          type="button"
          onClick={finish}
          className="ios-press-scale mb-2 w-full py-2 text-[15px] text-label-2"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

/** Multi-select pills. Used for every choice step. */
export function ChipGrid({ options, selected, onToggle }) {
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
