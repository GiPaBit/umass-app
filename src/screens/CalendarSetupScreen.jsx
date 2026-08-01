import { CalendarFeedForm } from '../components/CalendarFeedForm.jsx';

/**
 * Onboarding's pitch moment for the app's main function — surfaces the same
 * calendar-linking flow Settings has, inline, before landing in the main app.
 * Skippable: the same flow is always reachable later from Settings → Calendars.
 */
export function CalendarSetupScreen({ onDone }) {
  return (
    <div className="flex h-full min-h-0 flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="ios-scroll no-scrollbar min-h-0 flex-1 overflow-y-auto px-4">
        <div className="fade-up pt-6">
          <h1 className="font-display text-[30px] leading-[36px] font-bold text-label">
            Bring in your calendar
          </h1>
          <p className="mt-2 text-[16px] leading-[22px] text-label-2">
            This is what makes your daily brief actually useful — link Canvas or Google Calendar and
            assignments and events show up automatically, no checking Canvas separately.
          </p>
          <div className="mt-5 pb-6">
            <CalendarFeedForm onSaved={onDone} />
          </div>
        </div>
      </div>

      <div className="shrink-0 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <button
          type="button"
          onClick={onDone}
          className="ios-press-scale mt-2 w-full py-2 text-[15px] text-label-2"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
