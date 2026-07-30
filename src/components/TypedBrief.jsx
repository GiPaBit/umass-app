import { useEffect, useMemo, useRef, useState } from 'react';
import { segmentsToText } from '../lib/brief.js';

/**
 * Types a segmented brief out character by character.
 *
 * Driven by requestAnimationFrame against a precomputed schedule rather than a
 * setTimeout per character: timers get throttled (and cost a render each), while
 * a time-based loop stays smooth and catches up correctly if the tab is busy.
 *
 * Pacing is deliberately uneven — a beat after sentence punctuation reads far
 * more naturally than a metronome. Text already typed stays tappable, so a link
 * revealed early is usable before the rest finishes.
 */
const CHAR_MS = 18; // ~55 characters a second
const PUNCT_MS = 300; // extra beat after . ! ?
const COMMA_MS = 110; // shorter beat after , ; —
const LEAD_IN_MS = 240;

export function TypedBrief({ segments, onNavigate, animate = true, onSkip, onComplete, className = '' }) {
  const fullText = useMemo(() => segmentsToText(segments), [segments]);

  /** Cumulative time at which each character should appear. */
  const schedule = useMemo(() => {
    const out = new Array(fullText.length);
    let t = LEAD_IN_MS;
    for (let i = 0; i < fullText.length; i++) {
      out[i] = t;
      const c = fullText[i];
      if ('.!?'.includes(c) && fullText[i + 1] === ' ') t += PUNCT_MS;
      else if (',;—–'.includes(c)) t += COMMA_MS;
      else t += CHAR_MS;
    }
    return out;
  }, [fullText]);

  const [shown, setShown] = useState(animate ? 0 : fullText.length);
  const raf = useRef(0);

  useEffect(() => {
    // Animating a page nobody is looking at just means finding it blank on
    // return — rAF is paused while hidden, so show the finished text instead.
    if (!animate || document.hidden) {
      setShown(fullText.length);
      return undefined;
    }

    setShown(0);
    let start;
    let cursor = 0; // keeps the per-frame scan O(1) amortised

    const tick = (now) => {
      if (start === undefined) start = now;
      const elapsed = now - start;
      while (cursor < schedule.length && schedule[cursor] <= elapsed) cursor += 1;
      setShown(cursor);
      if (cursor < schedule.length) raf.current = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf.current);
        setShown(fullText.length);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    raf.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fullText, schedule, animate]);

  const done = shown >= fullText.length;

  // Fires once whether typing finished naturally or was skipped — either way
  // the text is now fully on screen.
  useEffect(() => {
    if (done) onComplete?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, fullText]);

  const skip = () => {
    cancelAnimationFrame(raf.current);
    setShown(fullText.length);
    onSkip?.();
  };

  // Walk the segments, revealing only as much of each as has been "typed".
  let consumed = 0;
  const rendered = segments.map((segment, i) => {
    const start = consumed;
    consumed += segment.text.length;
    if (shown <= start) return null;

    const visible = segment.text.slice(0, Math.max(0, shown - start));
    const complete = shown >= consumed;

    if (segment.tab && onNavigate) {
      const activate = () => complete && onNavigate(segment.tab);
      // A <span> rather than a <button>: browsers force buttons to
      // inline-block, so a long link would sit on its own line instead of
      // wrapping through the prose. role/tabIndex keep it operable.
      return (
        <span
          key={i}
          role="link"
          tabIndex={complete ? 0 : -1}
          onClick={activate}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              activate();
            }
          }}
          className="cursor-pointer font-semibold text-ios-blue underline decoration-ios-blue/30 underline-offset-[3px]"
        >
          {visible}
        </span>
      );
    }

    return (
      <span key={i} className={segment.strong ? 'font-semibold text-label' : undefined}>
        {visible}
      </span>
    );
  });

  return (
    <div className={`brief-text ${className}`}>
      <p className="text-[19px] leading-[27px] text-label-2">
        {rendered}
        {!done && <span className="caret" aria-hidden="true" />}
      </p>

      {!done && (
        <button
          type="button"
          onClick={skip}
          className="ios-press-scale mt-2.5 rounded-full bg-fill px-3 py-[5px] text-[12px] font-medium text-label-2"
        >
          Skip
        </button>
      )}

      {/* Screen readers get the finished text at once, not one letter at a time. */}
      <span className="sr-only" aria-live="polite">
        {done ? fullText : ''}
      </span>
    </div>
  );
}
