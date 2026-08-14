import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { readLegacySettings } from '../data/legacySettingsAdapter.js'
import { db } from '../lib/firebaseClient.js'
import { pathToString, privateSettingsPath, sharedSettingsPath } from './firestorePaths.js'
import { readDocument, requireSchemaVersion, safeString } from './firestoreReaders.js'

export function buildSettingsDocumentPath(coupleId, uid = 'shared') {
  return uid === 'shared' ? pathToString(sharedSettingsPath(coupleId)) : pathToString(privateSettingsPath(coupleId, uid))
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

export function normalizeFirestoreSettings(id, data, warnings) {
  if (!requireSchemaVersion(data, warnings)) return null
  return {
    id,
    theme: safeString(data.theme, 40),
    anniversaryView: safeString(data.anniversaryView, 40),
    privacy: data.privacy && typeof data.privacy === 'object'
      ? {
          localOnlyMode: data.privacy.localOnlyMode === true,
          reducedMotion: data.privacy.reducedMotion === true,
        }
      : {},
    revision: Number.isInteger(data.revision) && data.revision > 0 ? data.revision : 0,
    schemaVersion: data.schemaVersion,
  }
}

export async function getFirestoreSharedSettings(coupleId, options = {}) {
  return readDocument({
    firestore: options.firestore || db,
    path: sharedSettingsPath(coupleId),
    getDocument: options.getDocument,
    normalize: normalizeFirestoreSettings,
  })
}

export async function getFirestorePrivateSettings(coupleId, uid, options = {}) {
  return readDocument({
    firestore: options.firestore || db,
    path: privateSettingsPath(coupleId, uid),
    getDocument: options.getDocument,
    normalize: normalizeFirestoreSettings,
  })
}
