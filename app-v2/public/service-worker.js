const CACHE_VERSION = 'couple-book-app-shell-v1'
const APP_SHELL_CACHE = CACHE_VERSION
const APP_SHELL_URLS = ['/', '/dashboard', '/manifest.webmanifest', '/icons/couple-book-icon.svg', '/icons/couple-book-maskable.svg']
const STATIC_ASSET_PATTERN = /^\/assets\/.+\.(?:css|js)$/i
const PRIVATE_MEDIA_PATTERN = /\.(?:avif|gif|heic|heif|jpe?g|mov|mp4|png|webm|webp)$/i
const NEVER_CACHE_HOSTS = [
  'firestore.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'www.googleapis.com',
  'accounts.google.com',
  'oauth2.googleapis.com',
]

function isSameOrigin(url) {
  return url.origin === self.location.origin
}

function isNavigation(request) {
  return request.mode === 'navigate'
}

function shouldBypass(request) {
  const url = new URL(request.url)
  if (request.method !== 'GET') return true
  if (!isSameOrigin(url)) return true
  if (NEVER_CACHE_HOSTS.includes(url.hostname)) return true
  if (url.pathname.startsWith('/api/')) return true
  if (url.pathname.startsWith('/__/')) return true
  if (url.pathname.includes('/drive/')) return true
  if (PRIVATE_MEDIA_PATTERN.test(url.pathname) && !url.pathname.startsWith('/icons/')) return true
  return false
}

async function cacheAppShell() {
  const cache = await caches.open(APP_SHELL_CACHE)
  await cache.addAll(APP_SHELL_URLS)
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== APP_SHELL_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (shouldBypass(request)) return

  const url = new URL(request.url)

  if (isNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put('/', clone))
          return response
        })
        .catch(async () => {
          const cachedRoot = await caches.match('/')
          if (cachedRoot) return cachedRoot
          return caches.match('/dashboard')
        }),
    )
    return
  }

  if (STATIC_ASSET_PATTERN.test(url.pathname) || APP_SHELL_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        })
      }),
    )
  }
})
