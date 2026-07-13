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
  const styleSource = await readSource('../styles/index.css')

  assert.match(pageSource, /DashboardView/)
  assert.match(pageSource, /useDashboardModel/)
  assert.doesNotMatch(pageSource, /PlaceholderPage/)
  assert.match(hookSource, /useCompatibilityData/)
  assert.match(hookSource, /buildDashboardReadModel/)
  assert.match(viewSource, /model\.recentMemories/)
  assert.match(viewSource, /model\.milestones/)
  assert.match(viewSource, /model\.specialMoments/)
  assert.match(viewSource, /model\.sourceState/)
  assert.match(styleSource, /\.dashboard-hero/)
  assert.match(styleSource, /\.memory-card-list/)
  assert.match(styleSource, /\.source-status-grid/)
})
