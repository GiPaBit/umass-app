import { useEffect, useState } from 'react';
import { getInstallPrompt, onInstallPromptChange, promptInstall, isIOS } from '../lib/platform.js';

const IOS_STEPS = [
  'Tap the Share icon in Safari’s toolbar (the square with an arrow).',
  'Scroll down and tap "Add to Home Screen".',
  'Tap "Add" in the top corner.',
];

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v12" strokeLinecap="round" />
      <path d="M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Shown whenever the app is opened outside of standalone mode — the entry
 * point for browser visits, not a one-time interstitial. Same fixed
 * maroon/cream brand treatment as `WelcomeScreen` so browser and installed
 * experiences read as the same product before and after install.
 */
export function InstallScreen({ onContinue }) {
  const [prompt, setPrompt] = useState(() => getInstallPrompt());
  const [installed, setInstalled] = useState(false);
  const ios = isIOS();

  useEffect(() => onInstallPromptChange(() => setPrompt(getInstallPrompt())), []);

  async function install() {
    const choice = await promptInstall();
    if (choice?.outcome === 'accepted') setInstalled(true);
  }

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

        <p className="mt-5 text-[12px] font-extrabold tracking-[0.14em] uppercase" style={{ color: '#EAB1B5' }}>
          UMASS
        </p>
        <h1
          className="mt-1.5 text-[32px] leading-[1.1] font-semibold"
          style={{ fontFamily: "'Fraunces', ui-serif, Georgia, serif" }}
        >
          All‑In‑One App
        </h1>
        <p className="mt-3.5 text-[14.5px] leading-[1.55]" style={{ color: '#9C9188' }}>
          Canvas, dining, rec and campus events — all in one place. Install it once and it lives right
          on your home screen.
        </p>

        <div className="mt-6 rounded-[16px] p-4" style={{ background: '#1C1613' }}>
          {installed ? (
            <p className="text-[15px] font-semibold">Installed — find it on your home screen.</p>
          ) : prompt ? (
            <>
              <h3 className="text-[15px] font-semibold">Install the app</h3>
              <p className="mt-1 text-[13px] leading-[18px]" style={{ color: '#9C9188' }}>
                One tap adds it to your home screen, full-screen, no browser bar.
              </p>
              <button
                type="button"
                onClick={install}
                className="ios-press-scale mt-3.5 w-full rounded-[12px] py-3 text-[15px] font-bold"
                style={{ background: '#A0162A', color: '#FBF4F0' }}
              >
                Install app
              </button>
            </>
          ) : ios ? (
            <>
              <h3 className="text-[15px] font-semibold">Add to your home screen</h3>
              <ol className="mt-2.5 space-y-2">
                {IOS_STEPS.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] leading-[19px]" style={{ color: '#D8CFC8' }}>
                    <span
                      className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                      style={{ background: 'rgba(237,230,214,0.1)' }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {i === 0 && <ShareIcon />}
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="text-[13.5px] leading-[19px]" style={{ color: '#D8CFC8' }}>
              Open this page on your phone to install it — look for "Add to Home Screen" or "Install
              app" in your browser's menu.
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 px-7 pt-5" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>
        <button
          type="button"
          onClick={onContinue}
          className="ios-press-scale w-full py-2.5 text-center text-[15px] font-medium"
          style={{ color: '#9C9188' }}
        >
          Continue in browser
        </button>
      </div>
    </div>
  );
}
