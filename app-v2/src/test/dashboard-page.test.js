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
  const mainSource = await readSource('../main.jsx')

  assert.match(pageSource, /DashboardView/)
  assert.match(pageSource, /useDashboardModel/)
  assert.doesNotMatch(pageSource, /PlaceholderPage/)
  assert.match(hookSource, /useMemorySource/)
  assert.match(hookSource, /useProfileSource/)
  assert.match(hookSource, /useSettingsSource/)
  assert.doesNotMatch(hookSource, /useCompatibilityData/)
  assert.match(hookSource, /memorySource/)
  assert.match(hookSource, /buildDashboardReadModel/)
  assert.match(viewSource, /model\.recentMemories/)
  assert.match(viewSource, /model\.milestones/)
  assert.match(viewSource, /model\.specialMoments/)
  assert.match(viewSource, /cb-home-redesign/)
  assert.match(viewSource, /MemoryLead/)
  assert.doesNotMatch(viewSource, /Little Things/)
  assert.doesNotMatch(viewSource, /Open Album/)
  assert.doesNotMatch(viewSource, /Open Us/)
  assert.match(viewSource, /Save the next date/)
  assert.doesNotMatch(viewSource, /Clock3|timestampLabel|Quick links/)
  assert.match(mainSource, /import '\.\/styles\/pages\/home\.css'/)
})
