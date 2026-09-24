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
  assert.doesNotMatch(hookSource, /useMemorySource|memorySource/)
  assert.match(hookSource, /useProfileSource/)
  assert.match(hookSource, /useSettingsSource/)
  assert.doesNotMatch(hookSource, /useCompatibilityData/)
  assert.match(hookSource, /buildDashboardReadModel/)
  assert.match(hookSource, /MINUTE_MS/)
  assert.match(hookSource, /MINIMUM_CLOCK_DELAY_MS/)
  assert.match(hookSource, /getDelayUntilNextMinute/)
  assert.match(hookSource, /window\.setTimeout/)
  assert.match(hookSource, /window\.setInterval/)
  assert.match(hookSource, /window\.clearTimeout/)
  assert.match(hookSource, /window\.clearInterval/)
  assert.match(hookSource, /}, MINUTE_MS\)/)
  assert.doesNotMatch(hookSource, /,\s*1000\)/)
  assert.doesNotMatch(viewSource, /model\.recentMemories|\/timeline|Add Memory|Recent memories/)
  assert.match(viewSource, /model\.milestones/)
  assert.match(viewSource, /cb-home-redesign/)
  assert.match(viewSource, /cb-home-clock/)
  assert.match(viewSource, /model\.hero\?\.timestampLabel/)
  assert.doesNotMatch(viewSource, /Little Things/)
  assert.match(viewSource, /viewerBirthday/)
  assert.doesNotMatch(viewSource, /Open Album|Open Us|Save the next date|Special moments|Our archive|The moments we keep/)
  assert.doesNotMatch(viewSource, /Clock3|Quick links/)
  assert.match(mainSource, /import '\.\/styles\/pages\/home\.css'/)
})

test('dashboard clock stays intentional, compact, and minute-scoped', async () => {
  const hookSource = await readSource('../features/dashboard/useDashboardModel.js')
  const viewSource = await readSource('../features/dashboard/DashboardView.jsx')
  const readModelSource = await readSource('../features/dashboard/dashboardReadModel.js')

  assert.match(viewSource, /cb-home-clock/)
  assert.match(viewSource, /Current time/)
  assert.match(hookSource, /MINUTE_MS = 60 \* 1000/)
  assert.match(hookSource, /MINIMUM_CLOCK_DELAY_MS = 1000/)
  assert.match(hookSource, /window\.setTimeout/)
  assert.match(hookSource, /window\.setInterval/)
  assert.match(hookSource, /window\.clearTimeout/)
  assert.match(hookSource, /window\.clearInterval/)
  assert.match(hookSource, /}, MINUTE_MS\)/)
  assert.doesNotMatch(hookSource, /,\s*1000\)/)
  assert.match(readModelSource, /hour: 'numeric'/)
  assert.match(readModelSource, /minute: '2-digit'/)
  assert.doesNotMatch(readModelSource, /second: '2-digit'/)
})
