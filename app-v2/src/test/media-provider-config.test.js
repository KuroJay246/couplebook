import assert from 'node:assert/strict'
import test from 'node:test'
import { MEDIA_PROVIDER_IDS, assertProductionMediaProvider, resolveMediaProvider } from '../services/mediaProviderConfig.js'

test('production media defaults to Google Drive', () => {
  assert.equal(resolveMediaProvider({ MODE: 'production', VITE_WRITE_MODE: 'production-write-disabled' }), MEDIA_PROVIDER_IDS.googleDrive)
  assert.equal(assertProductionMediaProvider({ MODE: 'production', VITE_WRITE_MODE: 'firestore-production-write' }), MEDIA_PROVIDER_IDS.googleDrive)
})

test('Firebase Storage is rejected as an explicit production provider', () => {
  assert.throws(
    () => assertProductionMediaProvider({ MODE: 'production', VITE_WRITE_MODE: 'firestore-production-write', VITE_MEDIA_PROVIDER: 'firebase-storage' }),
    /Production media must use Google Drive/i,
  )
})
