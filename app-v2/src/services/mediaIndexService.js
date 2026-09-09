import { COUPLE_BOOK_DRIVE_FOLDER_ID } from './googleDriveMediaProvider.js'
import { mediaItemPath, mediaItemsPath, mediaSyncStatePath, pathToString } from './firestorePaths.js'
import { safeString } from './firestoreReaders.js'

export const MEDIA_INDEX_PROVIDER = 'google-drive'
export const MEDIA_INDEX_SCHEMA_VERSION = 1
export const MEDIA_SYNC_SCHEMA_VERSION = 1

export const MEDIA_SYNC_STATUS = Object.freeze({
  current: 'current',
  actionRequired: 'action-required',
  error: 'error',
  indexing: 'indexing',
  stale: 'stale',
})

const SAFE_DRIVE_ID = /^[A-Za-z0-9_-]{10,200}$/
const SAFE_MEDIA_ID = /^[A-Za-z0-9_-]{1,120}$/
const SUPPORTED_DRIVE_MEDIA_PREFIXES = Object.freeze(['image/', 'video/'])
const UNSAFE_PERSISTED_URL_KEYS = Object.freeze([
  'accessToken',
  'blobUrl',
  'downloadUrl',
  'objectUrl',
  'previewUrl',
  'refreshToken',
  'signedUrl',
  'thumbnailLink',
  'token',
  'webContentLink',
])

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isSupportedDriveMedia(mimeType) {
  const normalized = safeString(mimeType, 120)
  return SUPPORTED_DRIVE_MEDIA_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}

function mediaTypeFromMime(mimeType) {
  if (String(mimeType || '').startsWith('video/')) return 'video'
  if (String(mimeType || '').startsWith('image/')) return 'image'
  return ''
}

function stableMediaIdFromDriveFileId(driveFileId) {
  const id = safeString(driveFileId, 200)
  if (!SAFE_DRIVE_ID.test(id)) return ''
  const mediaId = `drive_${id}`.slice(0, 120)
  return SAFE_MEDIA_ID.test(mediaId) ? mediaId : ''
}

function numberOrNull(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null
}

function integerOrNull(value) {
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : null
}

function firstSafeDate(...values) {
  for (const value of values) {
    const text = safeString(value, 40)
    if (/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z?)?$/.test(text)) return text
  }
  return ''
}

function containsUnsafePersistentUrls(data) {
  if (!isPlainObject(data)) return false
  return UNSAFE_PERSISTED_URL_KEYS.some((key) => Boolean(data[key]))
}

export function buildMediaIndexCollectionPath(coupleId) {
  return pathToString(mediaItemsPath(coupleId))
}

export function buildMediaIndexDocumentPath(coupleId, mediaId) {
  return pathToString(mediaItemPath(coupleId, mediaId))
}

export function buildMediaSyncStateDocumentPath(coupleId) {
  return pathToString(mediaSyncStatePath(coupleId, MEDIA_INDEX_PROVIDER))
}

export function driveFileToMediaIndexRecord(file, { coupleId, folderId = COUPLE_BOOK_DRIVE_FOLDER_ID, memoryId = '' } = {}) {
  const driveFileId = safeString(file?.id, 200)
  const mimeType = safeString(file?.mimeType, 120)
  const mediaType = mediaTypeFromMime(mimeType)
  const mediaId = stableMediaIdFromDriveFileId(driveFileId)

  if (!safeString(coupleId, 120)) throw new Error('coupleId is required for indexed media.')
  if (!mediaId || !isSupportedDriveMedia(mimeType)) return null

  const imageMetadata = isPlainObject(file.imageMediaMetadata) ? file.imageMediaMetadata : {}
  const videoMetadata = isPlainObject(file.videoMediaMetadata) ? file.videoMediaMetadata : {}

  return {
    schemaVersion: MEDIA_INDEX_SCHEMA_VERSION,
    mediaId,
    coupleId: safeString(coupleId, 120),
    memoryId: safeString(memoryId, 120),
    provider: MEDIA_INDEX_PROVIDER,
    driveFileId,
    driveFolderId: safeString(folderId, 200),
    mimeType,
    mediaType,
    fileName: safeString(file.name || file.title, 240),
    createdTime: firstSafeDate(file.createdTime),
    modifiedTime: firstSafeDate(file.modifiedTime),
    capturedAt: firstSafeDate(imageMetadata.time, videoMetadata.time, file.createdTime),
    width: integerOrNull(imageMetadata.width || videoMetadata.width),
    height: integerOrNull(imageMetadata.height || videoMetadata.height),
    durationMillis: mediaType === 'video' ? integerOrNull(videoMetadata.durationMillis) : null,
    sizeBytes: integerOrNull(file.size),
    checksum: safeString(file.md5Checksum, 64),
    favorite: false,
    caption: '',
    linkedMemoryId: safeString(memoryId, 120),
    syncStatus: 'indexed',
    deleted: false,
  }
}

export function buildMediaIndexRecordsFromDriveFiles(files = [], options = {}) {
  const byId = new Map()
  for (const file of Array.isArray(files) ? files : []) {
    const record = driveFileToMediaIndexRecord(file, options)
    if (!record) continue
    if (!byId.has(record.mediaId)) byId.set(record.mediaId, record)
  }
  return Object.freeze([...byId.values()])
}

export function normalizeMediaIndexRecord(id, data, warnings = []) {
  if (!isPlainObject(data) || data.schemaVersion !== MEDIA_INDEX_SCHEMA_VERSION) {
    warnings.push('Media index record schemaVersion is unsupported.')
    return null
  }
  if (containsUnsafePersistentUrls(data)) {
    warnings.push('Media index record contained a temporary URL or credential field and was withheld.')
    return null
  }

  const mediaId = safeString(data.mediaId || id, 120)
  const driveFileId = safeString(data.driveFileId, 200)
  const driveFolderId = safeString(data.driveFolderId, 200)
  const mimeType = safeString(data.mimeType, 120)
  const mediaType = safeString(data.mediaType, 20) || mediaTypeFromMime(mimeType)
  if (!SAFE_MEDIA_ID.test(mediaId) || !SAFE_DRIVE_ID.test(driveFileId) || !SAFE_DRIVE_ID.test(driveFolderId) || !isSupportedDriveMedia(mimeType) || !['image', 'video'].includes(mediaType)) {
    warnings.push('Media index record had invalid stable Drive metadata and was withheld.')
    return null
  }

  return {
    schemaVersion: MEDIA_INDEX_SCHEMA_VERSION,
    mediaId,
    coupleId: safeString(data.coupleId, 120),
    memoryId: safeString(data.memoryId, 120),
    provider: data.provider === MEDIA_INDEX_PROVIDER ? MEDIA_INDEX_PROVIDER : '',
    driveFileId,
    driveFolderId,
    mimeType,
    mediaType,
    fileName: safeString(data.fileName, 240),
    createdTime: firstSafeDate(data.createdTime),
    modifiedTime: firstSafeDate(data.modifiedTime),
    capturedAt: firstSafeDate(data.capturedAt, data.createdTime),
    width: integerOrNull(data.width),
    height: integerOrNull(data.height),
    durationMillis: mediaType === 'video' ? integerOrNull(data.durationMillis) : null,
    sizeBytes: integerOrNull(data.sizeBytes),
    checksum: safeString(data.checksum, 64),
    favorite: data.favorite === true,
    caption: safeString(data.caption, 500),
    linkedMemoryId: safeString(data.linkedMemoryId, 120),
    syncStatus: safeString(data.syncStatus, 40) || 'indexed',
    deleted: data.deleted === true,
  }
}

function comparable(record) {
  return [
    record.mimeType,
    record.fileName,
    record.modifiedTime,
    record.width,
    record.height,
    record.durationMillis,
    record.sizeBytes,
    record.checksum,
    record.deleted,
  ].join('|')
}

export function reconcileDriveMediaIndex({ driveFiles = [], indexedRecords = [], coupleId, folderId = COUPLE_BOOK_DRIVE_FOLDER_ID } = {}) {
  const driveRecords = buildMediaIndexRecordsFromDriveFiles(driveFiles, { coupleId, folderId })
  const indexedByDriveId = new Map()
  for (const record of Array.isArray(indexedRecords) ? indexedRecords : []) {
    if (record?.driveFileId) indexedByDriveId.set(record.driveFileId, record)
  }

  const missingInIndex = []
  const changed = []
  const unchanged = []
  const seenDriveIds = new Set()

  for (const driveRecord of driveRecords) {
    seenDriveIds.add(driveRecord.driveFileId)
    const indexed = indexedByDriveId.get(driveRecord.driveFileId)
    if (!indexed) {
      missingInIndex.push(driveRecord)
    } else if (comparable({ ...indexed, deleted: false }) !== comparable(driveRecord)) {
      changed.push({ before: indexed, after: driveRecord })
    } else {
      unchanged.push(indexed)
    }
  }

  const missingInDrive = (Array.isArray(indexedRecords) ? indexedRecords : [])
    .filter((record) => record?.provider === MEDIA_INDEX_PROVIDER && record.deleted !== true && !seenDriveIds.has(record.driveFileId))

  return Object.freeze({
    missingInIndex: Object.freeze(missingInIndex),
    missingInDrive: Object.freeze(missingInDrive),
    changed: Object.freeze(changed),
    unchanged: Object.freeze(unchanged),
    summary: Object.freeze({
      driveMediaCount: driveRecords.length,
      indexedCount: Array.isArray(indexedRecords) ? indexedRecords.length : 0,
      missingInIndex: missingInIndex.length,
      missingInDrive: missingInDrive.length,
      changed: changed.length,
      unchanged: unchanged.length,
    }),
  })
}

export function normalizeMediaSyncState(id, data, warnings = []) {
  if (id !== MEDIA_INDEX_PROVIDER || !isPlainObject(data) || data.schemaVersion !== MEDIA_SYNC_SCHEMA_VERSION) {
    warnings.push('Media sync state schemaVersion is unsupported.')
    return null
  }
  if (containsUnsafePersistentUrls(data)) {
    warnings.push('Media sync state contained a credential or temporary URL field and was withheld.')
    return null
  }
  const status = safeString(data.status, 40)
  return {
    schemaVersion: MEDIA_SYNC_SCHEMA_VERSION,
    provider: MEDIA_INDEX_PROVIDER,
    status: Object.values(MEDIA_SYNC_STATUS).includes(status) ? status : MEDIA_SYNC_STATUS.actionRequired,
    driveFolderId: safeString(data.driveFolderId, 200),
    lastSyncAt: firstSafeDate(data.lastSyncAt),
    lastSuccessfulSyncAt: firstSafeDate(data.lastSuccessfulSyncAt),
    changePageToken: safeString(data.changePageToken, 500),
    indexedCount: numberOrNull(data.indexedCount) || 0,
    pendingChangeCount: numberOrNull(data.pendingChangeCount) || 0,
    orphanCount: numberOrNull(data.orphanCount) || 0,
    errorCode: safeString(data.errorCode, 80),
  }
}
