import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { ROUTE_GROUPS, getRoutesByGroup } from '../app/routeConfig.js'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('route registry keeps the final primary and secondary hierarchy explicit', () => {
  assert.deepEqual(
    getRoutesByGroup(ROUTE_GROUPS.primary).map((route) => route.path),
    ['/dashboard', '/timeline', '/gallery', '/profile'],
  )
  assert.deepEqual(
    getRoutesByGroup(ROUTE_GROUPS.shared).map((route) => route.path),
    ['/favorites', '/contract'],
  )
  assert.deepEqual(
    getRoutesByGroup(ROUTE_GROUPS.special).map((route) => route.path),
    ['/birthday', '/valentine', '/confession'],
  )
  assert.deepEqual(
    getRoutesByGroup(ROUTE_GROUPS.utility).map((route) => route.path),
    ['/settings'],
  )
})

test('app shell keeps the refined navigation hierarchy explicit', async () => {
  const shellSource = await readSource('../layout/AppShell.jsx')
  const routeConfigSource = await readSource('../app/routeConfig.js')

  assert.match(routeConfigSource, /ROUTE_GROUPS/)
  assert.match(routeConfigSource, /navLabel: 'Home'/)
  assert.match(routeConfigSource, /navLabel: 'Story'/)
  assert.match(routeConfigSource, /navLabel: 'Gallery'/)
  assert.match(routeConfigSource, /navLabel: 'Us'/)
  assert.match(shellSource, /MemoryBook/)
  assert.match(shellSource, /glass-header/)
  assert.match(shellSource, /mobile-nav-bar/)
  assert.match(shellSource, /sidebar-panel/)
  assert.match(shellSource, /Logout/)
  assert.match(shellSource, /Quick Nav/)
  assert.doesNotMatch(shellSource, /MobileNavigation/)
})

test('shared states and login shell keep the editorial-journal framing explicit', async () => {
  const loginSource = await readSource('../pages/LoginPage.jsx')
  const loadingSource = await readSource('../components/LoadingState.jsx')
  const errorSource = await readSource('../components/ErrorState.jsx')
  const pageLayoutSource = await readSource('../components/PageLayout.jsx')

  assert.match(loginSource, /Open the book kept between the two of you\./)
  assert.match(loginSource, /Enter Couple Book/)
  assert.match(loginSource, /hero-bookplate/)
  assert.match(loadingSource, /Opening the private archive/)
  assert.match(errorSource, /state-badge">Notice</)
  assert.match(pageLayoutSource, /EditorialEmptyState/)
  assert.doesNotMatch(pageLayoutSource, /PlaceholderPage/)
})

test('shared shell styles use the editorial token set and retire the old rose branding', async () => {
  const styleSource = await readSource('../styles/index.css')
  const componentStyleSource = await readSource('../styles/legacy-components.css')

  assert.match(styleSource, /--paper:/)
  assert.match(styleSource, /--paper-deep:/)
  assert.match(styleSource, /--accent-olive:/)
  assert.match(styleSource, /--focus:/)
  assert.match(styleSource, /prefers-reduced-motion: reduce/)
  assert.match(styleSource, /safe-area-inset-bottom/)
  assert.match(componentStyleSource, /page-header--split > \*[\s\S]*width:\s*100%/)
  assert.match(componentStyleSource, /page-title,\s*\.page-subtitle\s*\{[\s\S]*inline-size:\s*100%/s)
  assert.match(componentStyleSource, /page-actions\s*\{\s*width:\s*100%/s)
  assert.match(componentStyleSource, /page-subtitle\s*\{\s*padding-right:\s*0\.5rem/s)
  assert.doesNotMatch(styleSource, /--rose:/)
  assert.doesNotMatch(styleSource, /--rose-deep:/)
  assert.doesNotMatch(styleSource, /--berry:/)
  assert.doesNotMatch(styleSource, /background:\s*linear-gradient\(135deg,\s*var\(--rose\)/)
})
