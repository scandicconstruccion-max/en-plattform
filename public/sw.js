// En Plattform — Service Worker
// Håndterer pushvarsler og klikk på varsler. Ligger i /public og serveres på /sw.js.
// Versjonsnummeret kan bumpes for å tvinge oppdatering av service worker i nettleseren.
const SW_VERSION = 'v1'

// Installer umiddelbart (ikke vent på at gamle faner lukkes)
self.addEventListener('install', () => {
  self.skipWaiting()
})

// Ta kontroll over åpne faner med en gang
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

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
