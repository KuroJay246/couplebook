import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MOBILE_QUEUE_STATUS,
  buildVerifiedMediaRecord,
  createAssetFingerprint,
  createMobileQueueItem,
  createSafeMediaFilename,
  summarizeMobileQueueItems,
  validateMobileMediaAsset,
} from '../src/services/mobile-media-core.mjs';

test('validateMobileMediaAsset accepts supported images and videos', () => {
  const image = validateMobileMediaAsset({
    fileName: 'birthday-photo.JPG',
    fileSize: 1024 * 1024,
    mimeType: 'image/jpeg',
    type: 'image',
    uri: 'file:///photo.jpg',
    width: 1200,
    height: 900,
  });
  assert.equal(image.kind, 'image');
  assert.equal(image.extension, 'jpg');

  const video = validateMobileMediaAsset({
    duration: 7000,
    fileName: 'memory.mp4',
    fileSize: 20 * 1024 * 1024,
    mimeType: 'video/mp4',
    type: 'video',
    uri: 'file:///memory.mp4',
    width: 1920,
    height: 1080,
  });
  assert.equal(video.kind, 'video');
  assert.equal(video.durationMs, 7000);
});

test('validateMobileMediaAsset rejects unsupported media', () => {
  assert.throws(
    () =>
      validateMobileMediaAsset({
        fileName: 'memory.mov',
        fileSize: 2048,
        mimeType: 'video/quicktime',
        type: 'video',
        uri: 'file:///memory.mov',
      }),
    /Only JPG, PNG, WEBP, GIF, MP4, and WEBM files are supported\./,
  );
});

test('createMobileQueueItem normalizes queue metadata', () => {
  const item = createMobileQueueItem({
    assetId: 'abc123',
    fileName: 'our-trip.webp',
    fileSize: 2500,
    mimeType: 'image/webp',
    type: 'image',
    uri: 'file:///trip.webp',
    width: 500,
    height: 300,
  });

  assert.equal(item.mediaType, 'image');
  assert.equal(item.status, MOBILE_QUEUE_STATUS.selected);
  assert.equal(item.title, 'Our Trip');
  assert.match(item.safeFileName, /\.webp$/);
});

test('createAssetFingerprint uses stable identifying fields', () => {
  const fingerprint = createAssetFingerprint({
    assetId: 'asset_1',
    duration: 0,
    fileName: 'memory.png',
    fileSize: 512,
    mimeType: 'image/png',
    uri: 'file:///memory.png',
  });

  assert.equal(
    fingerprint,
    'asset_1::memory.png::image/png::512::0',
  );
});

test('buildVerifiedMediaRecord keeps safe Couple Book storage paths', () => {
  const record = buildVerifiedMediaRecord({
    checksum: 'a'.repeat(64),
    contentType: 'image/jpeg',
    coupleId: 'couple_alpha',
    kind: 'image',
    mediaId: 'media_1',
    sizeBytes: 2048,
  });

  assert.equal(record.storagePath, 'couples/couple_alpha/media/media_1/original');
  assert.equal(record.kind, 'image');
});

test('createSafeMediaFilename strips unsafe name content', () => {
  const filename = createSafeMediaFilename({
    checksum: 'abc123def456',
    date: '2026-08-24',
    entityId: 'upload_1',
    extension: 'JPG',
    originalDisplayName: '../My Birthday!!.JPG',
  });

  assert.equal(filename, '20260824_upload_1_my-birthday_abc123de.jpg');
});

test('summarizeMobileQueueItems counts queue states', () => {
  const summary = summarizeMobileQueueItems([
    { sizeBytes: 100, status: MOBILE_QUEUE_STATUS.selected },
    { sizeBytes: 200, status: MOBILE_QUEUE_STATUS.uploading },
    { sizeBytes: 300, status: MOBILE_QUEUE_STATUS.complete },
    { sizeBytes: 400, status: MOBILE_QUEUE_STATUS.failed },
    { sizeBytes: 500, status: MOBILE_QUEUE_STATUS.cancelled },
  ]);

  assert.deepEqual(summary, {
    active: 1,
    bytes: 1500,
    cancelled: 1,
    complete: 1,
    failed: 1,
    ready: 1,
    total: 5,
  });
});
