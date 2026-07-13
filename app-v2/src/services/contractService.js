import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { readLegacyContractState } from '../data/legacyContractAdapter.js'
import { buildUserDocumentPath } from './userService.js'

export function buildContractDocumentPath(uid) {
  return buildUserDocumentPath(uid)
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
