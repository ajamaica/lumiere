// PredictMe Service Worker
// Version: 1.0.0

const CACHE_NAME = 'predictme-v1'
const STATIC_ASSETS = ['/', '/icon.svg', '/apple-icon.png', '/manifest.json']

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    }),
  )
  // Activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          }),
      )
    }),
  )
  // Take control of all pages immediately
  self.clients.claim()
})

// Fetch event - network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Skip WebSocket requests
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return

  // Skip API requests (network only)
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    return
  }

  // For navigation requests, try network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/')
          })
        }),
    )
    return
  }

  // For static assets, try cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Return cached and update in background
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response)
              })
            }
          })
          .catch(() => {})
        return cached
      }

      // Not in cache, fetch from network
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
    }),
  )
})
