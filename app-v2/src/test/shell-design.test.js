import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('app shell keeps the editorial navigation grouping explicit', async () => {
  const shellSource = await readSource('../layout/AppShell.jsx')
  const mobileNavSource = await readSource('../layout/MobileNavigation.jsx')

  assert.match(shellSource, /const primaryRoutes = protectedRouteMeta\.filter/)
  assert.match(shellSource, /\/dashboard/)
  assert.match(shellSource, /\/timeline/)
  assert.match(shellSource, /\/gallery/)
  assert.match(shellSource, /const sharedRoutes = protectedRouteMeta\.filter/)
  assert.match(shellSource, /\/profile/)
  assert.match(shellSource, /\/favorites/)
  assert.match(shellSource, /title="Primary story"/)
  assert.match(shellSource, /title="Shared space"/)
  assert.match(shellSource, /title="Quiet utilities"/)
  assert.match(shellSource, /title="Special moments"/)
  assert.match(shellSource, /const mobileRoutes = \[\.\.\.primaryRoutes, \.\.\.sharedRoutes\.slice\(0, 1\)\]/)
  assert.match(mobileNavSource, /visibleItems = Array\.isArray\(items\) \? items\.slice\(0, 4\) : \[\]/)
  assert.match(mobileNavSource, /aria-label="Open full navigation"/)
})

test('shared states and login shell keep the editorial-journal framing explicit', async () => {
  const loginSource = await readSource('../pages/LoginPage.jsx')
  const loadingSource = await readSource('../components/LoadingState.jsx')
  const errorSource = await readSource('../components/ErrorState.jsx')
  const emptySource = await readSource('../components/EmptyState.jsx')
  const placeholderSource = await readSource('../components/PlaceholderPage.jsx')

  assert.match(loginSource, /Open the book kept between the two of you\./)
  assert.match(loginSource, /Enter Couple Book/)
  assert.match(loginSource, /hero-bookplate/)
  assert.match(loadingSource, /Opening the private archive/)
  assert.match(errorSource, /state-badge">Notice</)
  assert.match(emptySource, /state-badge">In progress</)
  assert.match(placeholderSource, /Migration placeholder/)
  assert.match(placeholderSource, /This page is ready for the next chapter\./)
})

test('shared shell styles use the editorial token set and retire the old rose branding', async () => {
  const styleSource = await readSource('../styles/index.css')

  assert.match(styleSource, /--paper:/)
  assert.match(styleSource, /--paper-deep:/)
  assert.match(styleSource, /--accent-olive:/)
  assert.match(styleSource, /--focus:/)
  assert.match(styleSource, /prefers-reduced-motion: reduce/)
  assert.match(styleSource, /safe-area-inset-bottom/)
  assert.doesNotMatch(styleSource, /--rose:/)
  assert.doesNotMatch(styleSource, /--rose-deep:/)
  assert.doesNotMatch(styleSource, /--berry:/)
  assert.doesNotMatch(styleSource, /background:\s*linear-gradient\(135deg,\s*var\(--rose\)/)
})
