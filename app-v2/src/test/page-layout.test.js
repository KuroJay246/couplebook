import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('shared page layout keeps only the remaining not-found primitives', async () => {
  const layoutSource = await readSource('../components/PageLayout.jsx')

  assert.match(layoutSource, /export function UtilitySection/)
  assert.match(layoutSource, /export function EditorialEmptyState/)
  assert.doesNotMatch(layoutSource, /export function ChapterHeader/)
  assert.doesNotMatch(layoutSource, /export function SharedSpaceHeader/)
  assert.doesNotMatch(layoutSource, /export function UtilityPageHeader/)
  assert.doesNotMatch(layoutSource, /export function SettingsGroup/)
  assert.doesNotMatch(layoutSource, /export function QuietStatus/)
})

test('settings page layout keeps the faithful utility information architecture explicit', async () => {
  const settingsViewSource = await readSource('../features/settings/SettingsView.jsx')

  assert.match(settingsViewSource, /Application Settings/)
  assert.match(settingsViewSource, /PageTabs/)
  assert.match(settingsViewSource, /Appearance/)
  assert.match(settingsViewSource, /Privacy/)
  assert.match(settingsViewSource, /Compatibility/)
  assert.match(settingsViewSource, /Application/)
  assert.match(settingsViewSource, /ToggleRow/)
  assert.doesNotMatch(settingsViewSource, /jaylanspencer99@gmail\.com/i)
})

test('dashboard adopts the faithful MemoryBook layout without placeholder fallbacks', async () => {
  const dashboardSource = await readSource('../features/dashboard/DashboardView.jsx')

  assert.match(dashboardSource, /Continue The Story/)
  assert.match(dashboardSource, /Recent memories worth reopening/)
  assert.match(dashboardSource, /Warm, private, and personal/)
  assert.match(dashboardSource, /NotebookPen/)
  assert.match(dashboardSource, /Media Album/)
  assert.doesNotMatch(dashboardSource, /PlaceholderPage/)
})
