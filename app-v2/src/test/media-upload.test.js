import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { buildMediaManifest, inventoryLocalMedia, readLegacyMediaReferences } from '../../scripts/lib/media-mapping.mjs'
import { assertMediaBucketArg } from '../../scripts/lib/admin-firestore.mjs'
import {
  applyMediaManifest,
  captureMediaBackup,
  confirmationToken,
  publicManifestChecksum,
  runBounded,
  validateManifestForApply,
  validatePrivateManifest,
} from '../../scripts/lib/media-upload.mjs'

function makeTempManifest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'couplebook-media-upload-'))
  fs.mkdirSync(path.join(tmp, 'core'))
  fs.mkdirSync(path.join(tmp, 'OUR MEMORIES'))
  fs.writeFileSync(path.join(tmp, 'OUR MEMORIES', 'one.mp4'), Buffer.from([1, 2, 3, 4]))
  fs.writeFileSync(path.join(tmp, 'core', 'memories.json'), JSON.stringify([{ id: 'memory_one', media: '/assets/videos/one.mp4', isVideo: true }]))
  const localMedia = inventoryLocalMedia({ repoRoot: tmp, roots: [tmp] })
  const references = readLegacyMediaReferences({ repoRoot: tmp })
  return buildMediaManifest({ coupleId: 'couple_alpha', localMedia, references })
}

function fakeDocStore(initial = {}) {
  const writes = []
  return {
    writes,
    doc(pathName) {
      return {
        async get() {
          return {
            exists: Boolean(initial[pathName]),
            data: () => initial[pathName] || {},
          }
        },
        async set(data, options) {
          writes.push({ data, options, path: pathName })
        },
      }
    },
  }
}

function fakeBucket({ exists = false, metadata = {} } = {}) {
  const uploads = []
  return {
    uploads,
    file(_storagePath) {
      return {
        async exists() {
          return [exists]
        },
        async getMetadata() {
          return [{
            contentType: metadata.contentType || 'video/mp4',
            metadata: metadata.metadata || {},
            size: metadata.size || 0,
          }]
        },
      }
    },
    async upload(privatePath, options) {
      uploads.push({ options, privatePath })
    },
  }
}

test('media apply confirmation token is checksum-bound', () => {
  assert.equal(confirmationToken('a'.repeat(64)), 'APPLY_COUPLEBOOK_MEDIA_AAAAAAAAAAAA')
  assert.throws(() => confirmationToken('bad'))
})

test('private manifest checksum ignores private paths but validates apply gates', () => {
  const manifest = makeTempManifest()
  const checksum = manifest.publicManifest.checksum
  assert.equal(publicManifestChecksum(manifest.privateManifest), checksum)
  assert.doesNotThrow(() =>
    validateManifestForApply(manifest.privateManifest, {
      checksum,
      confirm: confirmationToken(checksum),
      ownerUid: 'member_one',
    }),
  )
  assert.throws(() => validateManifestForApply(manifest.privateManifest, { checksum, confirm: 'wrong', ownerUid: 'member_one' }))
  assert.throws(() => validateManifestForApply({ ...manifest.privateManifest, summary: { ...manifest.privateManifest.summary, conflicts: 1 } }, {
    checksum,
    confirm: confirmationToken(checksum),
    ownerUid: 'member_one',
  }))
})

test('media apply requires an explicit Couple Book Storage bucket', () => {
  assert.equal(assertMediaBucketArg(['--bucket', 'couplebook-97830.appspot.com']), 'couplebook-97830.appspot.com')
  assert.equal(assertMediaBucketArg(['--bucket=couplebook-97830.firebasestorage.app']), 'couplebook-97830.firebasestorage.app')
  assert.throws(() => assertMediaBucketArg([]), /--bucket is required/)
  assert.throws(() => assertMediaBucketArg(['--bucket', 'gathervibeshub.appspot.com']), /Couple Book Firebase project|prohibited/)
  assert.throws(() => assertMediaBucketArg(['--bucket', 'other-project.appspot.com']), /Couple Book Firebase project/)
})

test('bounded media apply runner preserves order and limits concurrency', async () => {
  let active = 0
  let maxActive = 0
  const tasks = Array.from({ length: 5 }, (_, index) => async () => {
    active += 1
    maxActive = Math.max(maxActive, active)
    await new Promise((resolve) => setTimeout(resolve, 5))
    active -= 1
    return index
  })

  assert.deepEqual(await runBounded(tasks, 2), [0, 1, 2, 3, 4])
  assert.equal(maxActive <= 2, true)
  await assert.rejects(() => runBounded(tasks, 0), /positive integer/)
})

test('private manifest validation verifies local file checksums without logging paths', () => {
  const manifest = makeTempManifest()
  assert.equal(validatePrivateManifest(manifest.privateManifest), 1)
  const tampered = structuredClone(manifest.privateManifest)
  tampered.records[0].original.sha256 = '0'.repeat(64)
  assert.throws(() => validatePrivateManifest(tampered), /redactedReferenceId|[a-f0-9]{16}/)
})

test('backup manifest captures redacted Firestore and Storage state', async () => {
  const manifest = makeTempManifest()
  const db = fakeDocStore({
    'couples/couple_alpha/memories/memory_one': { mediaState: 'private-legacy-reference', media: { private: true } },
  })
  const bucket = fakeBucket({ exists: true, metadata: { metadata: { sha256: 'a'.repeat(64) }, size: 4 } })
  const backup = await captureMediaBackup({ bucket, db, manifest: manifest.privateManifest })
  const serialized = JSON.stringify(backup)
  assert.equal(backup.plannedRecords, 1)
  assert.equal(backup.firestore[0].hasMedia, true)
  assert.equal(serialized.includes('OUR MEMORIES'), false)
})

test('apply uploads missing objects, skips identical objects, and writes no local paths to Firestore', async () => {
  const manifest = makeTempManifest()
  const missingBucket = fakeBucket({ exists: false })
  const db = fakeDocStore()
  const result = await applyMediaManifest({ bucket: missingBucket, concurrency: 1, db, manifest: manifest.privateManifest, ownerUid: 'member_one' })
  assert.equal(result.uploaded, 1)
  assert.equal(result.firestoreUpdated, 1)
  assert.equal(JSON.stringify(db.writes).includes('OUR MEMORIES'), false)
  assert.equal(db.writes[0].data.mediaState, 'storage-verified')

  const record = manifest.privateManifest.records[0]
  const identicalBucket = fakeBucket({
    exists: true,
    metadata: {
      metadata: { sha256: record.original.sha256 },
      size: record.original.sizeBytes,
    },
  })
  const skipResult = await applyMediaManifest({ bucket: identicalBucket, concurrency: 1, db: fakeDocStore(), manifest: manifest.privateManifest, ownerUid: 'member_one' })
  assert.equal(skipResult.skippedIdentical, 1)
  assert.equal(skipResult.uploaded, 0)
})
