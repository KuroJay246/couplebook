import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('shared page layout exports the editorial primitives and semantic contracts', async () => {
  const layoutSource = await readSource('../components/PageLayout.jsx')

  assert.match(layoutSource, /export function ChapterHeader/)
  assert.match(layoutSource, /export function SharedSpaceHeader/)
  assert.match(layoutSource, /export function UtilityPageHeader/)
  assert.match(layoutSource, /export function EditorialSection/)
  assert.match(layoutSource, /export function UtilitySection/)
  assert.match(layoutSource, /export function SettingsGroup/)
  assert.match(layoutSource, /export function QuietStatus/)
  assert.match(layoutSource, /export function EditorialEmptyState/)
  assert.match(layoutSource, /aria-labelledby=/)
  assert.match(layoutSource, /editorial-page-header/)
})

test('settings page layout keeps the faithful utility information architecture explicit', async () => {
  const settingsViewSource = await readSource('../features/settings/SettingsView.jsx')

  assert.match(settingsViewSource, /Application Settings/)
  assert.match(settingsViewSource, /settings-grid/)
  assert.match(settingsViewSource, /settings-menu/)
  assert.match(settingsViewSource, /settings-panel-shell/)
  assert.match(settingsViewSource, /Appearance/)
  assert.match(settingsViewSource, /Privacy/)
  assert.match(settingsViewSource, /Data/)
  assert.match(settingsViewSource, /theme-picker-grid/)
  assert.match(settingsViewSource, /toggle-item/)
  assert.doesNotMatch(settingsViewSource, /jaylanspencer99@gmail\.com/i)
})

test('dashboard adopts the faithful MemoryBook layout without placeholder fallbacks', async () => {
  const dashboardSource = await readSource('../features/dashboard/DashboardView.jsx')

  assert.match(dashboardSource, /dashboard-story-band/)
  assert.match(dashboardSource, /recent-memories-card/)
  assert.match(dashboardSource, /clock-card/)
  assert.match(dashboardSource, /special-moments-card/)
  assert.match(dashboardSource, /quick-nav-container/)
  assert.doesNotMatch(dashboardSource, /PlaceholderPage/)
})
