import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  assertProject,
  buildMediaManifest,
  deterministicMediaId,
  inventoryDerivedPosters,
  inventoryLocalMedia,
  normalizeFilename,
  readLegacyMediaReferences,
} from '../../scripts/lib/media-mapping.mjs'

test('media mapping normalizes filenames and deterministic media ids without raw names', () => {
  assert.equal(normalizeFilename('/assets/videos/Video Clip 01.MP4'), 'videoclip01.mp4')
  assert.match(deterministicMediaId('/assets/videos/Video Clip 01.MP4'), /^media_[a-f0-9]{24}$/)
})

test('media manifest classifies exact, duplicate, and missing references safely', () => {
  const localMedia = [
    {
      privatePath: 'C:/private/exact.mp4',
      redactedFileId: 'file1',
      normalizedFilename: 'exact.mp4',
      extension: '.mp4',
      type: 'video',
      supportedUpload: true,
      contentType: 'video/mp4',
      sizeBytes: 10,
      sha256: 'hash1',
      corrupt: false,
    },
    {
      privatePath: 'C:/private/dupe-a.mp4',
      redactedFileId: 'file2',
      normalizedFilename: 'dupe.mp4',
      extension: '.mp4',
      type: 'video',
      supportedUpload: true,
      contentType: 'video/mp4',
      sizeBytes: 10,
      sha256: 'hash2',
      corrupt: false,
    },
    {
      privatePath: 'C:/private/dupe-b.mp4',
      redactedFileId: 'file3',
      normalizedFilename: 'dupe.mp4',
      extension: '.mp4',
      type: 'video',
      supportedUpload: true,
      contentType: 'video/mp4',
      sizeBytes: 10,
      sha256: 'hash3',
      corrupt: false,
    },
  ]
  const references = [
    { memoryId: 'one', mediaId: 'media_one', redactedReferenceId: 'ref1', normalizedFilename: 'exact.mp4', expectedType: 'video' },
    { memoryId: 'two', mediaId: 'media_two', redactedReferenceId: 'ref2', normalizedFilename: 'missing.jpg', expectedType: 'image' },
    { memoryId: 'three', mediaId: 'media_three', redactedReferenceId: 'ref3', normalizedFilename: 'dupe.mp4', expectedType: 'video' },
  ]

  const manifest = buildMediaManifest({ coupleId: 'couple_alpha', localMedia, references })
  assert.equal(manifest.publicManifest.summary.exactMatches, 1)
  assert.equal(manifest.publicManifest.summary.missing, 1)
  assert.equal(manifest.publicManifest.summary.ambiguousMatches, 1)
  assert.equal(manifest.publicManifest.summary.plannedOriginalUploads, 3)
  assert.equal(manifest.privateManifest.checksum, manifest.publicManifest.checksum)
  assert.equal(JSON.stringify(manifest.publicManifest).includes('C:/private'), false)
  assert.equal(JSON.stringify(manifest.privateManifest).includes('C:/private/exact.mp4'), true)
})

test('media inventory reads local files but report construction keeps private paths separable', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'couplebook-media-map-'))
  fs.mkdirSync(path.join(tmp, 'OUR MEMORIES'))
  fs.writeFileSync(path.join(tmp, 'OUR MEMORIES', 'sample.mp4'), Buffer.from([1, 2, 3]))
  const localMedia = inventoryLocalMedia({ repoRoot: tmp, roots: [tmp] })
  assert.equal(localMedia.length, 1)
  assert.equal(localMedia[0].type, 'video')
  assert.equal(localMedia[0].supportedUpload, true)
})

test('media inventory can lock upload source to root files without scanning quarantine subfolders', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'couplebook-media-root-only-'))
  fs.writeFileSync(path.join(tmp, 'CB_VID_0001.mp4'), Buffer.from([1, 2, 3]))
  fs.mkdirSync(path.join(tmp, 'quarantine'), { recursive: true })
  fs.writeFileSync(path.join(tmp, 'quarantine', 'duplicate.mp4'), Buffer.from([1, 2, 3]))

  const localMedia = inventoryLocalMedia({ repoRoot: tmp, rootOnly: true, roots: [tmp] })

  assert.equal(localMedia.length, 1)
  assert.equal(localMedia[0].normalizedFilename, 'cbvid0001.mp4')
})

test('derived poster inventory is ignored publicly but counted for video upload manifests', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'couplebook-media-posters-'))
  const posterRoot = path.join(tmp, '.visual-audit', 'media-derived-current')
  const mediaId = 'media_one'
  fs.mkdirSync(path.join(posterRoot, mediaId), { recursive: true })
  fs.writeFileSync(path.join(posterRoot, mediaId, 'poster.jpg'), Buffer.from([5, 6, 7]))

  const derivedPosters = inventoryDerivedPosters({ repoRoot: tmp, rootDir: posterRoot })
  const localMedia = [{
    privatePath: 'C:/private/exact.mp4',
    redactedFileId: 'file1',
    normalizedFilename: 'exact.mp4',
    extension: '.mp4',
    type: 'video',
    supportedUpload: true,
    contentType: 'video/mp4',
    sizeBytes: 10,
    sha256: 'hash1',
    corrupt: false,
  }]
  const references = [{ memoryId: 'one', mediaId, redactedReferenceId: 'ref1', normalizedFilename: 'exact.mp4', expectedType: 'video' }]
  const manifest = buildMediaManifest({ coupleId: 'couple_alpha', derivedPosters, localMedia, references })

  assert.equal(manifest.publicManifest.summary.plannedPosterFrames, 1)
  assert.equal(manifest.publicManifest.summary.totalBytes, 10)
  assert.equal(JSON.stringify(manifest.publicManifest).includes('.visual-audit'), false)
  assert.equal(JSON.stringify(manifest.privateManifest).includes('.visual-audit'), true)
})

test('legacy references strip BOM and include media records only', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'couplebook-media-refs-'))
  fs.mkdirSync(path.join(tmp, 'core'))
  fs.writeFileSync(
    path.join(tmp, 'core', 'memories.json'),
    `\uFEFF${JSON.stringify([{ id: 'one', media: '/assets/videos/one.mp4' }, { id: 'two', media: '' }])}`,
  )
  const refs = readLegacyMediaReferences({ repoRoot: tmp })
  assert.equal(refs.length, 1)
  assert.equal(refs[0].memoryId, 'one')
})

test('media project lock rejects missing, wrong, and prohibited projects', () => {
  assert.doesNotThrow(() => assertProject('couplebook-97830'))
  assert.throws(() => assertProject(''))
  assert.throws(() => assertProject('gathervibeshub'))
  assert.throws(() => assertProject('some-other-project'))
})

test('media manifest prevents duplicate upload attempts for duplicate canonical candidates', () => {
  const shared = {
    privatePath: 'C:/private/canonical.mp4',
    redactedFileId: 'canonical-one',
    normalizedFilename: 'exact.mp4',
    extension: '.mp4',
    type: 'video',
    supportedUpload: true,
    contentType: 'video/mp4',
    sizeBytes: 3,
    sha256: 'a'.repeat(64),
    corrupt: false,
  }
  const manifest = buildMediaManifest({
    coupleId: 'couple_alpha',
    localMedia: [shared, { ...shared, privatePath: 'C:/private/canonical-copy.mp4', redactedFileId: 'canonical-two' }],
    references: [
      { memoryId: 'one', mediaId: 'media_one', redactedReferenceId: 'ref1', normalizedFilename: 'exact.mp4', expectedType: 'video' },
    ],
  })

  assert.equal(manifest.publicManifest.summary.duplicates, 1)
  assert.equal(manifest.publicManifest.summary.plannedOriginalUploads, 1)
  assert.equal(manifest.publicManifest.summary.duplicateUploadAttemptsPrevented, 0)
})

test('media manifest matches canonical files by private filename aliases without inflating local file counts', () => {
  const manifest = buildMediaManifest({
    coupleId: 'couple_alpha',
    localMedia: [{
      privatePath: 'C:/private/media_hash.mp4',
      redactedFileId: 'canonical-one',
      normalizedFilename: 'mediahash.mp4',
      filenameAliases: ['legacyclip.mp4'],
      extension: '.mp4',
      type: 'video',
      supportedUpload: true,
      contentType: 'video/mp4',
      sizeBytes: 3,
      sha256: 'b'.repeat(64),
      corrupt: false,
    }],
    references: [
      { memoryId: 'one', mediaId: 'media_one', redactedReferenceId: 'ref1', normalizedFilename: 'legacyclip.mp4', expectedType: 'video' },
    ],
  })

  assert.equal(manifest.publicManifest.summary.localFiles, 1)
  assert.equal(manifest.publicManifest.summary.exactMatches, 1)
  assert.equal(manifest.publicManifest.summary.plannedOriginalUploads, 1)
})

test('media manifest counts upload bytes from unique local originals instead of repeated legacy references', () => {
  const localMedia = [{
    privatePath: 'C:/private/canonical.mp4',
    redactedFileId: 'canonical-one',
    normalizedFilename: 'legacya.mp4',
    filenameAliases: ['legacya.mp4', 'legacyb.mp4'],
    extension: '.mp4',
    type: 'video',
    supportedUpload: true,
    contentType: 'video/mp4',
    sizeBytes: 3,
    sha256: 'c'.repeat(64),
    corrupt: false,
  }]
  const manifest = buildMediaManifest({
    coupleId: 'couple_alpha',
    localMedia,
    references: [
      { memoryId: 'one', mediaId: 'media_one', redactedReferenceId: 'ref1', normalizedFilename: 'legacya.mp4', expectedType: 'video' },
      { memoryId: 'two', mediaId: 'media_two', redactedReferenceId: 'ref2', normalizedFilename: 'legacyb.mp4', expectedType: 'video' },
    ],
  })

  assert.equal(manifest.publicManifest.summary.exactMatches, 2)
  assert.equal(manifest.publicManifest.summary.plannedOriginalUploads, 1)
  assert.equal(manifest.publicManifest.summary.duplicateUploadAttemptsPrevented, 1)
  assert.equal(manifest.publicManifest.summary.totalBytes, 3)
})
