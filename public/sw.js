/*
 * The house's service worker: what a phone keeps, so a second visit opens
 * from the phone itself instead of across a cellular network.
 *
 *   pages        always asked for fresh (they carry the catalogue: a price,
 *                a size sold out); the phone's last copy only when there is
 *                no network at all
 *   scripts,     kept for good: each is named for its contents, so a changed
 *   styles,      one is a new name (and the site's fonts never change)
 *   fonts
 *   photographs  shown from the phone's copy at once, and refreshed behind
 *                it, so a replaced photograph arrives on the next visit
 *
 * Never touched: the admin, the API, share cards, films (a phone fetches a
 * film in pieces, which a cache would only get in the way of), and anything
 * but a plain GET from the site itself. Registered by src/main.jsx, only
 * where the site is served by its own server.
 */
const VERSION = 'hs-1'
const PAGES = `${VERSION}-pages`
const KEPT = `${VERSION}-kept`
const PHOTOS = `${VERSION}-photos`
// how many of each a phone holds on to; the oldest go first
const LIMIT = { [PAGES]: 16, [KEPT]: 80, [PHOTOS]: 200 }

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (!name.startsWith(`${VERSION}-`)) await caches.delete(name)
      // the page is asked for while this worker is still waking, not after
      await self.registration.navigationPreload?.enable().catch(() => {})
      await self.clients.claim()
    })(),
  )
})

const usable = (res) => res && res.ok && res.type === 'basic'

async function keep(name, req, res) {
  const cache = await caches.open(name)
  await cache.put(req, res)
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - LIMIT[name]; i++) await cache.delete(keys[i])
}

/** A page: from the network, always; the last copy only when there is none. */
async function page(event) {
  const req = event.request
  try {
    const res = (await event.preloadResponse) || (await fetch(req))
    if (usable(res)) event.waitUntil(keep(PAGES, req, res.clone()))
    return res
  } catch {
    const cache = await caches.open(PAGES)
    return (await cache.match(req)) || (await cache.match('/')) || Response.error()
  }
}

/** Never changes under its name: the phone's copy, once it has one. */
async function kept(event) {
  const cached = await caches.match(event.request)
  if (cached) return cached
  const res = await fetch(event.request)
  if (usable(res)) event.waitUntil(keep(KEPT, event.request, res.clone()))
  return res
}

/** May change under its name: the phone's copy at once, and a fresh one fetched behind it. */
async function photo(event) {
  const cached = await caches.match(event.request)
  const fresh = fetch(event.request).then((res) => {
    if (usable(res)) return keep(PHOTOS, event.request, res.clone()).then(() => res)
    return res
  })
  if (cached) {
    event.waitUntil(fresh.catch(() => {}))
    return cached
  }
  return fresh
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || req.headers.has('range')) return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  const path = url.pathname
  if (/^\/(admin|api|share|film)(\/|$)/.test(path) || path === '/sw.js' || /\.(mp4|webm|m4v|mov)$/.test(path)) return

  if (req.mode === 'navigate') return event.respondWith(page(event))
  if (/^\/(assets|fonts)\//.test(path) || path.startsWith('/media/')) return event.respondWith(kept(event))
  if (/\.(webp|avif|jpe?g|png|svg)$/.test(path)) return event.respondWith(photo(event))
})
