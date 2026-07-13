import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'

export function buildCoupleDocumentPath(coupleId) {
  const normalizedId = String(coupleId || '').trim()
  if (!normalizedId) throw new Error('A future coupleId is required before building Couple Book couple paths.')
  return `couples/${normalizedId}`
}

export async function getCoupleDocumentSnapshot() {
  return createCompatibilityResult({
    status: 'unavailable',
    source: FIRESTORE_SOURCE,
    warnings: ['Couple document reads remain deferred until the Couple Book couple schema is approved.'],
  })
}
