import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { readLegacyContractState } from '../data/legacyContractAdapter.js'
import { db } from '../lib/firebaseClient.js'
import { currentContractPath, pathToString } from './firestorePaths.js'
import { readDocument, requireSchemaVersion, safeString } from './firestoreReaders.js'

export function buildContractDocumentPath(coupleId) {
  return pathToString(currentContractPath(coupleId))
}

export async function getLegacyContract(options = {}) {
  const read = options.readLegacyContractState || readLegacyContractState
  return read(options)
}

export async function getFirestoreContractByUid() {
  return createCompatibilityResult({
    status: 'unavailable',
    source: FIRESTORE_SOURCE,
    warnings: ['Firestore contract reads remain deferred until the contract domain is migrated without legacy write-back.'],
  })
}

export function normalizeFirestoreContract(id, data, warnings) {
  if (!requireSchemaVersion(data, warnings)) return null
  if (data.signaturePayload || data.signatureBase64 || data.strokeData) {
    warnings.push('Raw contract signature payload is not allowed in app-v2 contract reads.')
    return null
  }
  return {
    id,
    title: safeString(data.title, 160),
    bodyStatus: safeString(data.bodyStatus, 60) || 'unavailable',
    acceptedBy: Array.isArray(data.acceptedBy) ? data.acceptedBy.filter((entry) => typeof entry === 'string').slice(0, 2) : [],
    signatureStatus: safeString(data.signatureStatus, 60) || 'not-connected',
    schemaVersion: data.schemaVersion,
  }
}

export async function getFirestoreContract(coupleId, options = {}) {
  return readDocument({
    firestore: options.firestore || db,
    path: currentContractPath(coupleId),
    getDocument: options.getDocument,
    normalize: normalizeFirestoreContract,
  })
}
