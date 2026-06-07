// En Plattform — Service Worker
// Håndterer pushvarsler og klikk på varsler, OG app-skall-caching (Offline Lag 1).
// Ligger i /public og serveres på /sw.js.
// Versjonsnummeret kan bumpes for å tvinge oppdatering av service worker i nettleseren.
const SW_VERSION = 'v2'

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE LAG 1 — APP-SKALL-CACHING
// Strategi:
//  • Navigasjon (HTML-sider/SPA-ruter): network-first → fall tilbake til cachet
//    index.html når du er uten nett. Sikrer at nye deploys plukkes opp med nett.
//  • Statiske ressurser fra eget domene (Vite-bundles med hash, ikoner, fonter):
//    cache-first. Hash-navn endres ved ny deploy, så cache-first er trygt.
//  • Alt annet (Supabase-API, kryssdomene, ikke-GET): røres IKKE — går rett til
//    nett som før. Datahenting offline håndteres i Lag 2 (IndexedDB).
// ─────────────────────────────────────────────────────────────────────────────
const SHELL_CACHE = 'ep-shell-' + SW_VERSION
// Minimalt skall som er trygt å pre-cache (faste, kjente navn).
const PRECACHE_URLS = ['/', '/index.html', '/icon-192.png', '/badge-96.png']

// Tolerant pre-cache: én fil som mangler skal ikke avbryte hele installasjonen
// (og dermed risikere å påvirke pushvarsler).
async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE)
  await Promise.allSettled(
    PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
  )
}

// Installer umiddelbart (ikke vent på at gamle faner lukkes)
self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell())
  self.skipWaiting()
})

// Ta kontroll over åpne faner med en gang + rydd bort gamle skall-cacher
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

// Fetch: app-skall-caching. Påvirker bare GET fra eget domene.
self.addEventListener('fetch', (event) => {
  const req = event.request
  // Kun GET — aldri rør POST/PUT/PATCH/DELETE (skriving går alltid til nett)
  if (req.method !== 'GET') return

  let url
  try { url = new URL(req.url) } catch (e) { return }

  // Kun http/https og kun eget domene. Supabase, Resend, CDN-er osv. røres ikke.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return
  if (url.origin !== self.location.origin) return

  // Naviger (last side / SPA-rute): network-first, fall tilbake til cachet skall
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const ferskt = await fetch(req)
          // Oppdater cachet index.html så neste offline-start er fersk
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

  // Statiske ressurser: cache-first, hent fra nett ved miss og lagre for neste gang
  event.respondWith(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      const cachet = await cache.match(req)
      if (cachet) return cachet
      try {
        const ferskt = await fetch(req)
        // Lagre kun gyldige, samme-domene-svar (ikke feil/opaque)
        if (ferskt && ferskt.ok && ferskt.type === 'basic') {
          cache.put(req, ferskt.clone())
        }
        return ferskt
      } catch (e) {
        // Ingen cache og ingen nett — la kallet feile som normalt
        return Response.error()
      }
    })()
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// PUSHVARSLER (uendret)
// ─────────────────────────────────────────────────────────────────────────────

// Mottar push fra server og viser varsel — fungerer selv om appen er lukket
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
    tag: data.tag || undefined,            // samme tag = erstatter forrige varsel i stedet for å stable
    renotify: !!data.tag,
    data: {
      url: data.url || '/',
      link_page: data.link_page || null,
      link_id: data.link_id || null,
    },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Når brukeren trykker på varselet: fokuser åpen fane (og naviger), ellers åpne ny
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const d = event.notification.data || {}
  const targetUrl = d.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          // Fortell appen hvilken side/varsel som skal åpnes (appen lytter på dette)
          client.postMessage({ type: 'NOTIF_CLICK', link_page: d.link_page, link_id: d.link_id })
          return
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    })
  )
})
