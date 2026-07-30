import { useState } from 'react';
import { ChevronIcon } from './Icons.jsx';
import { DINING_GROUPS } from '../lib/diningCatalog.js';

/**
 * Grouped picker for dining spots.
 *
 * Tapping a group header selects the group itself. For Blue Wall and the dining
 * halls that means "all of them" — the umbrella is the thing you actually care
 * about. Cafés and Grab 'n Go are scattered, so their header only expands, and
 * you choose individually. Either way the group can be opened to fine-tune.
 */
export function DiningPicker({ selected, onChange }) {
  const [open, setOpen] = useState(() => new Set());

  const toggleOpen = (id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleVenue = (name) =>
    onChange(selected.includes(name) ? selected.filter((v) => v !== name) : [...selected, name]);

  const toggleGroup = (group) => {
    const names = group.venues.map((v) => v.name);
    const allOn = names.every((n) => selected.includes(n));

    if (!group.selectAllOnGroup) {
      // Header is just a disclosure for these — open it and let them choose.
      toggleOpen(group.id);
      return;
    }

    onChange(
      allOn ? selected.filter((v) => !names.includes(v)) : [...new Set([...selected, ...names])],
    );
  };

  return (
    <div className="space-y-2.5">
      {DINING_GROUPS.map((group) => {
        const names = group.venues.map((v) => v.name);
        const chosen = names.filter((n) => selected.includes(n));
        const all = chosen.length === names.length;
        const some = chosen.length > 0 && !all;
        const isOpen = open.has(group.id);

        return (
          <div key={group.id} className="overflow-hidden rounded-[16px] bg-card">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="ios-press flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
              >
                {group.selectAllOnGroup && (
                  <span
                    className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.6px] text-white transition-colors ${
                      all
                        ? 'border-ios-blue bg-ios-blue'
                        : some
                          ? 'border-ios-blue bg-ios-blue/30'
                          : 'border-label-3'
                    }`}
                  >
                    {all ? '✓' : some ? '–' : ''}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block text-[17px] font-medium text-label">{group.name}</span>
                  <span className="mt-0.5 block text-[12px] text-label-2">
                    {chosen.length ? `${chosen.length} of ${names.length} selected` : group.hint}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleOpen(group.id)}
                aria-label={isOpen ? `Collapse ${group.name}` : `Expand ${group.name}`}
                className="ios-press-scale px-4 py-3"
              >
                <ChevronIcon
                  className="text-label-3 transition-transform duration-300"
                  style={{
                    transform: isOpen ? 'rotate(90deg)' : 'none',
                    transitionTimingFunction: 'var(--ease-ios)',
                  }}
                />
              </button>
            </div>

            <div
              className="grid transition-[grid-template-rows] duration-300"
              style={{
                gridTemplateRows: isOpen ? '1fr' : '0fr',
                transitionTimingFunction: 'var(--ease-ios)',
              }}
            >
              <div className="overflow-hidden">
                <div className="flex flex-wrap gap-2 border-t border-separator/50 p-3">
                  {group.venues.map((venue) => {
                    const on = selected.includes(venue.name);
                    return (
                      <button
                        key={venue.name}
                        type="button"
                        onClick={() => toggleVenue(venue.name)}
                        className={`ios-press-scale rounded-full px-3.5 py-[7px] text-[14px] font-medium transition-colors ${
                          on ? 'bg-ios-blue text-white' : 'bg-fill text-label'
                        }`}
                      >
                        {venue.name}
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
