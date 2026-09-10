import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readProjectFile(relativePath) {
  return readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8')
}

test('web app manifest is installable and scoped to Couple Book app-v2', async () => {
  const manifest = JSON.parse(await readProjectFile('public/manifest.webmanifest'))
  const indexHtml = await readProjectFile('index.html')

  assert.equal(manifest.name, 'Couple Book')
  assert.equal(manifest.short_name, 'Couple Book')
  assert.equal(manifest.start_url, '/dashboard')
  assert.equal(manifest.scope, '/')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.background_color, '#f7eef0')
  assert.equal(manifest.theme_color, '#5f1934')
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'))
  assert.match(indexHtml, /rel="manifest" href="\/manifest\.webmanifest"/)
  assert.match(indexHtml, /apple-mobile-web-app-capable/)
})

test('service worker caches only app shell assets and bypasses private media and Google APIs', async () => {
  const source = await readProjectFile('public/service-worker.js')

  assert.match(source, /APP_SHELL_URLS/)
  assert.match(source, /\/dashboard/)
  assert.match(source, /STATIC_ASSET_PATTERN/)
  assert.match(source, /PRIVATE_MEDIA_PATTERN/)
  assert.match(source, /firestore\.googleapis\.com/)
  assert.match(source, /www\.googleapis\.com/)
  assert.match(source, /accounts\.google\.com/)
  assert.match(source, /url\.pathname\.startsWith\('\/api\/'\)/)
  assert.match(source, /url\.pathname\.includes\('\/drive\/'\)/)
  assert.doesNotMatch(source, /cache\.put\(request[\s\S]*PRIVATE_MEDIA_PATTERN/)
})

test('service worker registration is production-only and exposes controlled update events', async () => {
  const source = await readProjectFile('src/pwa/registerServiceWorker.js')
  const mainSource = await readProjectFile('src/main.jsx')
  const appSource = await readProjectFile('src/app/App.jsx')

  assert.match(source, /import\.meta\.env\.PROD/)
  assert.match(source, /navigator\.serviceWorker\.register\('\/service-worker\.js'\)/)
  assert.match(source, /SKIP_WAITING/)
  assert.match(source, /couplebook:pwa-update/)
  assert.match(source, /couplebook:pwa-network/)
  assert.match(mainSource, /registerServiceWorker\(\)/)
  assert.match(appSource, /PwaStatus/)
})

test('PWA status UI keeps offline and update copy honest about private media limits', async () => {
  const source = await readProjectFile('src/pwa/PwaStatus.jsx')

  assert.match(source, /A Couple Book update is ready/)
  assert.match(source, /You are offline/)
  assert.match(source, /Drive media, uploads, and fresh Firestore data will wait/)
  assert.match(source, /requestServiceWorkerUpdate/)
  assert.doesNotMatch(source, /offline original-media access/i)
  assert.doesNotMatch(source, /Google Drive works without internet/i)
})
