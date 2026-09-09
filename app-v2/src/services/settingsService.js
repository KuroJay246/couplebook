import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { DATA_SOURCE_MODES, resolveDataSourceMode } from '../data/dataSourceMode.js'
import { readLegacySettings } from '../data/legacySettingsAdapter.js'
import { db } from '../lib/firebase.js'
import { pathToString, privateSettingsPath, sharedSettingsPath } from './firestorePaths.js'
import { readDocument, requireSchemaVersion, safeString } from './firestoreReaders.js'

const settingsSourceCache = new Map()

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
    appearanceTheme: safeString(data.appearanceTheme, 40),
    theme: safeString(data.theme, 40),
    anniversaryView: safeString(data.anniversaryView, 40),
    preferredAlbumView: safeString(data.preferredAlbumView, 40),
    liveAlbumCover: safeString(data.liveAlbumCover, 260),
    previewOrder: Array.isArray(data.previewOrder)
      ? data.previewOrder.filter((value) => typeof value === 'string').slice(0, 12)
      : [],
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

function getApprovedUserCoupleId(approvedUser) {
  return approvedUser?.coupleId || approvedUser?.raw?.coupleId || ''
}

function getApprovedUserUid(approvedUser) {
  return approvedUser?.uid || approvedUser?.raw?.uid || ''
}

function hasUsableSettingsSource(source) {
  return source?.status === 'ready' || source?.status === 'partial'
}

export function mergeFirestoreSettingsSources({ privateResult, shared, username }) {
  if (![shared.status, privateResult.status].some((status) => status === 'ready' || status === 'partial')) {
    return privateResult.status === 'invalid' ? privateResult : shared
  }

  const privateData = privateResult.data || {}
  const sharedData = shared.data || {}
  const privateAppearanceTheme = privateData.appearanceTheme || privateData.theme || null
  const sharedAppearanceTheme = sharedData.appearanceTheme || sharedData.theme || null

  return createCompatibilityResult({
    status: hasUsableSettingsSource(privateResult) || hasUsableSettingsSource(shared) ? 'ready' : 'empty',
    source: FIRESTORE_SOURCE,
    data: {
      username,
      appearanceTheme: privateAppearanceTheme || sharedAppearanceTheme || null,
      theme: privateAppearanceTheme || sharedAppearanceTheme || null,
      revision: Number.isInteger(privateData.revision) && privateData.revision > 0 ? privateData.revision : 0,
      usedGlobalThemeFallback: !privateAppearanceTheme && Boolean(sharedAppearanceTheme),
      settings: {
        anniversaryConfig: privateData.anniversaryView || sharedData.anniversaryView || null,
        privacyToggles: {
          localOnlyMode: privateData.privacy?.localOnlyMode === true,
          reducedMotion: privateData.privacy?.reducedMotion === true,
          hideOfflineWarning: false,
          unknownFields: {},
        },
        unknownFields: {},
      },
    },
    warnings: [...(shared.warnings || []), ...(privateResult.warnings || [])],
  })
}

function buildSettingsSourceCacheKey({ approvedUser, coupleId, sourceMode, uid, username }) {
  return [
    sourceMode || DATA_SOURCE_MODES.legacy,
    uid || getApprovedUserUid(approvedUser) || username || '',
    coupleId || getApprovedUserCoupleId(approvedUser) || '',
    username || approvedUser?.username || '',
  ].join(':')
}

function shouldUseSettingsCache(options) {
  return !options.firestore && !options.getDocument && !options.readLegacySettings
}

export function invalidateSettingsSourceCache(options = {}) {
  if (!Object.keys(options).length) {
    settingsSourceCache.clear()
    return
  }

  settingsSourceCache.delete(buildSettingsSourceCacheKey(options))
}

async function readSettingsSource({ approvedUser, coupleId, options, sourceMode, uid, username }) {
  if (sourceMode === DATA_SOURCE_MODES.firestore) {
    if (!coupleId || !uid) {
      return createCompatibilityResult({
        status: 'unavailable',
        source: FIRESTORE_SOURCE,
        warnings: ['Firestore settings require an approved user document with a coupleId.'],
      })
    }

    const [shared, privateResult] = await Promise.all([
      getFirestoreSharedSettings(coupleId, options),
      getFirestorePrivateSettings(coupleId, uid, options),
    ])

    return mergeFirestoreSettingsSources({ privateResult, shared, username })
  }

  return getLegacySettings({
    ...options,
    approvedUser,
    sourceMode,
    username,
  })
}

export async function getSettingsSourceForApprovedUser(options = {}) {
  const approvedUser = options.approvedUser || null
  const sourceMode = options.sourceMode || resolveDataSourceMode()
  const uid = options.uid || getApprovedUserUid(approvedUser)
  const coupleId = options.coupleId || getApprovedUserCoupleId(approvedUser)
  const username = options.username || approvedUser?.username || approvedUser?.displayName || uid
  const cacheKey = buildSettingsSourceCacheKey({ approvedUser, coupleId, sourceMode, uid, username })
  const useCache = shouldUseSettingsCache(options)

  if (useCache && options.forceRefresh) {
    settingsSourceCache.delete(cacheKey)
  }

  if (useCache && settingsSourceCache.has(cacheKey)) {
    return settingsSourceCache.get(cacheKey)
  }

  const sourcePromise = readSettingsSource({ approvedUser, coupleId, options, sourceMode, uid, username })

  if (!useCache) return sourcePromise

  settingsSourceCache.set(cacheKey, sourcePromise)

  try {
    const source = await sourcePromise
    settingsSourceCache.set(cacheKey, Promise.resolve(source))
    return source
  } catch (error) {
    settingsSourceCache.delete(cacheKey)
    throw error
  }
}
