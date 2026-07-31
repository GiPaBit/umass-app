import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  ListGroup,
  Row,
  SectionHeader,
  SegmentedControl,
  Sheet,
  Toggle,
} from '../components/ui.jsx';
import { PreferencesFlow } from './PreferencesFlow.jsx';
import { useLocalState } from '../hooks/useLocalState.js';
import { KEYS, clearAll, usageBytes } from '../lib/storage.js';
import { FEED_KINDS, deleteFeed, listFeeds, makeFeed, maskUrl, saveFeed } from '../lib/feeds.js';
import { getCanvasAssignments } from '../lib/api.js';
import { FONTS, MODES, THEMES, getAppearance, setAppearance } from '../lib/theme.js';
import { getProfile } from '../lib/profile.js';
import { DEFAULT_BRIEF_PREFS, setBriefPrefs } from '../lib/briefPrefs.js';

/**
 * Settings is a short menu rather than one long scroll: each area opens as its
 * own page, so nothing competes for attention.
 */
export function SettingsScreen({ open, onClose }) {
  const [page, setPage] = useState(null);
  const [done, setDone] = useLocalState(KEYS.doneAssignments, {});
  const [quickEvents, setQuickEvents] = useLocalState(KEYS.quickEvents, []);
  const [profileRaw] = useLocalState(KEYS.profile, null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [briefPrefs] = useLocalState(KEYS.briefPrefs, DEFAULT_BRIEF_PREFS);

  useEffect(() => {
    if (!open) setPage(null);
  }, [open]);

  // Leaving the Local Data page shouldn't leave the confirm step armed for next time.
  useEffect(() => {
    if (page !== 'local-data') setConfirmClear(false);
  }, [page]);

  const profile = getProfile();
  const feedCount = listFeeds().length;
  const appearance = getAppearance();
  const themeName = THEMES.find((t) => t.id === appearance.theme)?.name || 'Classic';
  const kb = (usageBytes() / 1024).toFixed(1);

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Settings">
        <div className="pb-10">
          <ListGroup className="mt-2">
            <Row
              title="Appearance"
              subtitle={`${themeName} · ${MODES.find((m) => m.id === appearance.mode)?.name}`}
              onClick={() => setPage('appearance')}
            />
            <Row
              title="Calendars"
              subtitle={feedCount ? `${feedCount} connected` : 'Not connected'}
              onClick={() => setPage('calendars')}
            />
            <Row
              title="Preferences"
              subtitle={
                profile.name
                  ? `${profile.name} · ${(profile.diningFavourites || []).length} places`
                  : 'Name, food, gym and teams'
              }
              onClick={() => setPage('preferences')}
            />
            <Row
              title="Local Data"
              subtitle={`${Object.keys(done).length} completed · ${quickEvents.length} quick-added · ${kb} KB`}
              onClick={() => setPage('local-data')}
              last
            />
          </ListGroup>

          <SectionHeader>Today Brief</SectionHeader>
          <ListGroup>
            <Row
              trailing={
                <Toggle
                  checked={briefPrefs.animate}
                  onChange={(v) => setBriefPrefs({ animate: v })}
                />
              }
            >
              <div className="text-[17px] text-label">Animate typing</div>
              <div className="mt-0.5 text-[13px] text-label-2">
                Off shows the full brief right away, instead of typing it out.
              </div>
            </Row>
            <Row
              last
              trailing={
                <Toggle
                  checked={briefPrefs.showWeekImmediately}
                  onChange={(v) => setBriefPrefs({ showWeekImmediately: v })}
                />
              }
            >
              <div className="text-[17px] text-label">Show week ahead automatically</div>
              <div className="mt-0.5 text-[13px] text-label-2">
                Off brings back the "Look ahead" tap instead of showing both at once.
              </div>
            </Row>
          </ListGroup>

          <p className="px-5 pt-6 text-center text-[12px] leading-[16px] text-label-3">
            Personal build · live from umassdining.com, umass.edu/recwell, events.umass.edu and
            umassathletics.com
          </p>
        </div>
      </Sheet>

      <Sheet open={page === 'appearance'} onClose={() => setPage(null)} title="Appearance">
        <AppearancePage />
      </Sheet>

      <Sheet open={page === 'calendars'} onClose={() => setPage(null)} title="Calendars">
        <FeedsPage />
      </Sheet>

      <Sheet open={page === 'preferences'} onClose={() => setPage(null)} title="Preferences">
        {/* Same questionnaire as first launch, pre-filled with current answers. */}
        <div className="h-[78vh]">
          <PreferencesFlow
            key={String(profileRaw)}
            onDone={() => setPage(null)}
            onCancel={() => setPage(null)}
          />
        </div>
      </Sheet>

      <Sheet open={page === 'local-data'} onClose={() => setPage(null)} title="Local Data">
        <LocalDataPage
          done={done}
          quickEvents={quickEvents}
          kb={kb}
          confirmClear={confirmClear}
          setConfirmClear={setConfirmClear}
          onClear={() => {
            clearAll({ keepAuth: true });
            setDone({});
            setQuickEvents([]);
            setConfirmClear(false);
          }}
        />
      </Sheet>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function LocalDataPage({ done, quickEvents, kb, confirmClear, setConfirmClear, onClear }) {
  return (
    <div className="pb-10">
      <SectionHeader>What's stored</SectionHeader>
      <ListGroup>
        <Row title="Completed assignments" detail={String(Object.keys(done).length)} />
        <Row title="Quick-added events" detail={String(quickEvents.length)} />
        <Row title="Storage used" detail={`${kb} KB`} last />
      </ListGroup>

      <div className="px-4 pt-6">
        {confirmClear ? (
          <div className="rounded-[16px] bg-card p-4">
            <p className="text-[15px] leading-[20px] text-label">
              Clear all check-marks and quick-added events? Your calendars, theme and preferences
              stay.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="gray" className="flex-1" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={onClear}>
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="destructive" className="w-full" onClick={() => setConfirmClear(true)}>
            Clear local data
          </Button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function AppearancePage() {
  const [appearance, setState] = useState(getAppearance);
  const update = (patch) => setState(setAppearance(patch));

  return (
    <div className="pb-10">
      <SectionHeader>Mode</SectionHeader>
      <div className="px-4">
        <SegmentedControl
          options={MODES.map((m) => ({ value: m.id, label: m.name }))}
          value={appearance.mode}
          onChange={(mode) => update({ mode })}
        />
      </div>
      <p className="px-5 pt-2 text-[12px] leading-[16px] text-label-3">
        System follows your iPhone’s light/dark setting.
      </p>

      <SectionHeader>Theme</SectionHeader>
      <div className="grid grid-cols-2 gap-2 px-4">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => update({ theme: theme.id })}
            className={`ios-press-scale flex items-center gap-3 rounded-[14px] bg-card p-3 text-left ring-inset transition-shadow ${
              appearance.theme === theme.id ? 'ring-2 ring-ios-blue' : 'ring-0'
            }`}
          >
            <span className="flex shrink-0 -space-x-1.5">
              {theme.swatch.map((c) => (
                <span
                  key={c}
                  className="h-[18px] w-[18px] rounded-full border border-card"
                  style={{ background: c }}
                />
              ))}
            </span>
            <span className="truncate text-[15px] font-medium text-label">{theme.name}</span>
          </button>
        ))}
      </div>

      <SectionHeader>Font</SectionHeader>
      <ListGroup>
        {FONTS.map((font, i) => (
          <Row
            key={font.id}
            last={i === FONTS.length - 1}
            onClick={() => update({ font: font.id })}
            trailing={
              appearance.font === font.id ? (
                <span className="text-[17px] font-semibold text-ios-blue">✓</span>
              ) : null
            }
          >
            <div className="text-[17px] text-label">{font.name}</div>
            <div className="mt-0.5 text-[13px] text-label-2">{font.hint}</div>
          </Row>
        ))}
      </ListGroup>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function FeedsPage() {
  const [feeds, setFeeds] = useState(listFeeds);
  const [adding, setAdding] = useState(false);

  return (
    <div className="pb-10">
      {feeds.length > 0 && (
        <>
          <SectionHeader>Connected</SectionHeader>
          <ListGroup>
            {feeds.map((feed, i) => (
              <Row
                key={feed.id}
                last={i === feeds.length - 1}
                trailing={
                  <button
                    type="button"
                    onClick={() => setFeeds(deleteFeed(feed.id))}
                    className="ios-press-scale text-[15px] text-ios-red"
                  >
                    Remove
                  </button>
                }
              >
                <div className="flex items-center gap-2">
                  <span className="truncate text-[17px] text-label">{feed.label}</span>
                  <Badge tone={FEED_KINDS[feed.kind]?.tone || 'gray'}>
                    {FEED_KINDS[feed.kind]?.label || 'Calendar'}
                  </Badge>
                </div>
                <div className="mt-0.5 truncate text-[12px] text-label-2">{maskUrl(feed.url)}</div>
              </Row>
            ))}
          </ListGroup>
        </>
      )}

      <div className="px-4 pt-4">
        <Button variant="tinted" className="w-full" onClick={() => setAdding(true)}>
          Add a calendar
        </Button>
      </div>

      {feeds.length === 0 && (
        <p className="px-5 pt-3 text-[13px] leading-[18px] text-label-2">
          Add your Canvas feed for assignments, or a Google Calendar feed to bring across both Canvas
          and anything you add yourself.
        </p>
      )}

      <AddFeedSheet
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={(all) => {
          setFeeds(all);
          setAdding(false);
        }}
      />
    </div>
  );
}

/** Add-a-feed flow with the instructions inline, so the README is never needed. */
function AddFeedSheet({ open, onClose, onSaved }) {
  const [kind, setKind] = useState('google');
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [state, setState] = useState({ status: 'idle', message: null });

  useEffect(() => {
    if (!open) return;
    setKind('google');
    setUrl('');
    setLabel('');
    setState({ status: 'idle', message: null });
  }, [open]);

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
    <Sheet open={open} onClose={onClose} title="Add a calendar">
      <div className="px-4 pt-4 pb-8">
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
              Tip: in Google Calendar, add your Canvas feed once via <strong>Other calendars → + →
              From URL</strong>. Then this one link carries your Canvas assignments <em>and</em> anything
              you add by hand.
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
    </Sheet>
  );
}
