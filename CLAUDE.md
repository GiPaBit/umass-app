# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repo.

## What this is

Personal, mobile-first PWA (single user, no accounts, no database) — puts Canvas
assignments, dining, rec and campus events behind one iOS-style interface. React 19 +
Vite frontend, tiny Node API layer proxies/parses upstream sources, no framework, no
database.

## Commands

Everything runs via Docker Compose — don't run `npm`/`node` directly on host.

```bash
docker compose up               # local dev: docker-compose.override.yml bind-mounts source and
                                 # runs vite dev in the container, hot reload on :5173
docker compose up -d            # prod: needs .env with DOMAIN set + COMPOSE_PROFILES=prod;
                                 # brings up app + Caddy (automatic Let's Encrypt TLS)
docker compose build            # build the image locally instead of pulling from GHCR
docker compose exec app <cmd>   # run a one-off command (e.g. a script) inside the running container
```

`echo "DOMAIN=localhost" > .env` first if no `.env` exists — Compose requires var even
though Caddy never starts in dev (gated behind `prod` profile).

No lint script, no test suite, no typechecker in this repo — don't invent commands for
them.

## Architecture

**Three deployment targets share one set of `api/*.js` handlers**: Vercel serverless
functions, self-hosted Docker/Node server, and (frontend-only) GitHub Pages backed by
separately-hosted API. `vite dev` and production server (`server/index.js`) both
dispatch through `server/api-router.js`, single "`/api/<name>` → `api/<name>.js`"
implementation — why a route can't behave differently between dev, Docker and Vercel.
In dev, `dev-api-plugin.js` mounts same router into Vite as middleware.

```
api/                 HTTP routes: on-demand fetch + parse, Node built-ins only, no framework
  canvas.js           POST { feed } | { feeds } -> assignments from a Canvas ICS feed
  dining.js           ?hall=<slug> for one hall's menu, no params for the overview
  events.js           merges every registered event source
  rec.js               RecWell facility hours + intramural/club/fitness info
  _lib/                parsers and shared helpers (never routed directly — see below)
    ics.js             RFC 5545 parser (folding, escaping, TZID, all-day events)
    safeFetch.js        SSRF-guarded fetch for user-supplied feed URLs (see Security)
    http.js             CORS + JSON response helpers shared by every route
    events/              one module per event source — the extension point for new sources
server/
  index.js            production entrypoint: serves dist/ + mounts api/* (npm start)
  api-router.js        the shared "/api/<name> -> api/<name>.js" dispatcher
src/
  lib/                 data + business logic, deliberately zero React imports
  hooks/               useAsync, useLocalState
  components/           Screen (large title + pull-to-refresh), TabBar, shared ui.jsx
  screens/              one file per tab (Today, Assignments, Dining, Rec, Events, Settings, Onboarding)
dev-api-plugin.js      mounts server/api-router.js into `vite dev` as middleware
Dockerfile              multi-stage; the runtime stage ships with no node_modules
docker-compose.yml     app + Caddy (automatic Let's Encrypt TLS), gated by COMPOSE_PROFILES=prod
```

Vercel router ignores `_`-prefixed files — why parsers/helpers live under `api/_lib/`
instead of top-level routes — `readdirSync` in `server/api-router.js` filters same way,
so allowlist of valid routes = "what files exist in `api/`", re-read per request (no
restart needed to add route in dev).

**`src/lib` has no React dependency** — every screen fetches through `src/lib/api.js`
(REST) or `src/lib/google.js` (Google Calendar). Deliberate split: porting to
Expo/React Native means replacing `components/` and `screens/`, swapping `localStorage`
for `AsyncStorage` in `src/lib/storage.js`, without touching `src/lib`'s data logic.

**Tabs stay mounted.** `App.jsx` renders all five tab screens simultaneously, toggles
`hidden`/`aria-hidden` rather than unmounting — scroll position and already-fetched data
survive tab switches like native iOS.

**Client-side caching / offline behavior**: `src/lib/api.js` dedupes identical in-flight
GETs (`inFlight` map — matters since every tab mounts at once, independently asks for
own data), snapshots last successful response per endpoint into `localStorage` under
`umass:snapshot:*`. Failed fetch falls back to snapshot, flagged `stale`. Canvas
requests POSTed, never cached/coalesced this way — feed URL itself is the credential.

**Adding new event source**: create module in `api/_lib/events/` exporting object with
`id`, `label`, `url`, `async fetchEvents({ days })` returning `NormalizedEvent[]`
(`{ id, source, sourceLabel, title, description, start, end,
allDay, location, url, imageUrl, category, categories[], tags[], free, isUserAdded }`,
ISO timestamps w/ explicit offset). Register in `SOURCES` in `api/_lib/events/index.js`
— nothing in UI needs to change. Source that throws surfaces as warning banner, rest of
merged feed still renders.

## Data sources (checked live before writing each parser; JSON > RSS > HTML)

| Feature | Source | Format | Notes |
| --- | --- | --- | --- |
| Campus events | `events.umass.edu/api/2/events` | Public JSON (Localist) | |
| Sports games | `umassathletics.com/calendar.ashx/calendar.rss` | RSS (SIDEARM) | opponent, venue, local start time |
| Dining menus | `umassdining.com/locations-menus/{hall}/menu` | Structured HTML (Drupal, not Nutrislice) | `data-dish-name` + nutrition/allergen/diet attrs |
| Dining hours | location + category pages | Structured HTML | two requests cover every cafe + Blue Wall |
| Rec hours | `umass.edu/recwell/facilities/hours-operation` | Structured HTML | `<h2>` facility + day/time lines |
| Canvas | Canvas ICS feed via `/api/canvas` | ICS | no OAuth; optional Google Calendar alternative |

Two known constraints, remember before "fixing" something that looks broken:
- **Dining menus today-only** — site ignores `?date=`, so no date picker in UI, by
  design.
- **Intramurals not scraped.** IMLeagues refuses server-side requests (no response at
  all, not even 403), no JSON/RSS. Rec tab shows RecWell's own intramural info,
  deep-links to IMLeagues instead.

No Instagram/social scraping, by design.

## Security: the SSRF guard

`api/_lib/safeFetch.js` load-bearing, not incidental. API is public fetch proxy — CORS
doesn't gate `curl` — once deployed, anyone can ask server to fetch arbitrary "calendar
feed" URL. `safeFetch` resolves target host, refuses anything not publicly routable
(loopback, RFC1918, link-local incl. `169.254.169.254` cloud-metadata address, IPv6
equivalents), **re-checking on every redirect** — not just initial URL.
`ALLOW_PRIVATE_FEEDS=1` disables this, only ever suggest for feed hosted on user's own
LAN. Any change touching feed-fetching (`canvas.js`, `google.js`, new event sources
hitting arbitrary URLs) must keep going through this guard.

## Environment variables

| Variable | When | Purpose |
| --- | --- | --- |
| `VITE_API_BASE` | build | Where `/api` lives. Empty = same origin (dev, Docker). Only the Pages build sets it. |
| `VITE_GOOGLE_CLIENT_ID` | build | Optional Google OAuth client ID; inlined at build time. |
| `APP_BASE` | build | Vite base path. `/` by default; Pages uses `/<repo>/`. Must be absolute (see the comment in `vite.config.js` about `public/sw.js`'s asset regex). |
| `ALLOWED_ORIGINS` | run | Comma-separated origins allowed to read the API cross-origin. |
| `DOMAIN` | run | Domain Caddy issues a Let's Encrypt cert for (prod profile only). |
| `PORT`, `HOST` | run | Server bind address. Defaults `8080` / `0.0.0.0`. |
| `ALLOW_PRIVATE_FEEDS` | run | `1` to allow calendar feeds on private IPs — LAN use only. |

## Local data & privacy

Everything app remembers lives in `localStorage` under `umass:` prefix: completed
assignments, quick-added events, chosen Canvas calendars, theme, snapshots, Google
token. Checking off assignment is local-only — never writes back to Canvas. Calendar
feed URLs (Canvas ICS link, Google secret iCal address) are unauthenticated bearer
tokens; always POSTed (never query string), never logged — preserve when touching
`src/lib/api.js` or `api/canvas.js`.

## Deployment notes relevant to code changes

- Same `api/*.js` handlers must keep working unmodified across Vercel, Docker,
  `vite dev` — avoid anything Vercel-specific (like relying on `req.body` being
  pre-parsed; `server/api-router.js` deliberately leaves it unparsed since
  `api/canvas.js` reads request stream itself).
- GitHub Pages serves frontend only, can't run `api/*.js`; build fails loudly in CI if
  `VITE_API_BASE` isn't set, rather than shipping silently broken app.
- Production server (`server/index.js`, run inside `app` container) serves `dist/`
  *and* mounts `api/*` on same origin — plain `vite preview` would serve `dist/` with
  no `/api/*`, breaks every tab, so never used here.


# Reminders for the Claude User

These reminders should be very clear and at the bottom of the text so the user sees them. Mark them very visibly with emojis or other special characters.

- Always remind user if something needs to be changed in the vercel backend or settings
- Remind user if something needs to be changed on the GitHub pages backend or settings
- Remind the user to perform a docker compose up or docker force rebuild when testing locally
- Ask the user if the changes should be commited