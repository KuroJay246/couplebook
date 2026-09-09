import assert from 'node:assert/strict'
import test from 'node:test'
import { COUPLE_BOOK_DRIVE_FOLDER_ID } from '../services/googleDriveMediaProvider.js'
import {
  MEDIA_INDEX_PROVIDER,
  buildMediaIndexCollectionPath,
  buildMediaIndexDocumentPath,
  buildMediaIndexRecordsFromDriveFiles,
  buildMediaSyncStateDocumentPath,
  driveFileToMediaIndexRecord,
  getFirestoreMediaIndexForCouple,
  normalizeMediaIndexRecord,
  normalizeMediaSyncState,
  reconcileDriveMediaIndex,
} from '../services/mediaIndexService.js'

function driveFile(overrides = {}) {
  return {
    id: '1F_USpYY9Qi2sIoftCWVjp_uYPdZAnRaa',
    name: 'CB_IMG_0075.jpg',
    mimeType: 'image/jpeg',
    size: '1099262',
    createdTime: '2026-07-22T13:57:17.827Z',
    modifiedTime: '2026-07-22T13:57:17.827Z',
    md5Checksum: '0123456789abcdef0123456789abcdef',
    imageMediaMetadata: {
      width: 1280,
      height: 960,
      time: '2026-07-22T13:57:17Z',
    },
    thumbnailLink: 'https://temporary.example/thumb',
    webViewLink: 'https://drive.google.com/file/d/example/view',
    ...overrides,
  }
}

test('media index paths are couple-scoped and safe', () => {
  assert.equal(buildMediaIndexCollectionPath('couple_alpha'), 'couples/couple_alpha/mediaItems')
  assert.equal(
    buildMediaIndexDocumentPath('couple_alpha', 'drive_1F_USpYY9Qi2sIoftCWVjp_uYPdZAnRaa'),
    'couples/couple_alpha/mediaItems/drive_1F_USpYY9Qi2sIoftCWVjp_uYPdZAnRaa',
  )
  assert.equal(buildMediaSyncStateDocumentPath('couple_alpha'), 'couples/couple_alpha/mediaSync/google-drive')
  assert.throws(() => buildMediaIndexCollectionPath('bad/couple'))
})

test('Firestore media index reader uses the couple-scoped mediaItems collection', async () => {
  const collectionCalls = []
  const result = await getFirestoreMediaIndexForCouple('couple_alpha', {
    readCollection: async ({ path, normalizeEntry }) => {
      collectionCalls.push(path.join('/'))
      const warnings = []
      const normalized = normalizeEntry(
        'drive_1F_USpYY9Qi2sIoftCWVjp_uYPdZAnRaa',
        driveFileToMediaIndexRecord(driveFile(), { coupleId: 'couple_alpha' }),
        warnings,
      )
      return {
        status: 'ready',
        source: 'firestore',
        data: { entries: [normalized] },
        warnings,
      }
    },
  })

  assert.deepEqual(collectionCalls, ['couples/couple_alpha/mediaItems'])
  assert.equal(result.status, 'ready')
  assert.equal(result.data.entries.length, 1)
  assert.equal(result.data.entries[0].driveFileId, '1F_USpYY9Qi2sIoftCWVjp_uYPdZAnRaa')
})

test('Drive files become stable media index records without temporary URLs', () => {
  const record = driveFileToMediaIndexRecord(driveFile(), { coupleId: 'couple_alpha' })
  const serialized = JSON.stringify(record)

  assert.equal(record.provider, MEDIA_INDEX_PROVIDER)
  assert.equal(record.driveFolderId, COUPLE_BOOK_DRIVE_FOLDER_ID)
  assert.equal(record.mediaType, 'image')
  assert.equal(record.fileName, 'CB_IMG_0075.jpg')
  assert.equal(record.width, 1280)
  assert.equal(record.height, 960)
  assert.equal(record.sizeBytes, 1099262)
  assert.equal(record.favorite, false)
  assert.equal(record.deleted, false)
  assert.doesNotMatch(serialized, /temporary|thumbnailLink|webViewLink|accessToken|objectUrl|signedUrl/)
})

test('media index accepts Drive videos and HEIC images but rejects unsupported files', () => {
  const records = buildMediaIndexRecordsFromDriveFiles([
    driveFile({ id: '1LE1Vc1ydOGOFD4j2JghZq_WHPjHsz5db', name: 'CB_VID_0035.mp4', mimeType: 'video/mp4', videoMediaMetadata: { width: '720', height: '1280', durationMillis: '5000' } }),
    driveFile({ id: '1dFhVXirho_suEdz35KtwAIuJdDgXT_Vi', name: 'CB_IMG_0073.heic', mimeType: 'image/heif' }),
    driveFile({ id: '1ignoredUnsupportedFileId', name: 'notes.txt', mimeType: 'text/plain' }),
  ], { coupleId: 'couple_alpha' })

  assert.equal(records.length, 2)
  assert.equal(records[0].mediaType, 'video')
  assert.equal(records[0].durationMillis, 5000)
  assert.equal(records[1].mimeType, 'image/heif')
})

test('media index normalizer rejects temporary URL and credential fields', () => {
  const warnings = []
  const valid = normalizeMediaIndexRecord('drive_1F_USpYY9Qi2sIoftCWVjp_uYPdZAnRaa', {
    ...driveFileToMediaIndexRecord(driveFile(), { coupleId: 'couple_alpha' }),
    caption: 'Safe caption',
    favorite: true,
  }, warnings)

  assert.equal(valid.favorite, true)
  assert.equal(valid.caption, 'Safe caption')
  assert.deepEqual(warnings, [])

  const unsafeWarnings = []
  const unsafe = normalizeMediaIndexRecord('drive_unsafe', {
    ...driveFileToMediaIndexRecord(driveFile(), { coupleId: 'couple_alpha' }),
    previewUrl: 'blob:http://localhost/private',
  }, unsafeWarnings)

  assert.equal(unsafe, null)
  assert.match(unsafeWarnings.join(' '), /temporary URL|credential/)
})

test('media reconciliation finds missing indexed files, missing Drive files, and changed metadata', () => {
  const existing = driveFileToMediaIndexRecord(driveFile(), { coupleId: 'couple_alpha' })
  const changedDriveFile = driveFile({ id: existing.driveFileId, modifiedTime: '2026-07-23T00:00:00.000Z' })
  const newDriveFile = driveFile({ id: '1LE1Vc1ydOGOFD4j2JghZq_WHPjHsz5db', name: 'CB_VID_0035.mp4', mimeType: 'video/mp4' })
  const deletedIndexRecord = driveFileToMediaIndexRecord(driveFile({ id: '1DeletedDriveFileStableId' }), { coupleId: 'couple_alpha' })

  const reconciliation = reconcileDriveMediaIndex({
    coupleId: 'couple_alpha',
    driveFiles: [changedDriveFile, newDriveFile],
    indexedRecords: [existing, deletedIndexRecord],
  })

  assert.equal(reconciliation.summary.missingInIndex, 1)
  assert.equal(reconciliation.summary.missingInDrive, 1)
  assert.equal(reconciliation.summary.changed, 1)
  assert.equal(reconciliation.missingInIndex[0].driveFileId, newDriveFile.id)
  assert.equal(reconciliation.missingInDrive[0].driveFileId, deletedIndexRecord.driveFileId)
})

test('media sync state stores only privacy-safe cursor and health metadata', () => {
  const warnings = []
  const state = normalizeMediaSyncState('google-drive', {
    schemaVersion: 1,
    status: 'current',
    driveFolderId: COUPLE_BOOK_DRIVE_FOLDER_ID,
    lastSyncAt: '2026-09-09T12:00:00.000Z',
    lastSuccessfulSyncAt: '2026-09-09T12:00:00.000Z',
    changePageToken: 'safe_cursor_token',
    indexedCount: 75,
    pendingChangeCount: 0,
    orphanCount: 1,
  }, warnings)

  assert.equal(state.status, 'current')
  assert.equal(state.indexedCount, 75)
  assert.equal(state.orphanCount, 1)
  assert.deepEqual(warnings, [])

  const unsafeWarnings = []
  const unsafe = normalizeMediaSyncState('google-drive', {
    schemaVersion: 1,
    status: 'current',
    accessToken: 'must-not-persist',
  }, unsafeWarnings)
  assert.equal(unsafe, null)
  assert.match(unsafeWarnings.join(' '), /credential|temporary URL/)
})
