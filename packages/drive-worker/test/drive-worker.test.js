import assert from 'node:assert/strict'
import test from 'node:test'
import worker, { internals } from '../src/index.js'

function createKv() {
  const values = new Map()
  return {
    async get(key) {
      return values.get(key) || null
    },
    async put(key, value) {
      values.set(key, value)
    },
  }
}

test('worker health uses strict configured CORS instead of wildcard credentials', async () => {
  const response = await worker.fetch(new Request('https://worker.example/api/drive/health', {
    headers: { Origin: 'https://couplebook.web.app' },
  }), {
    ALLOWED_ORIGINS: 'https://couplebook.web.app,http://localhost:5173',
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://couplebook.web.app')
  assert.notEqual(response.headers.get('Access-Control-Allow-Origin'), '*')
})

test('worker rejects unknown origins without granting CORS access', async () => {
  const response = await worker.fetch(new Request('https://worker.example/api/drive/health', {
    headers: { Origin: 'https://evil.example' },
  }), {
    ALLOWED_ORIGINS: 'https://couplebook.web.app,http://localhost:5173',
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null)
})

test('worker crypto envelope stores refresh credentials as ciphertext only', async () => {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32))
  const env = {
    TOKEN_ENCRYPTION_KEY: Buffer.from(keyBytes).toString('base64url'),
  }
  const envelope = await internals.encryptJson(env, { refreshToken: 'secret-refresh-token' })
  const serialized = JSON.stringify(envelope)

  assert.doesNotMatch(serialized, /secret-refresh-token/)
  assert.equal((await internals.decryptJson(env, envelope)).refreshToken, 'secret-refresh-token')
})

test('Firestore conversion keeps stable media metadata without temporary URL fields', () => {
  const fields = internals.toFirestoreFields({
    coupleId: 'couple_alpha',
    deleted: false,
    driveFileId: 'drive_file_one',
    mediaId: 'media_one',
    mimeType: 'image/jpeg',
    provider: 'google-drive',
    sizeBytes: 123,
  })
  const restored = internals.fromFirestoreFields(fields)

  assert.equal(restored.provider, 'google-drive')
  assert.equal(restored.sizeBytes, 123)
  assert.equal('accessToken' in restored, false)
  assert.equal('thumbnailLink' in restored, false)
})

test('protected routes fail closed without Firebase bearer token', async () => {
  const response = await worker.fetch(new Request('https://worker.example/api/drive/sync', {
    method: 'POST',
    body: JSON.stringify({ coupleId: 'couple_alpha' }),
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
  }), {
    ALLOWED_ORIGINS: 'http://localhost:5173',
    DRIVE_TOKEN_KV: createKv(),
    FIREBASE_PROJECT_ID: 'couplebook-97830',
  })
  const body = await response.json()

  assert.equal(response.status, 401)
  assert.equal(body.code, 'missing-firebase-id-token')
})

test('Drive file media IDs are deterministic and do not expose raw Drive IDs', async () => {
  const first = await internals.mediaIdForDriveFile('drive_file_private_123')
  const second = await internals.mediaIdForDriveFile('drive_file_private_123')

  assert.equal(first, second)
  assert.match(first, /^drive_[A-Za-z0-9_-]+$/)
  assert.doesNotMatch(first, /drive_file_private_123/)
})
