import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { loadCompatibilitySnapshot } from '../features/compatibility/compatibilityService.js'

export function getReadOnlySyncContract() {
  return Object.freeze({
    liveFirestoreSync: false,
    automaticWrites: false,
    broadUserQueries: false,
    sourceModel: Object.freeze(['legacy-local-storage', 'legacy-local-dev']),
  })
}

export async function refreshCompatibilityReadModel(options = {}) {
  return loadCompatibilitySnapshot(options)
}

export async function getDeferredCloudSyncStatus() {
  return createCompatibilityResult({
    status: 'unavailable',
    source: FIRESTORE_SOURCE,
    warnings: ['Live synchronization remains disabled in app-v2 while the compatibility bridge stays read-only.'],
  })
}
