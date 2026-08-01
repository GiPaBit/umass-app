import { useState } from 'react';
import { Button, SegmentedControl } from './ui.jsx';
import { FEED_KINDS, makeFeed, saveFeed } from '../lib/feeds.js';
import { getCanvasAssignments } from '../lib/api.js';

/**
 * The paste-a-calendar-link form (Canvas ICS, or Google's "secret address in
 * iCal format") — the guts of Settings' "Add a calendar" sheet, pulled out so
 * onboarding's calendar-setup step can show the same flow inline, full-screen,
 * without a modal wrapper around it.
 */
export function CalendarFeedForm({ onSaved, defaultKind = 'google' }) {
  const [kind, setKind] = useState(defaultKind);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [state, setState] = useState({ status: 'idle', message: null });

  const spec = FEED_KINDS[kind];

  async function connect() {
    const value = url.trim();
    if (!value) return setState({ status: 'error', message: 'Paste the calendar link first.' });

    setState({ status: 'checking', message: null });
    const feed = makeFeed({ kind, label: label || spec.label, url: value });

    try {
      // Verify by actually fetching it, so a bad paste fails here and not later.
      const items = await getCanvasAssignments([feed]);
      onSaved(saveFeed(feed));
      setState({ status: 'idle', message: `Added — ${items.length} items found.` });
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  }

  return (
    <div>
      <SegmentedControl
        options={[
          { value: 'google', label: 'Google' },
          { value: 'canvas', label: 'Canvas' },
          { value: 'other', label: 'Other' },
        ]}
        value={kind}
        onChange={setKind}
      />

      <div className="mt-5 rounded-[16px] bg-card p-4">
        <h3 className="text-[16px] font-semibold text-label">{spec.title}</h3>
        <ol className="mt-2 space-y-1.5">
          {spec.steps.map((step, i) => (
            <li key={i} className="flex gap-2.5 text-[14px] leading-[19px] text-label-2">
              <span className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-fill text-[11px] font-semibold text-label-2">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {kind === 'google' && (
          <p className="mt-3 rounded-[10px] bg-fill px-3 py-2 text-[13px] leading-[18px] text-label-2">
            Tip: in Google Calendar, add your Canvas feed once via <strong>Other calendars → + → From
            URL</strong>. Then this one link carries your Canvas assignments <em>and</em> anything you add
            by hand.
          </p>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-[16px] bg-card px-4 py-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={spec.placeholder}
          className="w-full bg-transparent text-[15px] text-label placeholder:text-label-3 focus:outline-none"
        />
      </div>

      <div className="mt-3 flex items-center gap-3 overflow-hidden rounded-[16px] bg-card px-4 py-3">
        <span className="w-[64px] shrink-0 text-[15px] text-label-2">Name</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={spec.label}
          className="w-full bg-transparent text-[17px] text-label placeholder:text-label-3 focus:outline-none"
        />
      </div>

      <Button className="mt-5 w-full" onClick={connect} disabled={state.status === 'checking'}>
        {state.status === 'checking' ? 'Checking…' : 'Connect'}
      </Button>

      {state.message && (
        <p
          className={`pt-3 text-center text-[13px] leading-[18px] ${
            state.status === 'error' ? 'text-ios-red' : 'text-ios-green'
          }`}
        >
          {state.message}
        </p>
      )}

      <p className="px-1 pt-4 text-[12px] leading-[16px] text-label-3">
        Treat these links like passwords — anyone with one can read that calendar. They are stored on
        this device only and sent just to this app’s own server to be fetched.
      </p>
    </div>
  );
}
