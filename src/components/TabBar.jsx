import { AssignmentsIcon, DiningIcon, EventsIcon, RecIcon, TodayIcon } from './Icons.jsx';

export const TABS = [
  { id: 'today', label: 'Today', Icon: TodayIcon },
  { id: 'assignments', label: 'Assignments', Icon: AssignmentsIcon },
  { id: 'dining', label: 'Dining', Icon: DiningIcon },
  { id: 'rec', label: 'Rec & Sports', Icon: RecIcon },
  { id: 'events', label: 'Events', Icon: EventsIcon },
];

/** Frosted bottom tab bar sitting above the home indicator. */
export function TabBar({ active, onChange, badges = {}, floating = false }) {
  return (
    <nav
      className={
        floating
          ? 'ios-blur absolute inset-x-6 bottom-[max(env(safe-area-inset-bottom),12px)] z-30 rounded-full shadow-lg'
          : 'ios-blur pb-safe absolute inset-x-0 bottom-0 z-30 border-t border-separator/70'
      }
    >
      <div className="flex">
        {TABS.map(({ id, label, Icon }) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-label={label}
              aria-current={selected ? 'page' : undefined}
              className="relative flex flex-1 flex-col items-center gap-[2px] pt-[7px] pb-[3px]"
            >
              <span
                className={`relative transition-colors duration-200 ${
                  selected ? 'text-ios-blue' : 'text-label-2'
                }`}
              >
                <Icon filled={selected} width={25} height={25} />
                {badges[id] > 0 && (
                  <span className="absolute -top-[3px] -right-[7px] min-w-[16px] rounded-full bg-ios-red px-[4px] text-center text-[10px] leading-[16px] font-semibold text-white">
                    {badges[id] > 99 ? '99+' : badges[id]}
                  </span>
                )}
              </span>
              <span
                className={`text-[10px] leading-[12px] font-medium transition-colors duration-200 ${
                  selected ? 'text-ios-blue' : 'text-label-2'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
