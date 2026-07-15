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
  assert.match(layoutSource, /export function PageDivider/)
  assert.match(layoutSource, /export function EditorialEmptyState/)
  assert.match(layoutSource, /role="presentation"/)
  assert.match(layoutSource, /aria-labelledby=/)
  assert.match(layoutSource, /editorial-page-header/)
})

test('settings page layout keeps the approved utility information architecture explicit', async () => {
  const settingsViewSource = await readSource('../features/settings/SettingsView.jsx')

  assert.match(settingsViewSource, /Your account/)
  assert.match(settingsViewSource, /Appearance/)
  assert.match(settingsViewSource, /Privacy and access/)
  assert.match(settingsViewSource, /Data and compatibility/)
  assert.match(settingsViewSource, /Migration progress/)
  assert.match(settingsViewSource, /Advanced/)
  assert.match(settingsViewSource, /Danger zone/)
  assert.match(settingsViewSource, /UtilityPageHeader/)
  assert.match(settingsViewSource, /UtilitySection/)
  assert.match(settingsViewSource, /SettingsGroup/)
  assert.doesNotMatch(settingsViewSource, /jaylanspencer99@gmail\.com/i)
})

test('dashboard and placeholders adopt the shared page layout system', async () => {
  const dashboardSource = await readSource('../features/dashboard/DashboardView.jsx')
  const placeholderSource = await readSource('../components/PlaceholderPage.jsx')

  assert.match(dashboardSource, /ChapterHeader/)
  assert.match(dashboardSource, /EditorialSection/)
  assert.match(dashboardSource, /EditorialEmptyState/)
  assert.match(placeholderSource, /ChapterHeader/)
  assert.match(placeholderSource, /EditorialEmptyState/)
})
