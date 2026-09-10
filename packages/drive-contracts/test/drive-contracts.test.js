import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DRIVE_BACKEND_ENDPOINTS,
  DRIVE_BACKEND_REQUIRED_FOR,
  DRIVE_CONNECTION_STATES,
  DRIVE_FRONTEND_AUTH_CONSTRAINTS,
  DRIVE_MEDIA_PROVIDER,
  DRIVE_USER_MESSAGE,
  buildDriveArchitectureContract,
  buildDriveBackendContract,
} from '../src/index.js'

test('drive contracts expose the approved connection states and owner-safe copy', () => {
  assert.equal(DRIVE_CONNECTION_STATES.includes('connected'), true)
  assert.equal(DRIVE_CONNECTION_STATES.includes('permission-insufficient'), true)
  assert.match(DRIVE_USER_MESSAGE, /Google Drive is not available/i)
})

test('drive contracts separate Couple Book identity from persistent Drive authorization', () => {
  assert.equal(DRIVE_MEDIA_PROVIDER, 'google-drive')
  assert.equal(DRIVE_BACKEND_ENDPOINTS.beginAuthorization, '/api/drive/oauth/begin')
  assert.equal(DRIVE_BACKEND_ENDPOINTS.stream, '/api/drive/media/:mediaId/stream')
  assert.ok(DRIVE_FRONTEND_AUTH_CONSTRAINTS.includes('send-firebase-id-token'))
  assert.ok(DRIVE_FRONTEND_AUTH_CONSTRAINTS.includes('never-send-google-refresh-token-to-browser'))
  assert.ok(DRIVE_BACKEND_REQUIRED_FOR.includes('partner-upload-to-drive'))
})

test('drive backend contract is couple-scoped and contains no credential values', () => {
  const contract = buildDriveBackendContract({
    coupleId: 'couple-alpha',
    driveFolderId: '17Ar4UK5_puORz9TE1dijIk2-qHgh7oIa',
    requiredScope: 'https://www.googleapis.com/auth/drive.file',
  })
  const serialized = JSON.stringify(contract)

  assert.equal(contract.provider, 'google-drive')
  assert.equal(contract.driveFolderId, '17Ar4UK5_puORz9TE1dijIk2-qHgh7oIa')
  assert.ok(contract.backendAuth.includes('verify-media-record-belongs-to-requesting-couple'))
  assert.ok(contract.backendWrites.includes('couples/couple-alpha/mediaItems'))
  assert.ok(contract.backendWrites.includes('couples/couple-alpha/mediaSync/google-drive'))
  assert.ok(contract.forbiddenWrites.includes('refresh-token'))
  assert.equal(contract.previewStrategy.staleUrlPolicy, 'do-not-store-or-replay')
  assert.match(contract.zeroCostBoundary, /Do not deploy/)
  assert.doesNotMatch(serialized, /clientSecretValue|refreshTokenValue|accessTokenValue|Bearer\s/i)
})

test('drive architecture contract keeps Firestore index fast and backend work explicit', () => {
  const contract = buildDriveArchitectureContract({
    coupleId: 'couple-alpha',
    driveFolderId: 'folder-one',
    requiredScope: 'scope-one',
  })

  assert.equal(contract.mediaIndexPath, 'couples/couple-alpha/mediaItems')
  assert.equal(contract.syncStatePath, 'couples/couple-alpha/mediaSync/google-drive')
  assert.ok(contract.frontendCan.includes('render-indexed-media'))
  assert.ok(contract.backendRequiredFor.includes('drive-access-token-refresh'))
  assert.ok(contract.backendRequiredFor.includes('fast-thumbnail-proxy-or-cache'))
  assert.equal(contract.deploymentStatus, 'owner-approval-required')
})
