import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { readLegacyMemories } from '../data/legacyMemoryAdapter.js'
import { db } from '../lib/firebaseClient.js'
import { memoriesPath, pathToString } from './firestorePaths.js'
import { readCollection, rejectUnsafeMediaReference, requireSchemaVersion, safeString, safeStringArray } from './firestoreReaders.js'

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
    media: mediaState === 'private-legacy-reference' ? 'private-legacy-reference' : mediaReference,
    mediaState: mediaState || 'none',
    isVideo: data.isVideo === true,
    isSpecialPage: Boolean(data.specialMomentType),
    pageUrl: safeString(data.specialMomentType, 40),
    migratedFromLegacy: data.migratedFromLegacy === true,
    schemaVersion: data.schemaVersion,
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
