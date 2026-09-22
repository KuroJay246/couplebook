import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  DEFAULT_MAINTENANCE_STATUS,
  MAINTENANCE_STATUS_PATH,
  fetchMaintenanceStatus,
  normalizeMaintenanceStatus,
} from '../maintenance/maintenanceStatus.js'

test('maintenance status defaults to off and normalizes only public fields', () => {
  const normalized = normalizeMaintenanceStatus({
    enabled: true,
    message: '  Planned   update  ',
    details: '  Private data stays protected.  ',
    expectedReturnAt: '2026-09-22T22:00:00.000Z',
    updateId: ' release-17 ',
    token: 'must-not-survive',
  })

  assert.deepEqual(normalized, {
    enabled: true,
    message: 'Planned update',
    details: 'Private data stays protected.',
    expectedReturnAt: '2026-09-22T22:00:00.000Z',
    updateId: 'release-17',
  })
  assert.equal(normalized.token, undefined)
})

test('maintenance status fails open without blocking normal app startup', async () => {
  const result = await fetchMaintenanceStatus({
    fetchImpl: async () => {
      throw new Error('network unavailable')
    },
  })

  assert.equal(result.state, 'unavailable')
  assert.deepEqual(result.status, DEFAULT_MAINTENANCE_STATUS)
})

test('maintenance status fetch uses the public no-store status document', async () => {
  const calls = []
  const result = await fetchMaintenanceStatus({
    fetchImpl: async (...args) => {
      calls.push(args)
      return {
        ok: true,
        json: async () => ({ enabled: true, message: 'Update', details: 'Owner review' }),
      }
    },
  })

  assert.equal(calls[0][0], MAINTENANCE_STATUS_PATH)
  assert.equal(calls[0][1].cache, 'no-store')
  assert.equal(calls[0][1].headers.Accept, 'application/json')
  assert.equal(result.state, 'ready')
  assert.equal(result.status.enabled, true)
})

test('maintenance page and gate stay outside private app services', async () => {
  const pageSource = await readFile(new URL('../pages/MaintenancePage.jsx', import.meta.url), 'utf8')
  const gateSource = await readFile(new URL('../maintenance/MaintenanceGate.jsx', import.meta.url), 'utf8')
  const statusHookSource = await readFile(new URL('../maintenance/useMaintenanceStatus.js', import.meta.url), 'utf8')
  const statusSource = await readFile(new URL('../maintenance/maintenanceStatus.js', import.meta.url), 'utf8')
  const routesSource = await readFile(new URL('../app/routes.jsx', import.meta.url), 'utf8')
  const mainSource = await readFile(new URL('../main.jsx', import.meta.url), 'utf8')

  const combined = `${pageSource}\n${gateSource}\n${statusHookSource}\n${statusSource}`
  assert.doesNotMatch(combined, /firebase|firestore|GoogleDrive|DriveConnection|useAuth|ProtectedRoute|AppShell/)
  assert.match(gateSource, /MaintenanceNotice/)
  assert.match(pageSource, /Open Couple Book/)
  assert.equal(routesSource.indexOf('path="/update"') < routesSource.indexOf('<MaintenanceGate />'), true)
  assert.equal(routesSource.indexOf('<MaintenanceGate />') < routesSource.indexOf('<AppProviders />'), true)
  assert.doesNotMatch(mainSource, /AuthProvider|ThemeProvider/)
})
