const FEATURES = [
  { color: '#A0162A', label: 'Canvas', sub: 'assignments, synced automatically' },
  { color: '#D9A441', label: 'Dining', sub: "today's menus, every hall" },
  { color: '#71856A', label: 'Rec & Fitness', sub: 'hours and classes' },
  { color: '#5C7285', label: 'Campus Events', sub: "what's on today" },
  { color: '#7A5063', label: 'Sports', sub: 'UMass game schedule' },
];

/**
 * First-launch brand moment, shown once before the questionnaire. Fixed
 * maroon/cream palette rather than the app's own theme tokens — none of the
 * selectable themes are close to it, and this screen exists to introduce that
 * identity before the person has picked a theme at all.
 */
export function WelcomeScreen({ onDone }) {
  return (
    <div
      className="screen-enter flex h-full flex-col overflow-hidden"
      style={{ background: '#14100F', color: '#FBF4F0', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="ios-scroll no-scrollbar min-h-0 flex-1 overflow-y-auto px-7 pt-8">
        <img
          src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
          alt=""
          width={64}
          height={64}
          className="fade-up rounded-[16px]"
        />

        <p
          className="mt-5 text-[12px] font-extrabold tracking-[0.14em] uppercase"
          style={{ color: '#EAB1B5' }}
        >
          UMASS
        </p>
        <h1
          className="mt-1.5 text-[38px] leading-[1.05] font-semibold"
          style={{ fontFamily: "'Fraunces', ui-serif, Georgia, serif" }}
        >
          All‑In‑One App
        </h1>
        <p className="mt-3.5 text-[14.5px] leading-[1.55]" style={{ color: '#9C9188' }}>
          Canvas, Dining, Group Fitness, Sports, and Campus Events. All In One App
        </p>
        <p className="mt-4 pb-6 text-[13px] font-bold opacity-70">
          Built by a UMass student, for UMass students.
        </p>
      </div>

      <div className="shrink-0 overflow-hidden border-y py-[18px]" style={{ borderColor: 'rgba(237,230,214,0.08)' }}>
        <div className="ticker-track flex w-max gap-2.5">
          {[...FEATURES, ...FEATURES].map((f, i) => (
            <div
              key={i}
              className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5"
              style={{ background: '#1C1613', border: '1px solid rgba(237,230,214,0.08)' }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: f.color }} />
              <span className="text-[13px] font-extrabold whitespace-nowrap">{f.label}</span>
              <span className="text-[12px] whitespace-nowrap" style={{ color: '#9C9188' }}>
                {f.sub}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-7 pt-5" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>
        <p className="mb-3.5 text-center text-[11px] leading-[1.4]" style={{ color: '#9C9188' }}>
          Independent student project, not affiliated with UMass Amherst.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="ios-press-scale w-full rounded-[16px] py-[17px] text-[16px] font-extrabold"
          style={{ background: '#A0162A', color: '#FBF4F0' }}
        >
          Get started
        </button>
      </div>
    </div>
  );
}
