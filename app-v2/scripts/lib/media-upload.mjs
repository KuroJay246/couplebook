import crypto from 'node:crypto'
import fs from 'node:fs'

export function confirmationToken(checksum) {
  if (!/^[a-f0-9]{64}$/i.test(String(checksum))) {
    throw new Error('Manifest checksum must be a 64-character sha256 value.')
  }
  return `APPLY_COUPLEBOOK_MEDIA_${checksum.slice(0, 12).toUpperCase()}`
}

export function validateManifestForApply(manifest, { checksum, confirm, ownerUid }) {
  if (!manifest || manifest.schemaVersion !== 1) throw new Error('Media manifest schema is not supported.')
  if (manifest.checksum !== checksum) throw new Error('Manifest checksum does not match the supplied checksum.')
  if (confirm !== confirmationToken(checksum)) throw new Error(`Media apply requires --confirm ${confirmationToken(checksum)}.`)
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(ownerUid || '')) throw new Error('A safe --owner-uid is required for Storage metadata.')
  const summary = manifest.summary || {}
  if (summary.conflicts !== 0 || summary.invalid !== 0 || summary.ambiguousMatches !== 0 || summary.probableMatches !== 0) {
    throw new Error('Media manifest is not eligible for automatic apply.')
  }
  return true
}

export function publicManifestChecksum(manifest) {
  const copy = {
    ...manifest,
    records: Array.isArray(manifest.records)
      ? manifest.records.map((record) => {
          const safeRecord = { ...record }
          delete safeRecord.privatePath
          return safeRecord
        })
      : [],
  }
  delete copy.checksum
  return crypto.createHash('sha256').update(JSON.stringify(copy)).digest('hex')
}

function safeFirestoreMedia(record, ownerUid) {
  return {
    id: record.mediaId,
    kind: record.expectedType,
    storagePath: record.original.storagePath,
    thumbnailPath: '',
    posterPath: '',
    contentType: record.original.contentType,
    sizeBytes: record.original.sizeBytes,
    checksum: record.original.sha256,
    ownerUid,
  }
}

async function inspectStorageObject(bucket, storagePath) {
  const file = bucket.file(storagePath)
  const [exists] = await file.exists()
  if (!exists) return { exists: false, storagePath }
  const [metadata] = await file.getMetadata()
  return {
    contentType: metadata.contentType || '',
    exists: true,
    sha256: metadata.metadata?.sha256 || '',
    sizeBytes: Number(metadata.size || 0),
    storagePath,
  }
}

export async function captureMediaBackup({ bucket, db, manifest }) {
  const records = manifest.records.filter((record) => record.safeToUpload && record.original)
  const entries = await Promise.all(records.map(async (record) => {
    const [snapshot, storage] = await Promise.all([
      db.doc(`couples/${record.coupleId}/memories/${record.memoryId}`).get(),
      inspectStorageObject(bucket, record.original.storagePath),
    ])
    return {
      firestore: {
        exists: snapshot.exists,
        memoryId: record.memoryId,
        path: `couples/${record.coupleId}/memories/${record.memoryId}`,
        redactedReferenceId: record.redactedReferenceId,
        mediaState: snapshot.exists ? snapshot.data()?.mediaState || '' : '',
        hasMedia: snapshot.exists ? Boolean(snapshot.data()?.media) : false,
      },
      storage,
    }
  }))

  return {
    generatedAt: new Date().toISOString(),
    manifestChecksum: manifest.checksum,
    plannedRecords: records.length,
    firestore: entries.map((entry) => entry.firestore),
    storage: entries.map((entry) => entry.storage),
  }
}

export function validatePrivateManifest(privateManifest) {
  const eligible = privateManifest.records.filter((record) => record.safeToUpload)
  for (const record of eligible) {
    if (!record.privatePath || !fs.existsSync(record.privatePath)) {
      throw new Error(`Private file for ${record.redactedReferenceId} is unavailable.`)
    }
    const checksum = crypto.createHash('sha256').update(fs.readFileSync(record.privatePath)).digest('hex')
    if (checksum !== record.original.sha256) {
      throw new Error(`Private file checksum mismatch for ${record.redactedReferenceId}.`)
    }
  }
  return eligible.length
}

export async function runBounded(tasks, concurrency = 3) {
  const taskList = Array.isArray(tasks) ? tasks : []
  const workerCount = Number.isInteger(concurrency) && concurrency > 0 ? Math.min(concurrency, taskList.length || 1) : 0
  if (workerCount === 0) throw new Error('Media apply concurrency must be a positive integer.')
  let nextIndex = 0
  const results = []

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < taskList.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await taskList[currentIndex]()
    }
  })

  await Promise.all(workers)
  return results
}

export async function applyMediaManifest({ bucket, concurrency = 3, db, manifest, ownerUid }) {
  const applyRecord = async (record) => {
    const { sizeBytes, sha256, storagePath } = record.original
    const existing = await inspectStorageObject(bucket, record.original.storagePath)
    if (existing.exists) {
      if (existing.sha256 === sha256 && existing.sizeBytes === sizeBytes) {
        await db.doc(`couples/${record.coupleId}/memories/${record.memoryId}`).set({
          mediaState: 'storage-verified',
          media: safeFirestoreMedia(record, ownerUid),
          schemaVersion: 1,
        }, { merge: true })
        return { bytesUploaded: 0, conflicts: 0, firestoreUpdated: 1, skippedIdentical: 1, uploaded: 0 }
      } else {
        return { bytesUploaded: 0, conflicts: 1, firestoreUpdated: 0, skippedIdentical: 0, uploaded: 0 }
      }
    }

    await bucket.upload(record.privatePath, {
      destination: storagePath,
      resumable: sizeBytes > 8 * 1024 * 1024,
      metadata: {
        contentType: record.original.contentType,
        metadata: {
          ...record.original.storageMetadata,
          ownerUid,
        },
      },
    })

    await db.doc(`couples/${record.coupleId}/memories/${record.memoryId}`).set({
      mediaState: 'storage-verified',
      media: safeFirestoreMedia(record, ownerUid),
      schemaVersion: 1,
    }, { merge: true })
    return { bytesUploaded: sizeBytes, conflicts: 0, firestoreUpdated: 1, skippedIdentical: 0, uploaded: 1 }
  }

  const applyTasks = manifest.records.reduce((tasks, entry) => {
    if (entry.safeToUpload && entry.original) tasks.push(() => applyRecord(entry))
    return tasks
  }, [])
  const outcomes = await runBounded(applyTasks, concurrency)
  return outcomes.reduce(
    (totals, outcome) => ({
      bytesUploaded: totals.bytesUploaded + outcome.bytesUploaded,
      conflicts: totals.conflicts + outcome.conflicts,
      firestoreUpdated: totals.firestoreUpdated + outcome.firestoreUpdated,
      skippedIdentical: totals.skippedIdentical + outcome.skippedIdentical,
      uploaded: totals.uploaded + outcome.uploaded,
    }),
    { bytesUploaded: 0, conflicts: 0, firestoreUpdated: 0, skippedIdentical: 0, uploaded: 0 },
  )
}
