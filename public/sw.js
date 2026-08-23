// En Plattform — Service Worker
// Håndterer pushvarsler og klikk på varsler, OG app-skall-caching (Offline Lag 1),
// OG bilde-caching av Supabase storage (Offline — bilder offline).
// Ligger i /public og serveres på /sw.js.
//
// PRECACHE-LISTA GENERERES VED BYGG. Vite gir bundlen et innholdshash-navn ved
// hver build, og denne fila er statisk — den kan umulig kjenne navnet på forhånd.
// scripts/lag-sw.mjs bytter derfor ut de to markørene under med de faktiske
// filnavnene fra dist/ og en build-id utledet av selve lista.
//
// Markørene er gyldig JS også UERSTATTET, så `npm run dev` fungerer som før: da
// faller vi tilbake til bare skallet, uten bundle.
//
// Sidegevinsten er at fila endrer bytes ved hver deploy der bundlen endres — og
// det er nettopp det som får nettleseren til å installere service workeren på
// nytt. Med en statisk liste skjedde det aldri.
const BUILD_ID = 'EP_BUILD_ID'
const PRECACHE_JSON = 'EP_PRECACHE'

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE LAG 1 — APP-SKALL-CACHING
// ─────────────────────────────────────────────────────────────────────────────
const SHELL_CACHE = 'ep-shell-' + BUILD_ID
const META_CACHE = 'ep-meta'              // slettes aldri — holder rekkefølgen på bygg
const BEHOLD_GENERASJONER = 2

const PRECACHE_URLS = (() => {
  try {
    const liste = JSON.parse(PRECACHE_JSON)
    if (Array.isArray(liste) && liste.length) return liste
  } catch (e) { /* ikke erstattet — utviklingsmodus */ }
  return ['/', '/index.html']
})()

// / og /index.html MÅ hentes ferskt: de er ikke hashet, og en foreldet index.html
// peker på en bundle som ikke finnes lenger. De hashede filene er uforanderlige,
// så der lar vi HTTP-cachen svare — ellers lastes bundlen (3,6 MB) ned to ganger
// ved hver install: én gang av siden, én gang av oss.
function precacheForesporsel(url) {
  const maaVaereFersk = url === '/' || url === '/index.html'
  return maaVaereFersk ? new Request(url, { cache: 'reload' }) : new Request(url)
}

async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE)
  await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(precacheForesporsel(url))))
}

// Rekkefølgen på bygg, i en cache som aldri slettes. Uten den kan vi ikke vite
// hvilken skall-cache som er forrige generasjon og hvilke som er eldre — navnene
// alene sier ingenting om alder.
async function huskBygg(id) {
  const meta = await caches.open(META_CACHE)
  let liste = []
  try {
    const r = await meta.match('/__bygg')
    if (r) liste = await r.json()
  } catch (e) { liste = [] }
  if (!Array.isArray(liste)) liste = []
  liste = [id, ...liste.filter((x) => x !== id)].slice(0, 8)
  await meta.put('/__bygg', new Response(JSON.stringify(liste), { headers: { 'Content-Type': 'application/json' } }))
  return liste
}

// Oppryddingen ligger i INSTALL, ikke i activate. Grunnen: skipWaiting() gjør at
// den nye service workeren overtar umiddelbart, mens brukere fortsatt kan ha den
// gamle siden åpen og lese assets fra forrige cache. Slettet vi den ved activate,
// ville de forsvunnet under beina på dem midt i arbeidet.
//
// Ved å rydde i install og beholde de to siste generasjonene, får forrige bygg
// leve til det er to deploys gammelt. Da beholder vi umiddelbare oppdateringer
// OG unngår å dra assets vekk fra noen som er i gang.
async function ryddGamleSkall() {
  const liste = await huskBygg(BUILD_ID)
  const behold = new Set(liste.slice(0, BEHOLD_GENERASJONER).map((id) => 'ep-shell-' + id))
  const navnListe = await caches.keys()
  await Promise.all(
    navnListe
      .filter((navn) => navn.startsWith('ep-shell-') && !behold.has(navn))
      .map((navn) => caches.delete(navn))
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await precacheShell()
    await ryddGamleSkall()
  })())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Skall-cachene ryddes i install, ikke her — se ryddGamleSkall().
  event.waitUntil(self.clients.claim())
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
          // MÅ holdes i live av event.waitUntil. Uten den returnerer vi svaret på
          // neste linje, respondWith innfris, og service workeren har ingen
          // utestående jobb — nettleseren står fritt til å terminere den midt i
          // skrivingen. cache.put er atomisk, så en avbrutt skriving legger igjen
          // INGENTING. Det var nettopp derfor bundlen aldri havnet i cachen: den
          // er 3,6 MB, og klonen må bufres i sin helhet før skrivingen fullføres.
          // Å await-e her i stedet ville forsinket siden med hele skrivingen.
          try { event.waitUntil(cache.put(req, ferskt.clone())) }
          catch (e2) { /* eventet er ikke lenger aktivt — hopp over cachingen */ }
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
