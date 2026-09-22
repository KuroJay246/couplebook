import assert from 'node:assert/strict'
import test from 'node:test'
import { buildGalleryReadModelWithMediaIndex } from '../features/gallery/galleryReadModel.js'
import { groupGalleryItemsByDate, selectFilteredGalleryItems, selectMediaIndexGalleryItems } from '../features/gallery/gallerySelectors.js'

function createMediaRecord(overrides = {}) {
  return {
    mediaId: 'media_photo_one',
    provider: 'google-drive',
    driveFileId: 'drive-file-one',
    mediaType: 'image',
    mimeType: 'image/jpeg',
    fileName: 'private-photo.jpg',
    capturedAt: '2026-07-20T12:00:00.000Z',
    sizeBytes: 1234,
    deleted: false,
    ...overrides,
  }
}

test('gallery read model uses indexed Drive media as the active Album source only', () => {
  const model = buildGalleryReadModelWithMediaIndex({
    mediaIndexSource: {
      status: 'ready',
      source: 'firestore',
      data: {
        entries: [
          createMediaRecord(),
          createMediaRecord({
            mediaId: 'media_video_one',
            driveFileId: 'drive-file-two',
            mediaType: 'video',
            mimeType: 'video/mp4',
            fileName: 'private-video.mp4',
            capturedAt: '2026-07-21T12:00:00.000Z',
            favorite: true,
            durationMillis: 23000,
          }),
          createMediaRecord({ mediaId: 'deleted', driveFileId: 'deleted-file', deleted: true }),
        ],
      },
      warnings: [],
    },
  })

  assert.equal(model.status, 'ready')
  assert.equal(model.items.length, 2)
  assert.equal(model.photos.length, 1)
  assert.equal(model.videos.length, 1)
  assert.equal(model.summary.indexedDriveMedia, 2)
  assert.equal(model.archiveReferenceItems.length, 0)
  assert.equal(model.memoryItems.length, 0)
  assert.equal(model.sourceStatus.reconciliation.authoritativeIndexedCount, 2)
  assert.doesNotMatch(JSON.stringify(model), /Story|timeline|private-legacy-reference|mediaPath/)
})

test('gallery selectors filter, search, and group indexed Drive media without temporary URLs', () => {
  const items = selectMediaIndexGalleryItems([
    createMediaRecord({ mediaId: 'photo', caption: 'Beach afternoon', capturedAt: '2026-07-20T12:00:00.000Z' }),
    createMediaRecord({ mediaId: 'video', mediaType: 'video', mimeType: 'video/mp4', capturedAt: '2026-07-21T12:00:00.000Z', favorite: true }),
  ])

  assert.equal(selectFilteredGalleryItems(items, { filter: 'photos' }).length, 1)
  assert.equal(selectFilteredGalleryItems(items, { filter: 'videos' }).length, 1)
  assert.equal(selectFilteredGalleryItems(items, { filter: 'favorites' }).length, 1)
  assert.equal(selectFilteredGalleryItems(items, { search: 'beach' }).length, 1)
  assert.equal(groupGalleryItemsByDate(items).length, 2)
  assert.doesNotMatch(JSON.stringify(items), /thumbnailLink|downloadUrl|accessToken|refreshToken/)
})
