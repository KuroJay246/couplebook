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
    ['/favorites', '/plans', '/contract'],
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
  const brandSource = await readSource('../components/BrandMark.jsx')

  assert.match(routeConfigSource, /ROUTE_GROUPS/)
  assert.match(routeConfigSource, /navLabel: 'Home'/)
  assert.match(routeConfigSource, /navLabel: 'Story'/)
  assert.match(routeConfigSource, /navLabel: 'Album'/)
  assert.match(routeConfigSource, /navLabel: 'Us'/)
  assert.match(shellSource, /Couple Book/)
  assert.match(brandSource, /Private memory archive/)
  assert.match(shellSource, /mobile-tab-bar/)
  assert.match(shellSource, /Navigation menu/)
  assert.match(shellSource, /Shared archive/)
  assert.match(shellSource, /desktopNavGroups/)
  assert.match(shellSource, /Add Memory/)
  assert.match(shellSource, /Sign out/)
  assert.match(shellSource, /Keepsakes/)
})

test('shared states and login shell keep the Event Hub-family framing explicit', async () => {
  const loginSource = await readSource('../pages/LoginPage.jsx')
  const loadingSource = await readSource('../components/LoadingState.jsx')
  const errorSource = await readSource('../components/ErrorState.jsx')
  const pageLayoutSource = await readSource('../components/PageLayout.jsx')

  assert.match(loginSource, /Open the book kept between the two of you\./)
  assert.match(loginSource, /Enter Couple Book/)
  assert.match(loginSource, /Approved accounts only/)
  assert.match(loginSource, /BrandMark/)
  assert.match(loadingSource, /SharedLoadingState/)
  assert.match(errorSource, /SharedErrorState/)
  assert.match(pageLayoutSource, /EditorialEmptyState/)
  assert.doesNotMatch(pageLayoutSource, /PlaceholderPage/)
})

test('shared shell styles use the Event Hub-family token set adapted to Couple Book', async () => {
  const mainSource = await readSource('../main.jsx')
  const tokensSource = await readSource('../styles/tokens.css')
  const navigationSource = await readSource('../styles/navigation.css')

  assert.match(mainSource, /import '\.\/styles\/tokens\.css'/)
  assert.match(mainSource, /import '\.\/styles\/shell\.css'/)
  assert.match(mainSource, /import '\.\/styles\/navigation\.css'/)
  assert.match(tokensSource, /--cb-color-bg:/)
  assert.match(tokensSource, /--cb-color-primary:/)
  assert.match(navigationSource, /mobile-tab-bar/)
  assert.match(navigationSource, /safe-area-inset-bottom/)
  assert.doesNotMatch(tokensSource, /--paper:/)
})
