import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { approvedAccountMigrationGate, routeMigrationStatus } from '../app/migrationStatus.js'
import { ROUTE_GROUPS, getRoutesByGroup } from '../app/routeConfig.js'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('settings route uses the read-only feature hook and utility view', async () => {
  const settingsPageSource = await readSource('../pages/SettingsPage.jsx')
  const settingsViewSource = await readSource('../features/settings/SettingsView.jsx')

  assert.match(settingsPageSource, /useSettingsData/)
  assert.match(settingsPageSource, /SettingsView/)
  assert.match(settingsViewSource, /Identity stays narrow and readable\./)
  assert.match(settingsViewSource, /The routed shell keeps one calm reading direction\./)
  assert.match(settingsViewSource, /The private boundary stays plain\./)
  assert.match(settingsViewSource, /Preserved sources stay explicit\./)
  assert.match(settingsViewSource, /The next batches stay explicit\./)
  assert.match(settingsViewSource, /Refresh reads/)
  assert.doesNotMatch(settingsViewSource, /type="checkbox"|selectTheme|Remote sign-out|Delete account|Reset Local Device Data/)
})

test('settings migration progress and utility navigation stay explicit', () => {
  assert.deepEqual(
    routeMigrationStatus.completed.map((entry) => entry.label),
    ['Dashboard', 'Timeline', 'Gallery', 'Profile', 'Favorites', 'Contract', 'Settings'],
  )
  assert.deepEqual(
    routeMigrationStatus.pending.map((entry) => entry.label),
    ['Birthday', 'Valentine', 'Confession'],
  )
  assert.deepEqual(approvedAccountMigrationGate, {
    jaylan: 'PASS',
    partner: 'NOT TESTED',
    overall: 'HOLD',
  })
  assert.deepEqual(
    getRoutesByGroup(ROUTE_GROUPS.primary).map((route) => route.path),
    ['/dashboard', '/timeline', '/gallery', '/profile'],
  )
  assert.deepEqual(getRoutesByGroup(ROUTE_GROUPS.utility).map((route) => route.path), ['/settings'])
})

test('settings view keeps raw technical details and old static dependencies out of the migrated route', async () => {
  const settingsViewSource = await readSource('../features/settings/SettingsView.jsx')
  const settingsSelectorsSource = await readSource('../features/settings/settingsSelectors.js')

  assert.doesNotMatch(settingsViewSource, /pages\/settings\.html|js\/settings\.js|btn-reset-data|btn-settings-auth-submit/)
  assert.doesNotMatch(settingsViewSource, /localStorage|memorybook_active_session|memorybook_active_user|memorybook_active_uid/)
  assert.doesNotMatch(settingsSelectorsSource, /users\/\{uid\}|VITE_FIREBASE|apiKey|authDomain|projectId/)
  assert.doesNotMatch(settingsSelectorsSource, /\bsetItem\s*\(|\bupdateDoc\s*\(|\baddDoc\s*\(|\bdeleteDoc\s*\(/)
})
