// En Plattform — Service Worker
// Håndterer pushvarsler og klikk på varsler, OG app-skall-caching (Offline Lag 1),
// OG bilde-caching av Supabase storage (Offline — bilder offline).
// Ligger i /public og serveres på /sw.js.
// Versjonsnummeret kan bumpes for å tvinge oppdatering av service worker i nettleseren.
const SW_VERSION = 'v3'

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE LAG 1 — APP-SKALL-CACHING
// ─────────────────────────────────────────────────────────────────────────────
const SHELL_CACHE = 'ep-shell-' + SW_VERSION
const PRECACHE_URLS = ['/', '/index.html', '/icon-192.png', '/badge-96.png']

async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE)
  await Promise.allSettled(
    PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const navnListe = await caches.keys()
      await Promise.all(
        navnListe
          .filter((navn) => navn.startsWith('ep-shell-') && navn !== SHELL_CACHE)
          .map((navn) => caches.delete(navn))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  let url
  try { url = new URL(req.url) } catch (e) { return }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const ferskt = await fetch(req)
          if (ferskt && ferskt.ok) {
            const cache = await caches.open(SHELL_CACHE)
            cache.put('/index.html', ferskt.clone())
          }
          return ferskt
        } catch (e) {
          const cache = await caches.open(SHELL_CACHE)
          const cachet = (await cache.match(req)) || (await cache.match('/index.html')) || (await cache.match('/'))
          if (cachet) return cachet
          return new Response('Du er frakoblet og siden er ikke lagret enda.', {
            status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        }
      })()
    )
    return
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      const cachet = await cache.match(req)
      if (cachet) return cachet
      try {
        const ferskt = await fetch(req)
        if (ferskt && ferskt.ok && ferskt.type === 'basic') {
          cache.put(req, ferskt.clone())
        }
        return ferskt
      } catch (e) {
        return Response.error()
      }
    })()
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE — BILDE-CACHE (Supabase storage)
// Bilder fra Supabase storage (avvik, bildedok, befaring …) ligger på et ANNET
// domene og røres derfor ikke av skall-cachen over. Her caches de slik at de
// vises offline etter at de er sett én gang.
// Strategi: cache-først, med oppfrisking i bakgrunnen (stale-while-revalidate).
// Cache-nøkkel uten query-streng → re-signerte URL-er (avvik bruker signerte
// URL-er med utløp) treffer samme entry selv når tokenet endres.
// Egen fetch-lytter: den eksisterende returnerer for kryssdomene uten å svare,
// så denne kan trygt håndtere storage-bildene uten å kollidere med skall/push.
// ─────────────────────────────────────────────────────────────────────────────
const BILDE_CACHE = 'ep-bilder-v1'
const BILDE_CACHE_MAKS = 200

async function trimBildeCache(cache) {
  try {
    const keys = await cache.keys()
    if (keys.length > BILDE_CACHE_MAKS) {
      const overskudd = keys.length - BILDE_CACHE_MAKS
      for (let i = 0; i < overskudd; i++) await cache.delete(keys[i])
    }
  } catch (e) { /* ignorer */ }
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  if (req.destination !== 'image') return

  let url
  try { url = new URL(req.url) } catch (e) { return }

  if (!url.hostname.endsWith('.supabase.co')) return
  if (!url.pathname.includes('/storage/v1/object/')) return

  const cacheNokkel = new Request(url.origin + url.pathname, { method: 'GET' })

  event.respondWith(
    (async () => {
      const cache = await caches.open(BILDE_CACHE)
      const cachet = await cache.match(cacheNokkel)

      if (cachet) {
        event.waitUntil((async () => {
          try {
            const ferskt = await fetch(req)
            if (ferskt && (ferskt.ok || ferskt.type === 'opaque')) {
              await cache.put(cacheNokkel, ferskt.clone())
              await trimBildeCache(cache)
            }
          } catch (e) { /* offline — behold det cachede */ }
        })())
        return cachet
      }

      try {
        const ferskt = await fetch(req)
        if (ferskt && (ferskt.ok || ferskt.type === 'opaque')) {
          await cache.put(cacheNokkel, ferskt.clone())
          await trimBildeCache(cache)
        }
        return ferskt
      } catch (e) {
        return Response.error()
      }
    })()
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// PUSHVARSLER (uendret)
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: 'En Plattform', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'En Plattform'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/badge-96.png',
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: {
      url: data.url || '/',
      link_page: data.link_page || null,
      link_id: data.link_id || null,
    },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const d = event.notification.data || {}
  const targetUrl = d.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          client.postMessage({ type: 'NOTIF_CLICK', link_page: d.link_page, link_id: d.link_id })
          return
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    })
  )
})
