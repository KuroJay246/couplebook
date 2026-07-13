import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { readLegacySettings } from '../data/legacySettingsAdapter.js'
import { buildUserDocumentPath } from './userService.js'

export function buildSettingsDocumentPath(uid) {
  return buildUserDocumentPath(uid)
}

export async function getLegacySettings(options = {}) {
  const read = options.readLegacySettings || readLegacySettings
  return read(options)
}

export async function getFirestoreSettingsByUid() {
  return createCompatibilityResult({
    status: 'unavailable',
    source: FIRESTORE_SOURCE,
    warnings: ['Firestore settings reads remain deferred until the scoped user-settings contract is migrated intentionally.'],
  })
}
