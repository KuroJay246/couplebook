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

test('Firestore batch write builds document updates without leaking temporary fields', async () => {
  const calls = []
  const originalFetch = globalThis.fetch
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ['sign', 'verify'],
  )
  const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)).toString('base64')
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ body: options.body, url: String(url) })
    if (String(url).includes('oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'service-access-token', expires_in: 3600 }), { status: 200 })
    }
    if (String(url).includes(':batchWrite')) {
      return new Response(JSON.stringify({ writeResults: [{ updateTime: 'now' }] }), { status: 200 })
    }
    return new Response('{}', { status: 404 })
  }

  try {
    const result = await internals.firestoreBatchWrite({
      FIREBASE_PROJECT_ID: 'couplebook-97830',
      FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL: 'service@example.test',
      FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: [
        '-----BEGIN PRIVATE KEY-----',
        pkcs8,
        '-----END PRIVATE KEY-----',
      ].join('\n'),
    }, [{
      path: 'couples/couple_alpha/mediaItems/media_one',
      record: {
        coupleId: 'couple_alpha',
        deleted: false,
        driveFileId: 'drive_file_one',
        mediaId: 'media_one',
        provider: 'google-drive',
      },
    }])

    const batchCall = calls.find((call) => call.url.includes(':batchWrite'))
    assert.equal(result.writeResults.length, 1)
    assert.ok(batchCall)
    assert.match(batchCall.body, /projects\/couplebook-97830\/databases\/\(default\)\/documents\/couples\/couple_alpha\/mediaItems\/media_one/)
    assert.doesNotMatch(batchCall.body, /accessToken|refreshToken|thumbnailLink|downloadUrl/i)
  } finally {
    globalThis.fetch = originalFetch
  }
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
