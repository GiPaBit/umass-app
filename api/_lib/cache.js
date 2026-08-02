// Tiny in-memory TTL cache + concurrent-fetch de-dupe, shared by api/_lib/*
// modules that talk to upstream sites. Lives for the process's lifetime: on
// Docker self-host that's the whole container's life (reliable); on Vercel
// it's per warm container, reset on cold start (best-effort, not guaranteed —
// still a real reduction in scrape volume). No disk, no KV, no database —
// matches this project's Node-built-ins-only backend policy.
//
// Cutting scrape volume matters here because this API is a public proxy that
// re-fetches upstream (umassdining.com, umass.edu/recwell, etc.) on every
// request with no caching at all otherwise — a spike in app usage looks to
// those sites like a spike in bot traffic, which risks getting the app's IP
// blocked.

const store = new Map(); // key -> { value?, expiresAt, promise? }

/**
 * Returns the cached value for `key` if still fresh, otherwise calls
 * `fetcher()`, caches the settled result for `ttlMs`, and returns it.
 * Concurrent calls for the same key while a fetch is in flight share that one
 * in-flight promise rather than each kicking off their own upstream request.
 * A rejected fetch is never cached — the entry is removed immediately so the
 * next call retries against the upstream.
 */
export function getOrFetch(key, ttlMs, fetcher) {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && (hit.promise || hit.expiresAt > now)) {
    return hit.promise || Promise.resolve(hit.value);
  }

  const promise = Promise.resolve()
    .then(fetcher)
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .catch((err) => {
      store.delete(key);
      throw err;
    });

  store.set(key, { promise, expiresAt: 0 });
  return promise;
}

/** TTL presets, named by real-world change frequency of the upstream source. */
export const TTL = {
  RARE: 12 * 60 * 60 * 1000, // 12h — hall/rec hours-of-operation: changes maybe a few times a semester
  DAILY: 60 * 60 * 1000, // 1h — daily menus / "today's hours" retail listings
  EVENTS: 20 * 60 * 1000, // 20min — campus/sports events, expected near-real-time
};
