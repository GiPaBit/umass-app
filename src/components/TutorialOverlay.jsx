import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui.jsx';
import { CloseIcon } from './Icons.jsx';

const SPOTLIGHT_PAD = 8; // px of breathing room between the target and the cutout edge
const BUBBLE_MARGIN = 14; // gap between the spotlight and the speech bubble
const VIEWPORT_MARGIN = 16; // never let the bubble touch the screen edge
const GIVE_UP_MS = 15000; // stop watching for a target that never shows up (falls back to a centered, non-spotlit bubble)

/**
 * Finds and tracks the on-screen rect of `[data-tutorial="target"]`. A
 * `MutationObserver` (rather than a short poll) copes with two different
 * delays: switching tabs toggles `hidden` on an already-mounted pane (see
 * `App.jsx`'s `TabPane`) — near-instant — but the Today brief's own
 * `data-tutorial="brief"` node doesn't mount until its data finishes
 * loading, which can take a few seconds. Until the target is found, the
 * caller still renders a centered, non-spotlit bubble rather than nothing.
 */
function useTutorialTarget(target) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!target) {
      setRect(null);
      return;
    }
    let cancelled = false;
    let ro = null;
    let mo = null;
    let tracking = false;
    let giveUpTimer = null;

    const selector = `[data-tutorial="${target}"]`;

    const startTracking = (el) => {
      tracking = true;
      const update = () => {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      };
      update();
      ro = new ResizeObserver(update);
      ro.observe(el);
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
      mo?.disconnect();
      if (giveUpTimer) clearTimeout(giveUpTimer);
      // Stash for cleanup below.
      cleanupTrack = () => {
        ro?.disconnect();
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
      };
    };
    let cleanupTrack = null;

    const tryFind = () => {
      if (cancelled || tracking) return;
      const el = document.querySelector(selector);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return; // in the DOM but still `hidden`
      el.scrollIntoView({ block: 'nearest' });
      startTracking(el);
    };

    tryFind();
    if (!tracking) {
      mo = new MutationObserver(tryFind);
      mo.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['hidden', 'class'],
      });
      giveUpTimer = setTimeout(() => {
        if (!tracking) setRect(undefined); // give up — signals "show centered, no spotlight"
      }, GIVE_UP_MS);
    }

    return () => {
      cancelled = true;
      mo?.disconnect();
      cleanupTrack?.();
      if (giveUpTimer) clearTimeout(giveUpTimer);
    };
  }, [target]);

  return rect;
}

/**
 * Full-screen coachmark tour: a dimmed backdrop with a spotlight cutout
 * around the current step's target, a speech-bubble callout with Back / Next
 * / Skip, and step dots. Portalled to `<body>` like `Sheet`, above
 * everything else in the app (including the Settings sheet) so it can walk
 * the user through opening it.
 */
export function TutorialOverlay({ steps, stepIndex, onNext, onBack, onSkip }) {
  const step = steps[stepIndex];
  const rect = useTutorialTarget(step?.target);
  const bubbleRef = useRef(null);
  const [bubbleSize, setBubbleSize] = useState({ width: 320, height: 160 });

  useLayoutEffect(() => {
    if (!bubbleRef.current) return;
    const { offsetWidth, offsetHeight } = bubbleRef.current;
    if (!offsetWidth || !offsetHeight) return;
    setBubbleSize((prev) =>
      prev.width === offsetWidth && prev.height === offsetHeight ? prev : { width: offsetWidth, height: offsetHeight },
    );
  });

  if (!step) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const hasSpotlight = rect != null && rect !== undefined;

  // Below the target by default (every current target sits near the top of
  // its screen); flip above only if there genuinely isn't room below.
  let placement = 'below';
  let bubbleTop;
  let arrowLeft = null;
  let bubbleLeft = Math.max(VIEWPORT_MARGIN, (vw - bubbleSize.width) / 2);

  if (hasSpotlight) {
    const spotBottom = rect.top + rect.height + SPOTLIGHT_PAD;
    const spotTop = rect.top - SPOTLIGHT_PAD;
    const roomBelow = vh - spotBottom;
    if (roomBelow < bubbleSize.height + BUBBLE_MARGIN + VIEWPORT_MARGIN && spotTop > bubbleSize.height + BUBBLE_MARGIN) {
      placement = 'above';
      bubbleTop = spotTop - BUBBLE_MARGIN - bubbleSize.height;
    } else {
      bubbleTop = spotBottom + BUBBLE_MARGIN;
    }
    const targetCenter = rect.left + rect.width / 2;
    bubbleLeft = Math.min(
      Math.max(VIEWPORT_MARGIN, targetCenter - bubbleSize.width / 2),
      vw - bubbleSize.width - VIEWPORT_MARGIN,
    );
    arrowLeft = Math.min(Math.max(20, targetCenter - bubbleLeft), bubbleSize.width - 20);
  } else {
    bubbleTop = (vh - bubbleSize.height) / 2;
  }
  bubbleTop = Math.min(Math.max(VIEWPORT_MARGIN, bubbleTop), vh - bubbleSize.height - VIEWPORT_MARGIN);

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Tutorial: ${step.title}`}>
      {/* Backdrop — plain full-screen dim when there's no spotlight target. */}
      <div className="absolute inset-0 bg-black/55" />

      {hasSpotlight && (
        <div
          className="absolute rounded-[18px] transition-[top,left,width,height] duration-200"
          style={{
            top: rect.top - SPOTLIGHT_PAD,
            left: rect.left - SPOTLIGHT_PAD,
            width: rect.width + SPOTLIGHT_PAD * 2,
            height: rect.height + SPOTLIGHT_PAD * 2,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55), 0 0 0 2.5px rgba(10,132,255,0.9)',
          }}
        />
      )}

      <div
        ref={bubbleRef}
        className="fade-up absolute w-[88vw] max-w-[340px] rounded-[18px] bg-card p-4 shadow-2xl"
        style={{ top: bubbleTop, left: bubbleLeft }}
      >
        {arrowLeft != null && (
          <div
            className="absolute h-3 w-3 rotate-45 bg-card"
            style={{
              left: arrowLeft - 6,
              top: placement === 'below' ? -6 : undefined,
              bottom: placement === 'above' ? -6 : undefined,
            }}
          />
        )}

        <div className="flex items-start justify-between gap-2">
          <span className="pt-0.5 text-[12px] font-medium text-label-2">
            {stepIndex + 1} of {steps.length}
          </span>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Skip tutorial"
            className="ios-press-scale -m-1 flex items-center gap-1 p-1 text-[13px] font-medium text-label-2"
          >
            Skip
            <CloseIcon width={14} height={14} />
          </button>
        </div>

        <h2 className="mt-1.5 text-[17px] font-semibold text-label">{step.title}</h2>
        <p className="mt-1 text-[14px] leading-[19px] text-label-2">{step.body}</p>

        <div className="mt-3.5 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= stepIndex ? 'bg-ios-blue' : 'bg-fill'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {stepIndex > 0 && (
            <Button variant="gray" onClick={onBack} className="flex-1">
              Back
            </Button>
          )}
          <Button variant="filled" onClick={onNext} className="flex-1">
            {stepIndex === steps.length - 1 ? 'Done' : 'Next'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
