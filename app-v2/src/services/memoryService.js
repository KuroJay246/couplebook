import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { readLegacyMemories } from '../data/legacyMemoryAdapter.js'
import { buildCoupleDocumentPath } from './coupleService.js'

export function buildMemoryCollectionPath(coupleId) {
  return `${buildCoupleDocumentPath(coupleId)}/memories`
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
