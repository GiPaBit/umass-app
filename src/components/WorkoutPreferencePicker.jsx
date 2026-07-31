import { useState } from 'react';
import { ChevronIcon } from './Icons.jsx';
import { WORKOUT_GROUPS, workoutToken } from '../lib/profile.js';

/**
 * Modeled on DiningPicker's grouped-card pattern, but deliberately a separate
 * component rather than a generalization of it: 3 of the 5 workout groups (Rec
 * Center, RockWell, NEST) have no sub-options and behave as a plain toggle row,
 * where DiningPicker's groups are uniformly expandable. Touching DiningPicker to
 * unify both shapes would be a bigger, unrelated refactor for no benefit here.
 */
export function WorkoutPreferencePicker({ selected, onChange }) {
  const [open, setOpen] = useState(() => new Set());

  const toggleOpen = (id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleToken = (token) =>
    onChange(selected.includes(token) ? selected.filter((t) => t !== token) : [...selected, token]);

  return (
    <div className="space-y-2.5">
      {WORKOUT_GROUPS.map((group) => {
        if (!group.options) {
          const on = selected.includes(group.id);
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => toggleToken(group.id)}
              className="ios-press flex w-full items-center gap-3 rounded-[16px] bg-card px-4 py-3 text-left"
            >
              <span
                className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.6px] text-white transition-colors ${
                  on ? 'border-ios-blue bg-ios-blue' : 'border-label-3'
                }`}
              >
                {on ? '✓' : ''}
              </span>
              <span className="text-[17px] font-medium text-label">{group.name}</span>
            </button>
          );
        }

        const tokens = group.options.map((o) => workoutToken(group.id, o));
        const chosen = tokens.filter((t) => selected.includes(t));
        const isOpen = open.has(group.id);

        return (
          <div key={group.id} className="overflow-hidden rounded-[16px] bg-card">
            <button
              type="button"
              onClick={() => toggleOpen(group.id)}
              className="ios-press flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="min-w-0">
                <span className="block text-[17px] font-medium text-label">{group.name}</span>
                <span className="mt-0.5 block text-[12px] text-label-2">
                  {chosen.length ? `${chosen.length} of ${tokens.length} selected` : 'Tap to choose'}
                </span>
              </span>
              <ChevronIcon
                className="shrink-0 text-label-3 transition-transform duration-300"
                style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transitionTimingFunction: 'var(--ease-ios)' }}
              />
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr', transitionTimingFunction: 'var(--ease-ios)' }}
            >
              <div className="overflow-hidden">
                <div className="flex flex-wrap gap-2 border-t border-separator/50 p-3">
                  {group.options.map((option) => {
                    const token = workoutToken(group.id, option);
                    const on = selected.includes(token);
                    return (
                      <button
                        key={token}
                        type="button"
                        onClick={() => toggleToken(token)}
                        className={`ios-press-scale rounded-full px-3.5 py-[7px] text-[14px] font-medium transition-colors ${
                          on ? 'bg-ios-blue text-white' : 'bg-fill text-label'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
