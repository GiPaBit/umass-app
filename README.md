# UMass All-In-One

A personal, mobile-first PWA that puts Canvas assignments, dining, rec and campus
events behind one iOS-style interface. Single user, no accounts, no database.

---

## Quick start

```bash
npm install && npm run dev
```

Then open `http://localhost:5173`. To try it on your phone while developing, the
dev server binds to your LAN — visit `http://<your-mac-ip>:5173`.

> **Note:** Node is installed at `~/.local/node`. If `node` is not found in a new
> terminal, run `source ~/.zshrc`.

---

## Where the data comes from

Each source was checked live before any parser was written, preferring
JSON → RSS → structured HTML in that order.

| Feature | Source | Format | Notes |
| --- | --- | --- | --- |
| Campus events | `events.umass.edu/api/2/events` | **Public JSON API** (Localist) | Best source in the app. Paginated, includes photos, categories, tickets. |
| Sports games | `umassathletics.com/calendar.ashx/calendar.rss` | **RSS** (SIDEARM) | The website itself is a JS app, but this feed carries opponent, venue and local start time. |
| Dining menus | `umassdining.com/locations-menus/{hall}/menu` | Structured HTML | Not Nutrislice — it is Drupal. Dishes carry `data-dish-name` plus full nutrition, allergens and diet attributes. |
| Dining hours | Location + category pages | Structured HTML | Category pages render "Today's Hours" per venue, so all cafes and Blue Wall come from two requests. |
| Rec hours | `umass.edu/recwell/facilities/hours-operation` | Structured HTML | `<h2>` facility followed by day/time lines. |
| Canvas | Canvas ICS feed, read via `/api/canvas` | **ICS** | No OAuth. Google Calendar works as an optional alternative. See setup below. |

### Two things worth knowing

- **Dining menus are today-only.** The site ignores a `?date=` parameter and always
  returns the current day, so the UI does not offer date selection.
- **Intramurals are not scraped.** UMass runs them through IMLeagues, which refuses
  server-side requests outright (it returns no response at all, not a 403) and
  publishes no JSON or RSS. The Rec tab therefore shows RecWell's own intramural
  information and deep-links into IMLeagues, which works normally in your phone's
  browser where you are already signed in. Specific games can be pinned with
  Quick Add.

No Instagram or social scraping is included, by design.

---

## Calendars (one time, ~30 seconds, all in-app)

Settings → **Calendars** → **Add a calendar**. The steps for each option are
shown right there, so you never need this file.

**Google Calendar is the one to pick if you want everything in one place.**
Subscribe Google to your Canvas feed once, then give the app your Google
calendar's *secret iCal address* — that single link carries your Canvas
assignments **and** anything you add to Google by hand. No OAuth, no Google
Cloud project, nothing an IT admin can disable.

| Where | What to copy |
| --- | --- |
| Google Calendar | Settings → pick a calendar → **Secret address in iCal format** |
| Canvas | Calendar → **Calendar Feed** (bottom right) |

You can add as many feeds as you like; they merge into one list.

> **Treat these links like passwords.** They are unguessable but
> unauthenticated — anyone holding one can read that calendar. They are stored
> only in this browser and POSTed (never in a query string) to the app's own
> `/api/canvas` route. Canvas has a "Reset Feed Link" button, and Google has
> "Reset" next to the secret address, if one ever leaks.

## Canvas setup detail

Canvas has no public API for personal apps, but it publishes your assignments as
an ICS calendar feed. The app reads that feed directly — **no Google account, no
OAuth, nothing an IT admin can disable.**

1. **In Canvas:** Calendar → **Calendar Feed** (bottom right) → copy the link.
   It looks like `https://umass.instructure.com/feeds/calendars/user_xxxxx.ics`.
2. **In the app:** Settings (gear, top right of Today) → **Canvas** → paste →
   **Connect**.

That's it. Connect verifies the link by actually fetching it, and tells you how
many items it found.

> **Treat the feed URL like a password.** It is unguessable but unauthenticated —
> anyone holding it can read your calendar. It is stored only in this browser's
> localStorage and is sent only to your own `/api/canvas` route (via POST, so it
> stays out of server logs and browser history). If it ever leaks, use
> **Reset Feed Link** in Canvas to invalidate it.

### Optional: Google Calendar instead

Only worth it if you already read the Canvas feed through Google and prefer that.
It needs a Google Cloud OAuth client, which many Workspace orgs — **umass.edu
included** — disable for student accounts. If Cloud Console is blocked for you,
use the ICS path above; it does the same job.

<details>
<summary>Google setup steps</summary>

1. Subscribe to the Canvas feed in Google Calendar: Other calendars → **+** →
   *From URL* → paste → Add.
2. [console.cloud.google.com](https://console.cloud.google.com) → new project →
   **APIs & Services → Library** → enable *Google Calendar API*.
3. **OAuth consent screen** → External → add your own email as a **Test user**.
4. **Credentials → Create credentials → OAuth client ID → Web application**.
   Authorised JavaScript origins: `http://localhost:5173` and your Vercel URL.
5. ```bash
   cp .env.example .env.local
   # set VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   ```
6. In the app: **Settings → Connect**, then tick which calendars are Canvas.

Scope is `calendar.readonly`; the token lives in localStorage.

</details>

---

## Deploying to Vercel

```bash
npx vercel
```

Nothing to configure — the Canvas feed link is entered in the app itself, not at
build time. (Only if you chose the optional Google path: add
`VITE_GOOGLE_CLIENT_ID` under **Project → Settings → Environment Variables**, add
the deployed origin to the OAuth client's authorised origins, then redeploy.)

On your iPhone: open the URL in Safari → Share → **Add to Home Screen**. It
launches full-screen with no browser chrome.

---

## Project layout

```
api/                      Vercel serverless routes (on-demand fetch + parse)
  canvas.js               POST { feed } -> assignments from the Canvas ICS feed
  dining.js               ?hall=<slug> for a menu, no params for the overview
  events.js               merges every registered event source
  rec.js                  facility hours + intramural/club/fitness info
  _lib/                   parsers and shared fetch helpers (not routed)
    ics.js                RFC 5545 parser (folding, escapes, TZID, all-day)
    events/               one module per event source  <- extension point
src/
  lib/                    data + business logic, no React
  hooks/                  useAsync, useLocalState
  components/             Screen (large title + pull-to-refresh), TabBar, ui
  screens/                one file per tab
dev-api-plugin.js         runs api/*.js as middleware under `vite dev`
```

`src/lib` holds no React, and every screen gets its data through `src/lib/api.js`
or `src/lib/google.js`. Porting to Expo would mean replacing `components/` and
`screens/`, and swapping localStorage for AsyncStorage in `lib/storage.js`.

### Adding an event source

Create a module in `api/_lib/events/` exporting:

```js
export const mySource = {
  id: 'my-source',
  label: 'My Source',
  url: 'https://…',
  async fetchEvents({ days }) {
    return [ /* NormalizedEvent[] */ ];
  },
};
```

A `NormalizedEvent` is `{ id, source, sourceLabel, title, description, start, end,
allDay, location, url, imageUrl, category, categories[], tags[], free,
isUserAdded }`, with ISO timestamps that include an offset. Add it to `SOURCES` in
`api/_lib/events/index.js` — nothing in the UI changes. A source that throws is
reported as a warning banner while everything else still renders.

---

## Local data

Everything the app remembers is in localStorage under the `umass:` prefix:
completed assignments, quick-added events, chosen Canvas calendars, theme, and
the Google token. **Settings → Clear local data** wipes all of it except the
Google connection.

Checking an assignment off is local only — it does not write back to Canvas.
