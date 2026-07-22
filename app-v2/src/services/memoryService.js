import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { readLegacyMemories } from '../data/legacyMemoryAdapter.js'
import { db } from '../lib/firebaseClient.js'
import { memoriesPath, pathToString } from './firestorePaths.js'
import { readCollection, rejectUnsafeMediaReference, requireSchemaVersion, safeString, safeStringArray } from './firestoreReaders.js'

const SAFE_STORAGE_PATH = /^couples\/[A-Za-z0-9_-]{1,120}\/media\/[A-Za-z0-9_-]{1,120}\/(original|thumbnail|poster)$/
const SAFE_MEDIA_ID = /^[A-Za-z0-9_-]{1,120}$/

function normalizeStorageMedia(data, warnings) {
  if (data.mediaState !== 'storage-verified') return null
  const media = data.media && typeof data.media === 'object' ? data.media : null
  if (!media) {
    warnings.push('A verified media record was missing its media metadata.')
    return null
  }

  const id = safeString(media.id, 120)
  const kind = safeString(media.kind, 20)
  const storagePath = safeString(media.storagePath, 260)
  const thumbnailPath = safeString(media.thumbnailPath, 260)
  const posterPath = safeString(media.posterPath, 260)
  if (!SAFE_MEDIA_ID.test(id) || !['image', 'video'].includes(kind) || !SAFE_STORAGE_PATH.test(storagePath)) {
    warnings.push('A verified media record had invalid storage metadata and was withheld.')
    return null
  }

  return {
    id,
    kind,
    storagePath,
    thumbnailPath: thumbnailPath && SAFE_STORAGE_PATH.test(thumbnailPath) ? thumbnailPath : '',
    posterPath: posterPath && SAFE_STORAGE_PATH.test(posterPath) ? posterPath : '',
    contentType: safeString(media.contentType, 80),
    sizeBytes: Number.isSafeInteger(media.sizeBytes) && media.sizeBytes >= 0 ? media.sizeBytes : 0,
    checksum: safeString(media.checksum, 128),
  }
}

export function buildMemoryCollectionPath(coupleId) {
  return pathToString(memoriesPath(coupleId))
}

export async function getLegacyMemories(options = {}) {
  const read = options.readLegacyMemories || readLegacyMemories
  return read(options)
}

export async function getFirestoreMemories() {
  return createCompatibilityResult({
    status: 'unavailable',
    source: FIRESTORE_SOURCE,
    warnings: ['Firestore memory reads stay deferred until a narrow approved Couple Book memory schema exists.'],
  })
}

export function normalizeFirestoreMemory(id, data, warnings) {
  if (!requireSchemaVersion(data, warnings)) return null
  const mediaState = safeString(data.mediaState, 60)
  const storageMedia = normalizeStorageMedia(data, warnings)
  const mediaReference = rejectUnsafeMediaReference(data.mediaReference)
  if (data.mediaReference && !mediaReference) {
    warnings.push('A memory media reference was unsafe and was withheld.')
  }
  return {
    id,
    title: safeString(data.title, 180),
    description: safeString(data.description, 2000),
    date: safeString(data.date, 60),
    tags: safeStringArray(data.tags, 30, 60),
    media: storageMedia || (mediaState === 'private-legacy-reference' ? 'private-legacy-reference' : mediaReference),
    mediaState: mediaState || 'none',
    isVideo: data.isVideo === true,
    isSpecialPage: Boolean(data.specialMomentType),
    pageUrl: safeString(data.specialMomentType, 40),
    migratedFromLegacy: data.migratedFromLegacy === true,
    schemaVersion: data.schemaVersion,
    status: safeString(data.status, 40) === 'archived' ? 'archived' : 'active',
  }
}

export async function getFirestoreMemoriesForCouple(coupleId, options = {}) {
  const result = await readCollection({
    firestore: options.firestore || db,
    path: memoriesPath(coupleId),
    getCollection: options.getCollection,
    normalizeEntry: normalizeFirestoreMemory,
  })

  return createCompatibilityResult({
    status: result.status,
    source: FIRESTORE_SOURCE,
    data: {
      hasBaseDataset: result.status === 'ready',
      memories: result.data?.entries || [],
      customMemoryCount: 0,
      overriddenMemoryCount: 0,
      deletedMemoryCount: 0,
    },
    warnings: result.warnings,
  })
}
