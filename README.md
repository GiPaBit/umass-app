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
   Authorised JavaScript origins: `http://localhost:5173` plus every deployed
   origin you use (see *Deploying* below).
5. ```bash
   cp .env.example .env.local
   # set VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   ```
6. In the app: **Settings → Connect**, then tick which calendars are Canvas.

Scope is `calendar.readonly`; the token lives in localStorage.

</details>

---

## Deploying

Three targets, all from the same source. **The app is not static** — the four tabs
get their data from `/api/*`, which exists because none of the upstream sites send
CORS headers. Any deployment has to run those routes somewhere.

On your iPhone, whichever you pick: open the URL in Safari → Share → **Add to Home
Screen**. It launches full-screen with no browser chrome.

### Self-hosted with Docker (recommended)

One container serves the built frontend *and* `/api/*` on the same origin, so there
is nothing to configure for CORS. Caddy sits in front and gets a Let's Encrypt
certificate automatically.

```bash
cp .env.example .env      # set DOMAIN, uncomment COMPOSE_PROFILES=prod
docker compose up -d
```

`COMPOSE_PROFILES=prod` is what turns Caddy on. Without it, `docker compose up`
starts only `app` — see *Local dev with Docker* below.

Requirements: `DOMAIN` already resolves to the host, and ports 80 and 443 are
reachable from the internet — Let's Encrypt's HTTP-01 challenge needs port 80.

The image is published to GHCR for `linux/amd64` and `linux/arm64` on every push to
`main`, so a server only ever needs:

```bash
docker compose pull && docker compose up -d
```

To build locally instead: `docker compose build`. To run the production server
without Docker: `npm run build && npm start` (port 8080, override with `PORT`).

### Local dev with Docker

`npm run dev` on the host is the fastest loop and needs nothing below. If you'd
rather keep everything containerized, `docker-compose.override.yml` is picked up
automatically by a plain `docker compose up` (no `-f` flag needed) and points `app`
at a `dev` build stage instead: devDependencies kept, source bind-mounted in, Vite's
dev server on `:5173` with hot reload.

```bash
echo "DOMAIN=localhost" > .env   # placeholder only — Compose requires the variable
                                  # to exist even though caddy never starts in dev
docker compose up
```

Caddy is gated behind the `prod` profile (see above), so this starts only `app`. It
has nothing to do in dev anyway — it exists to get a Let's Encrypt cert for a real
domain, and Vite already binds `0.0.0.0:5173` directly with no TLS involved.

> `npm run preview` builds and then runs that same server. Plain `vite preview`
> is not used here because it serves `dist/` without `api/*`, which makes every
> tab look broken.

### GitHub Pages

Pages hosts the frontend only; it cannot run `api/*.js`. The Pages build therefore
points at a Docker deployment's API over HTTPS.

1. **Settings → Pages → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → Variables** → add
   `VITE_API_BASE` = `https://your-domain` (the Docker deployment). It must be
   `https://` — Pages is HTTPS-only and a browser blocks an `http://` API as mixed
   content. The workflow fails loudly if this is unset.
3. On the server, allow the Pages origin to read the API:
   ```bash
   # in .env
   ALLOWED_ORIGINS=https://<you>.github.io
   ```
   then `docker compose up -d`.

The base path comes from `actions/configure-pages`, so it adapts by itself if a
custom domain is added later.

> The Pages copy and a self-hosted copy are **two independent installs**.
> localStorage is per-origin, so feed URLs, themes and completed assignments do not
> carry across — and neither does anything from an older Vercel origin.

### Vercel

Still supported and unchanged; `vercel.json` runs `api/*` as serverless functions.

```bash
npx vercel
```

Nothing to configure — the Canvas feed link is entered in the app itself, not at
build time.

### Optional: Google Calendar on a new origin

If you use the Google path, add each deployed origin to the OAuth client's
**Authorised JavaScript origins** (`https://<you>.github.io`, `https://your-domain`)
or sign-in fails with an opaque error. Pass the client ID to CI as the repository
variable `VITE_GOOGLE_CLIENT_ID` — it is inlined at build time, so it cannot be set
by an environment variable at run time.

### Environment variables

| Variable | When | Purpose |
| --- | --- | --- |
| `VITE_API_BASE` | build | Where `/api` lives. Empty = same origin (dev, Docker). Only Pages sets it. |
| `VITE_GOOGLE_CLIENT_ID` | build | Optional Google OAuth client ID. |
| `APP_BASE` | build | Vite base path. `/` by default; Pages uses `/<repo>/`. Must be absolute. |
| `ALLOWED_ORIGINS` | run | Comma-separated origins allowed to read the API cross-origin. |
| `DOMAIN` | run | Domain Caddy issues a certificate for. |
| `PORT`, `HOST` | run | Server bind address. Defaults `8080` / `0.0.0.0`. |
| `ALLOW_PRIVATE_FEEDS` | run | Set to `1` only to allow calendar feeds on private IPs (see below). |

> **The API is a fetch proxy, and CORS does not gate `curl`.** Once it is public,
> anyone can ask your server to fetch a calendar URL. `api/_lib/safeFetch.js`
> therefore resolves user-supplied feed hosts and refuses anything that is not
> publicly routable — loopback, RFC1918, link-local (including cloud metadata at
> `169.254.169.254`), and the IPv6 forms that wrap those — re-checking on every
> redirect. `ALLOW_PRIVATE_FEEDS=1` disables that, which you want only for a
> calendar hosted on your own LAN.

---

## Project layout

```
api/                      HTTP routes (on-demand fetch + parse), Node built-ins only
  canvas.js               POST { feed } -> assignments from the Canvas ICS feed
  dining.js               ?hall=<slug> for a menu, no params for the overview
  events.js               merges every registered event source
  rec.js                  facility hours + intramural/club/fitness info
  _lib/                   parsers and shared fetch helpers (not routed)
    ics.js                RFC 5545 parser (folding, escapes, TZID, all-day)
    safeFetch.js          SSRF-guarded fetch for user-supplied feed URLs
    events/               one module per event source  <- extension point
server/
  index.js                production server: serves dist/ + mounts api/*  (npm start)
  api-router.js           the one "/api/<name> -> api/<name>.js" implementation
src/
  lib/                    data + business logic, no React
  hooks/                  useAsync, useLocalState
  components/             Screen (large title + pull-to-refresh), TabBar, ui
  screens/                one file per tab
dev-api-plugin.js         mounts server/api-router.js into `vite dev`
Dockerfile                multi-stage; runtime stage has no node_modules
docker-compose.yml        app + Caddy (automatic TLS)
```

The same `api/*.js` handlers run in all three deployments. `vite dev` and the
production server both route through `server/api-router.js` — one implementation, so a
route cannot behave differently in dev, Docker and Vercel.

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
