import { SPORT_CHOICES } from '../lib/profile.js';

/** Chip multi-select for followed sports, reused by the first-run questionnaire and Settings. */
export function SportsPicker({ selected, onChange }) {
  const toggle = (sport) =>
    onChange(selected.includes(sport) ? selected.filter((s) => s !== sport) : [...selected, sport]);

  return (
    <div className="flex flex-wrap gap-2">
      {SPORT_CHOICES.map((option) => {
        const on = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
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
