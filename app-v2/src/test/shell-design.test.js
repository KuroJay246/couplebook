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
    ['/dashboard', '/gallery', '/profile', '/plans'],
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
    ['/settings', '/update'],
  )
})

test('app shell keeps the refined navigation hierarchy explicit', async () => {
  const shellSource = await readSource('../layout/AppShell.jsx')
  const routeConfigSource = await readSource('../app/routeConfig.js')
  const brandSource = await readSource('../components/BrandMark.jsx')

  assert.match(routeConfigSource, /ROUTE_GROUPS/)
  assert.match(routeConfigSource, /navLabel: 'Home'/)
  assert.doesNotMatch(routeConfigSource, /navLabel: 'Story'|\/timeline|\/story/)
  assert.match(routeConfigSource, /navLabel: 'Album'/)
  assert.match(routeConfigSource, /navLabel: 'Us'/)
  assert.match(routeConfigSource, /navLabel: 'Plans'/)
  assert.match(shellSource, /Couple Book/)
  assert.match(brandSource, /Memories for two/)
  assert.match(shellSource, /mobile-tab-bar/)
  assert.match(shellSource, /Navigation menu/)
  assert.match(shellSource, /desktopNavGroups/)
  assert.match(shellSource, /Sign out/)
  assert.match(shellSource, /Main/)
  assert.doesNotMatch(shellSource.slice(shellSource.indexOf('const desktopNavGroups'), shellSource.indexOf('const mobileMoreGroups')), /'\/birthday'|'\/valentine'|'\/confession'|'\/favorites'/)
  assert.doesNotMatch(shellSource, /currentRoute\.chapter|cb-shell-meta-pill|QuickAddMemory/)
  const desktopNavSource = shellSource.slice(shellSource.indexOf('const desktopNavGroups'), shellSource.indexOf('const mobileMoreGroups'))
  const mobileMoreSource = shellSource.slice(shellSource.indexOf('const mobileMoreGroups'), shellSource.indexOf('function surfaceDisplayName'))
  assert.doesNotMatch(desktopNavSource, /'\/contract'/)
  assert.doesNotMatch(mobileMoreSource, /'\/contract'/)
})

test('shared states and login shell keep the Event Hub-family framing explicit', async () => {
  const loginSource = await readSource('../pages/LoginPage.jsx')
  const loadingSource = await readSource('../components/LoadingState.jsx')
  const errorSource = await readSource('../components/ErrorState.jsx')
  const pageLayoutSource = await readSource('../components/PageLayout.jsx')

  assert.match(loginSource, /A private memory book for Omia and Jaylan\./)
  assert.match(loginSource, /Continue with Google/)
  assert.match(loginSource, /Other sign-in options/)
  assert.match(loginSource, /BrandMark/)
  assert.doesNotMatch(loginSource, /Firebase auth|route-guarded|static bypass|Theme-aware shell/)
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
