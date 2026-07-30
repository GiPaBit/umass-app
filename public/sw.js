/**
 * App-shell service worker.
 *
 * The previous version cached `/index.html` but not the hashed JS bundle it
 * points at, so opening with the server unreachable produced a blank page —
 * HTML with no script. This one refuses to serve a cached page unless the
 * matching build assets are cached too, and it versions itself per build.
 *
 * API responses are never cached here; freshness is handled in src/lib/api.js,
 * which keeps a per-endpoint snapshot and marks it stale when it falls back.
 */
const VERSION = 'v4';
const SHELL = `umass-shell-${VERSION}`;

// Served from "/" self-hosted and from "/umass-app/" on GitHub Pages. Everything cached
// here is relative to wherever the worker was registered, so derive that from the
// worker's own URL rather than templating this file at build time — it is copied out of
// public/ verbatim and never sees Vite's `base`.
const BASE = new URL('./', self.location).pathname;
const SHELL_URL = `${BASE}index.html`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // Pull the built asset URLs out of index.html rather than hard-coding
      // hashed filenames that change every build.
      const res = await fetch(SHELL_URL, { cache: 'reload' });
      const html = await res.text();
      // Vite rewrites these with its `base`, so they stay root-absolute at any base.
      const assets = [...html.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);

      await cache.put(SHELL_URL, new Response(html, { headers: res.headers }));
      await cache.addAll([
        ...new Set([...assets, `${BASE}manifest.webmanifest`, `${BASE}icons/icon-192.png`]),
      ]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Google, images: straight to the network
  if (url.pathname.startsWith('/api/')) return; // always live

  // Navigations: network first, cached shell only as a fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(SHELL_URL, copy));
          return res;
        })
        .catch(async () => (await caches.match(SHELL_URL)) || Response.error()),
    );
    return;
  }

  // Static assets: cache first, refill in the background.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
