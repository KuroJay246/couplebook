import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('dashboard page uses the dedicated feature slice instead of the migration placeholder', async () => {
  const pageSource = await readSource('../pages/DashboardPage.jsx')
  const hookSource = await readSource('../features/dashboard/useDashboardModel.js')
  const viewSource = await readSource('../features/dashboard/DashboardView.jsx')
  const legacyStyleSource = await readSource('../styles/legacy-pages.css')

  assert.match(pageSource, /DashboardView/)
  assert.match(pageSource, /useDashboardModel/)
  assert.doesNotMatch(pageSource, /PlaceholderPage/)
  assert.match(hookSource, /useCompatibilityData/)
  assert.match(hookSource, /buildDashboardReadModel/)
  assert.match(viewSource, /model\.recentMemories/)
  assert.match(viewSource, /model\.milestones/)
  assert.match(viewSource, /model\.specialMoments/)
  assert.match(viewSource, /dashboard-story-band/)
  assert.match(viewSource, /quick-nav-container/)
  assert.match(viewSource, /Relationship Summary/)
  assert.match(viewSource, /Birthday Page/)
  assert.match(legacyStyleSource, /\.dashboard-story-band/)
  assert.match(legacyStyleSource, /\.anniversary-card/)
})
