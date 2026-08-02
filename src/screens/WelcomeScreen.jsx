const FEATURES = [
  { color: '#A0162A', label: 'Canvas', sub: 'assignments, synced automatically' },
  { color: '#D9A441', label: 'Dining', sub: "today's menus, every hall" },
  { color: '#71856A', label: 'Rec & Fitness', sub: 'hours and classes' },
  { color: '#5C7285', label: 'Campus Events', sub: "what's on today" },
  { color: '#7A5063', label: 'Sports', sub: 'UMass game schedule' },
];

/**
 * First-launch brand moment, shown once before the questionnaire. Uses the
 * app's own theme tokens (the default "UMass" theme is this exact maroon/cream
 * palette) rather than hardcoded hex, so it follows the user's light/dark mode
 * choice like every other screen.
 */
export function WelcomeScreen({ onDone }) {
  return (
    <div
      className="screen-enter flex h-full flex-col overflow-hidden bg-bg text-label"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="ios-scroll no-scrollbar min-h-0 flex-1 overflow-y-auto px-7 pt-8">
        <img
          src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
          alt=""
          width={64}
          height={64}
          className="fade-up rounded-[16px]"
        />

        <p className="mt-5 text-[12px] font-extrabold tracking-[0.14em] text-ios-indigo uppercase">
          UMASS
        </p>
        <h1
          className="mt-1.5 text-[38px] leading-[1.05] font-semibold"
          style={{ fontFamily: "'Fraunces', ui-serif, Georgia, serif" }}
        >
          All‑In‑One App
        </h1>
        <p className="mt-3.5 text-[14.5px] leading-[1.55] text-label-2">
          Canvas, Dining, Group Fitness, Sports, and Campus Events. All In One App
        </p>
        <p className="mt-4 pb-6 text-[13px] font-bold opacity-70">
          Built by a UMass student, for UMass students.
        </p>
      </div>

      <div className="border-separator/60 shrink-0 overflow-hidden border-y py-[18px]">
        <div className="ticker-track flex w-max gap-2.5">
          {[...FEATURES, ...FEATURES].map((f, i) => (
            <div
              key={i}
              className="border-separator/60 flex shrink-0 items-center gap-2 rounded-full border bg-card px-4 py-2.5"
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: f.color }} />
              <span className="text-[13px] font-extrabold whitespace-nowrap">{f.label}</span>
              <span className="text-[12px] whitespace-nowrap text-label-2">{f.sub}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-7 pt-5" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>
        <p className="mb-3.5 text-center text-[11px] leading-[1.4] text-label-2">
          Independent student project, not affiliated with UMass Amherst.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="ios-press-scale w-full rounded-[16px] bg-ios-blue py-[17px] text-[16px] font-extrabold text-white"
        >
          Get started
        </button>
      </div>
    </div>
  );
}
