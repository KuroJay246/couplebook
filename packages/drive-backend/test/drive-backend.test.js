import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DRIVE_BACKEND_ROUTES,
  assertNoCredentialValues,
  authorizeIndexedMediaRequest,
  beginDriveAuthorization,
  completeDriveAuthorization,
  findDriveBackendRoute,
  listDriveBackendEndpointPaths,
  planDriveSyncWrites,
  runDriveSyncNow,
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

test('drive OAuth state is bound to the Firebase uid and couple without exposing credentials', async () => {
  const states = new Map()
  const connections = []

  const begin = await beginDriveAuthorization({
    activeMembershipReader: async ({ coupleId, uid }) => ({ active: coupleId === 'couple_alpha' && uid === 'member_one' }),
    authorizationUrlBuilder: async ({ stateId }) => `https://accounts.google.com/o/oauth2/v2/auth?state=${stateId}`,
    body: { coupleId: 'couple_alpha' },
    headers: { authorization: 'Bearer local-test-token' },
    nowMs: 1000,
    randomId: () => 'state_alpha_1',
    stateWriter: async (state) => states.set(state.stateId, state),
    tokenVerifier: async () => ({ uid: 'member_one' }),
  })

  assert.equal(begin.ok, true)
  assert.equal(begin.stateId, 'state_alpha_1')
  assert.equal(states.get('state_alpha_1').uid, 'member_one')
  assert.equal(states.get('state_alpha_1').coupleId, 'couple_alpha')

  const complete = await completeDriveAuthorization({
    codeExchanger: async ({ coupleId, uid }) => ({
      connectedAccount: 'jaylanspencer99@gmail.com',
      credentialHandle: 'credential_handle_alpha',
      scope: 'https://www.googleapis.com/auth/drive',
      coupleId,
      uid,
    }),
    connectionWriter: async (connection) => connections.push(connection),
    nowMs: 2000,
    query: { code: 'code_12345678', state: 'state_alpha_1' },
    stateReader: async (stateId) => states.get(stateId),
    stateWriter: async (state) => states.set(state.stateId, state),
  })

  assert.equal(complete.ok, true)
  assert.equal(complete.connectedAccount, 'jaylanspencer99@gmail.com')
  assert.equal(states.get('state_alpha_1').status, 'used')
  assert.equal(connections[0].credentialHandle, 'credential_handle_alpha')
  assertNoCredentialValues(complete)
  assertNoCredentialValues(connections[0])
})

test('drive OAuth completion rejects raw credential values from the exchange boundary', async () => {
  const complete = await completeDriveAuthorization({
    codeExchanger: async () => ({
      credentialHandle: 'credential_handle_alpha',
      refreshToken: 'secret-refresh-token',
    }),
    connectionWriter: async () => {},
    query: { code: 'code_12345678', state: 'state_alpha_1' },
    stateReader: async () => ({
      coupleId: 'couple_alpha',
      expiresAtMs: Date.now() + 1000,
      stateId: 'state_alpha_1',
      status: 'pending',
      uid: 'member_one',
    }),
    stateWriter: async () => {},
  })

  assert.equal(complete.ok, false)
  assert.equal(complete.code, 'credential-value-returned-from-exchanger')
})

test('indexed media authorization verifies membership and media record couple scope', async () => {
  const allowed = await authorizeIndexedMediaRequest({
    activeMembershipReader: async ({ coupleId, uid }) => ({ active: coupleId === 'couple_alpha' && uid === 'member_one' }),
    body: { coupleId: 'couple_alpha' },
    headers: { authorization: 'Bearer local-test-token' },
    mediaReader: async () => ({
      coupleId: 'couple_alpha',
      mediaId: 'media_one',
      provider: 'google-drive',
    }),
    method: 'GET',
    path: '/api/drive/media/media_one/thumbnail',
    tokenVerifier: async () => ({ uid: 'member_one' }),
  })

  assert.equal(allowed.ok, true)
  assert.equal(allowed.mediaId, 'media_one')

  const mismatch = await authorizeIndexedMediaRequest({
    activeMembershipReader: async () => ({ active: true }),
    body: { coupleId: 'couple_alpha' },
    headers: { authorization: 'Bearer local-test-token' },
    mediaReader: async () => ({
      coupleId: 'couple_beta',
      mediaId: 'media_one',
      provider: 'google-drive',
    }),
    method: 'GET',
    path: '/api/drive/media/media_one/thumbnail',
    tokenVerifier: async () => ({ uid: 'member_one' }),
  })

  assert.equal(mismatch.ok, false)
  assert.equal(mismatch.code, 'media-couple-mismatch')
})

test('drive sync planning creates upserts, tombstones, sync state, and privacy-minimal audit counts', () => {
  const plan = planDriveSyncWrites({
    coupleId: 'couple_alpha',
    driveRecords: [
      {
        coupleId: 'couple_alpha',
        driveFileId: 'drive_existing',
        mediaId: 'media_existing',
        mimeType: 'image/jpeg',
        name: 'anniversary.jpg',
        provider: 'google-drive',
        sizeBytes: 1200,
      },
      {
        coupleId: 'couple_alpha',
        driveFileId: 'drive_new',
        mediaId: 'media_new',
        mimeType: 'video/mp4',
        name: 'movie-night.mp4',
        provider: 'google-drive',
        sizeBytes: 9300,
      },
    ],
    indexedRecords: [
      {
        coupleId: 'couple_alpha',
        driveFileId: 'drive_existing',
        mediaId: 'media_existing',
        mimeType: 'image/jpeg',
        name: 'anniversary.jpg',
        provider: 'google-drive',
        sizeBytes: 1200,
      },
      {
        coupleId: 'couple_alpha',
        driveFileId: 'drive_missing',
        mediaId: 'media_missing',
        mimeType: 'image/png',
        name: 'removed.png',
        provider: 'google-drive',
        sizeBytes: 4400,
      },
    ],
    nowMs: 5000,
    uid: 'member_one',
  })

  assert.equal(plan.mediaWrites.length, 1)
  assert.equal(plan.mediaWrites[0].mediaId, 'media_new')
  assert.equal(plan.tombstoneWrites.length, 1)
  assert.equal(plan.tombstoneWrites[0].mediaId, 'media_missing')
  assert.equal(plan.tombstoneWrites[0].record.deleted, true)
  assert.deepEqual(plan.counts, {
    driveFiles: 2,
    indexedRecords: 2,
    tombstoned: 1,
    unchanged: 1,
    upserted: 1,
  })
  assert.equal(plan.syncStateWrite.status, 'ok')
  assert.equal(plan.auditEvent.action, 'drive.sync')
  assert.deepEqual(plan.auditEvent.summary, {
    upserted: 1,
    tombstoned: 1,
    unchanged: 1,
  })
  assertNoCredentialValues(plan)
})

test('drive sync planning rejects temporary Drive URLs and cross-couple records', () => {
  assert.throws(() => planDriveSyncWrites({
    coupleId: 'couple_alpha',
    driveRecords: [
      {
        coupleId: 'couple_alpha',
        driveFileId: 'drive_new',
        mediaId: 'media_new',
        provider: 'google-drive',
        thumbnailLink: 'https://lh3.googleusercontent.com/private-temp-url',
      },
    ],
  }), /temporary URLs/)

  assert.throws(() => planDriveSyncWrites({
    coupleId: 'couple_alpha',
    driveRecords: [
      {
        coupleId: 'couple_beta',
        driveFileId: 'drive_new',
        mediaId: 'media_new',
        provider: 'google-drive',
      },
    ],
  }), /couple mismatch/)
})

test('drive sync handler verifies membership and writes only planned records', async () => {
  const writes = []
  const syncStates = []
  const auditEvents = []

  const result = await runDriveSyncNow({
    activeMembershipReader: async ({ coupleId, uid }) => ({ active: coupleId === 'couple_alpha' && uid === 'member_one' }),
    auditWriter: async (write) => auditEvents.push(write),
    body: { coupleId: 'couple_alpha' },
    driveRecordReader: async () => [
      {
        coupleId: 'couple_alpha',
        driveFileId: 'drive_new',
        mediaId: 'media_new',
        mimeType: 'image/jpeg',
        name: 'new.jpg',
        provider: 'google-drive',
      },
    ],
    headers: { authorization: 'Bearer local-test-token' },
    indexedMediaReader: async () => [],
    mediaWriter: async (write) => writes.push(write),
    nowMs: 6000,
    syncStateWriter: async (write) => syncStates.push(write),
    tokenVerifier: async () => ({ uid: 'member_one' }),
  })

  assert.equal(result.ok, true)
  assert.equal(writes.length, 1)
  assert.equal(writes[0].operation, 'upsert')
  assert.equal(syncStates[0].record.counts.upserted, 1)
  assert.equal(auditEvents[0].record.actorUid, 'member_one')

  const denied = await runDriveSyncNow({
    activeMembershipReader: async () => ({ active: false }),
    auditWriter: async () => {},
    body: { coupleId: 'couple_alpha' },
    driveRecordReader: async () => [],
    headers: { authorization: 'Bearer local-test-token' },
    indexedMediaReader: async () => [],
    mediaWriter: async () => {},
    syncStateWriter: async () => {},
    tokenVerifier: async () => ({ uid: 'member_two' }),
  })

  assert.equal(denied.ok, false)
  assert.equal(denied.code, 'active-couple-membership-required')
})
