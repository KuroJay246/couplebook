import assert from 'node:assert/strict'
import test from 'node:test'
import {
  QUEUE_STATUS,
  isRetryableFailurePhase,
  queueStatusLabel,
  queueStatusTone,
  summarizeQueueItems,
} from '../features/gallery/mediaUploadQueueDomain.js'

test('hashing, uploading, and finalizing failures remain retryable', () => {
  assert.equal(isRetryableFailurePhase(QUEUE_STATUS.validating), false)
  assert.equal(isRetryableFailurePhase(QUEUE_STATUS.hashing), true)
  assert.equal(isRetryableFailurePhase(QUEUE_STATUS.uploading), true)
  assert.equal(isRetryableFailurePhase(QUEUE_STATUS.finalizing), true)
})

test('queue summary counts queued, active, cancelled, failed, and saved items correctly', () => {
  const summary = summarizeQueueItems([
    { sizeBytes: 10, status: QUEUE_STATUS.queued },
    { sizeBytes: 20, status: QUEUE_STATUS.validating },
    { sizeBytes: 30, status: QUEUE_STATUS.failed },
    { sizeBytes: 40, status: QUEUE_STATUS.cancelled },
    { sizeBytes: 50, status: QUEUE_STATUS.saved },
  ])

  assert.deepEqual(summary, {
    active: 1,
    bytes: 150,
    cancelled: 1,
    duplicate: 0,
    failed: 1,
    orphaned: 0,
    possibleDuplicate: 0,
    queued: 1,
    saved: 1,
    total: 5,
  })
})

test('queue domain owns stable user-facing status labels and tones', () => {
  assert.equal(queueStatusLabel(QUEUE_STATUS.queued), 'Queued')
  assert.equal(queueStatusLabel(QUEUE_STATUS.duplicate), 'Duplicate blocked')
  assert.equal(queueStatusLabel(QUEUE_STATUS.orphanedUpload), 'Finalize upload')
  assert.equal(queueStatusLabel(QUEUE_STATUS.reconnectRequired), 'Reconnect Drive')
  assert.equal(queueStatusLabel(QUEUE_STATUS.failed), 'Needs review')
  assert.equal(queueStatusLabel(QUEUE_STATUS.saved), 'Saved')

  assert.equal(queueStatusTone(QUEUE_STATUS.saved), 'success')
  assert.equal(queueStatusTone(QUEUE_STATUS.failed), 'error')
  assert.equal(queueStatusTone(QUEUE_STATUS.duplicate), 'error')
  assert.equal(queueStatusTone(QUEUE_STATUS.reconnectRequired), 'warning')
  assert.equal(queueStatusTone(QUEUE_STATUS.uploading), 'info')
  assert.equal(queueStatusTone(QUEUE_STATUS.queued), 'neutral')
})
