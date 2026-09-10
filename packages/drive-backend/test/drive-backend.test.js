import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DRIVE_BACKEND_ROUTES,
  assertNoCredentialValues,
  findDriveBackendRoute,
  listDriveBackendEndpointPaths,
  validateDriveBackendRequest,
} from '../src/index.js'

test('drive backend route contract covers every required endpoint without secrets', () => {
  const paths = listDriveBackendEndpointPaths()
  assert.equal(paths.length, 9)
  assert.ok(paths.includes('/api/drive/oauth/begin'))
  assert.ok(paths.includes('/api/drive/media/upload'))
  assert.ok(paths.includes('/api/drive/media/:mediaId/thumbnail'))
  assert.equal(findDriveBackendRoute('/api/drive/media/media_123/thumbnail', 'GET')?.key, 'thumbnail')
  assert.equal(findDriveBackendRoute('/api/drive/media/media_123', 'POST')?.key, 'removeMedia')
  assertNoCredentialValues(DRIVE_BACKEND_ROUTES)
})

test('drive backend request validation requires Firebase token and active couple membership', async () => {
  const valid = await validateDriveBackendRequest({
    activeMembershipReader: async ({ coupleId, uid }) => ({ active: coupleId === 'couple_alpha' && uid === 'member_one' }),
    body: { coupleId: 'couple_alpha' },
    headers: { authorization: 'Bearer local-test-token' },
    method: 'POST',
    path: '/api/drive/sync',
    tokenVerifier: async () => ({ uid: 'member_one' }),
  })

  assert.deepEqual(valid, {
    ok: true,
    routeKey: 'syncNow',
    uid: 'member_one',
    coupleId: 'couple_alpha',
    status: 200,
  })

  const missingToken = await validateDriveBackendRequest({
    activeMembershipReader: async () => ({ active: true }),
    body: { coupleId: 'couple_alpha' },
    method: 'POST',
    path: '/api/drive/sync',
    tokenVerifier: async () => ({ uid: 'member_one' }),
  })
  assert.equal(missingToken.code, 'missing-firebase-id-token')

  const crossCouple = await validateDriveBackendRequest({
    activeMembershipReader: async () => ({ active: false }),
    body: { coupleId: 'couple_beta' },
    headers: { authorization: 'Bearer local-test-token' },
    method: 'POST',
    path: '/api/drive/sync',
    tokenVerifier: async () => ({ uid: 'member_one' }),
  })
  assert.equal(crossCouple.code, 'active-couple-membership-required')
})
