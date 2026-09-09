import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { approvedAccountMigrationGate, routeMigrationStatus, specialMomentContentConnectionStatus } from '../app/migrationStatus.js'
import { ROUTE_GROUPS, getRoutesByGroup, protectedRouteMeta } from '../app/routeConfig.js'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('settings route uses the read-only feature hook and utility view', async () => {
  const settingsPageSource = await readSource('../pages/SettingsPage.jsx')
  const settingsViewSource = await readSource('../features/settings/SettingsView.jsx')

  assert.match(settingsPageSource, /useSettingsData/)
  assert.match(settingsPageSource, /SettingsView/)
  assert.match(settingsViewSource, /Settings/)
  assert.match(settingsViewSource, /THEME_REGISTRY/)
  assert.match(settingsViewSource, /Special moments/)
  assert.match(settingsViewSource, /Photos and videos/)
  assert.match(settingsViewSource, /Open Album/)
  assert.match(settingsViewSource, /Google sign-in/)
  assert.match(settingsViewSource, /Link Google sign-in/)
  assert.match(settingsViewSource, /isGoogleProviderLinked\(user\)/)
  assert.match(settingsViewSource, /buildFormState/)
  assert.match(settingsViewSource, /draft/)
  assert.match(settingsViewSource, /Cancel/)
  assert.match(settingsViewSource, /Leave this device/i)
  assert.doesNotMatch(settingsViewSource, /selectTheme|Remote sign-out|Delete account|Reset Local Device Data/)
})

test('settings migration progress and utility navigation stay explicit', () => {
  assert.deepEqual(
    routeMigrationStatus.completed.map((entry) => entry.label),
    ['Home', 'Story', 'Album', 'Us', 'Favorites', 'Plans', 'Contract', 'Birthday', 'Valentine', 'Confession', 'Settings'],
  )
  assert.deepEqual(routeMigrationStatus.pending.map((entry) => entry.label), [])
  assert.deepEqual(specialMomentContentConnectionStatus, {
    birthday: 'development-only',
    valentine: 'development-only',
    confession: 'development-only',
    productionCutover: 'pending',
  })
  assert.deepEqual(approvedAccountMigrationGate, {
    jaylan: 'PASS',
    partner: 'NOT TESTED',
    overall: 'HOLD',
  })
  assert.deepEqual(
    getRoutesByGroup(ROUTE_GROUPS.primary).map((route) => route.path),
    ['/dashboard', '/timeline', '/gallery', '/profile', '/plans'],
  )
  assert.deepEqual(getRoutesByGroup(ROUTE_GROUPS.utility).map((route) => route.path), ['/settings'])
})

test('settings migration progress stays aligned with the protected router', () => {
  const protectedPaths = protectedRouteMeta.map((route) => route.path).sort()
  const migrationPaths = routeMigrationStatus.entries.map((entry) => entry.path).sort()

  assert.deepEqual(migrationPaths, protectedPaths)
  assert.equal(routeMigrationStatus.entries.length, 11)
})

test('settings view keeps raw technical details and old static dependencies out of the migrated route', async () => {
  const settingsViewSource = await readSource('../features/settings/SettingsView.jsx')
  const settingsSelectorsSource = await readSource('../features/settings/settingsSelectors.js')

  assert.doesNotMatch(settingsViewSource, /pages\/settings\.html|js\/settings\.js|btn-reset-data|btn-settings-auth-submit/)
  assert.doesNotMatch(settingsViewSource, /localStorage|memorybook_active_session|memorybook_active_user|memorybook_active_uid/)
  assert.doesNotMatch(settingsSelectorsSource, /users\/\{uid\}|VITE_FIREBASE|apiKey|authDomain|projectId/)
  assert.doesNotMatch(settingsSelectorsSource, /\bsetItem\s*\(|\bupdateDoc\s*\(|\baddDoc\s*\(|\bdeleteDoc\s*\(/)
})

test('settings account controls preserve existing Firebase identity while linking Google', async () => {
  const authServiceSource = await readSource('../services/authService.js')
  const authProviderSource = await readSource('../auth/AuthProvider.jsx')
  const settingsViewSource = await readSource('../features/settings/SettingsView.jsx')

  assert.match(authServiceSource, /linkWithPopup/)
  assert.match(authServiceSource, /currentUser/)
  assert.match(authServiceSource, /auth\/google-link-uid-mismatch/)
  assert.doesNotMatch(authServiceSource, /signInWithPopup/)
  assert.match(authProviderSource, /signOutCurrentUser\(\)/)
  assert.match(authProviderSource, /resolveApprovedUser\(result\.user\)/)
  assert.match(settingsViewSource, /current Firebase UID, couple membership, and private book data stay intact/)
})
