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

  assert.match(settingsViewSource, /Settings/)
  assert.match(settingsViewSource, /Account/)
  assert.match(settingsViewSource, /Appearance/)
  assert.match(settingsViewSource, /Notifications/)
  assert.match(settingsViewSource, /Privacy/)
  assert.match(settingsViewSource, /About/)
  assert.match(settingsViewSource, /Leave this device/)
  assert.match(settingsViewSource, /ToggleRow/)
  assert.match(settingsViewSource, /photoFailed/)
  assert.doesNotMatch(settingsViewSource, /Private settings/)
  assert.doesNotMatch(settingsViewSource, /Birthday, Valentine, and Confession/)
  assert.doesNotMatch(settingsViewSource, /Open Contract/)
  assert.doesNotMatch(settingsViewSource, /jaylanspencer99@gmail\.com/i)
})

test('dashboard adopts the faithful MemoryBook layout without placeholder fallbacks', async () => {
  const dashboardSource = await readSource('../features/dashboard/DashboardView.jsx')
  const homeStyles = await readSource('../styles/pages/home.css')

  assert.match(dashboardSource, /cb-home-redesign/)
  assert.match(dashboardSource, /AlbumLead/)
  assert.match(dashboardSource, /Our archive/)
  assert.match(dashboardSource, /Open Album/)
  assert.match(dashboardSource, /Open Us/)
  assert.match(dashboardSource, /cb-home-clock/)
  assert.match(dashboardSource, /timestampLabel/)
  assert.doesNotMatch(dashboardSource, /Recent memories|Add Memory|\/timeline/)
  assert.doesNotMatch(dashboardSource, /Clock3|Quick links/)
  assert.doesNotMatch(dashboardSource, /PlaceholderPage/)
  assert.match(homeStyles, /\.cb-home-topline-actions/)
  assert.match(homeStyles, /\.cb-home-clock/)
  assert.match(homeStyles, /@media \(max-width: 640px\)/)
  assert.match(homeStyles, /justify-items: start/)
  assert.match(homeStyles, /text-align: left/)
})
