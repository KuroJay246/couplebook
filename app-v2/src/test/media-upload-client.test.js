import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildVerifiedMediaRecord,
  createMediaUploadDraft,
  formatBytes,
  validateMediaFile,
} from '../services/mediaUploadService.js'

test('client media upload service accepts supported private media files and creates safe drafts', () => {
  const image = new File([new Uint8Array([1, 2, 3])], 'our_trip-photo.JPG', { type: 'image/jpeg' })
  const draft = createMediaUploadDraft(image)

  assert.equal(draft.kind, 'image')
  assert.equal(draft.kindLabel, 'Photo Memory')
  assert.equal(draft.title, 'Our Trip Photo')
  assert.equal(draft.extension, 'jpg')
  assert.match(draft.date, /^\d{4}-\d{2}-\d{2}$/)
})

test('client media upload service rejects unsupported files and formats verified record metadata', () => {
  const unsupported = new File([new Uint8Array([1, 2, 3])], 'unsafe.exe', { type: 'application/octet-stream' })
  assert.throws(() => validateMediaFile(unsupported), /Only JPG, PNG, WEBP, GIF, MP4, and WEBM files are supported\./)

  const unsupportedMov = new File([new Uint8Array([1, 2, 3])], 'legacy.mov', { type: 'video/quicktime' })
  assert.throws(() => validateMediaFile(unsupportedMov), /Only JPG, PNG, WEBP, GIF, MP4, and WEBM files are supported\./)

  const verified = buildVerifiedMediaRecord({
    checksum: 'a'.repeat(64),
    contentType: 'video/mp4',
    coupleId: 'couple_alpha',
    extension: 'mp4',
    kind: 'video',
    mediaId: 'media_001',
    sizeBytes: 4096,
  })

  assert.equal(verified.storagePath, 'couples/couple_alpha/media/media_001/original')
  assert.equal(verified.posterPath, '')
  assert.equal(formatBytes(4096), '4.0 KB')
})
