export const QUEUE_STATUS = Object.freeze({
  queued: 'queued',
  validating: 'validating',
  hashing: 'hashing',
  uploading: 'uploading',
  finalizing: 'finalizing',
  cancelling: 'cancelling',
  cancelled: 'cancelled',
  failed: 'failed',
  saved: 'saved',
})

const ACTIVE_STATUSES = new Set([
  QUEUE_STATUS.validating,
  QUEUE_STATUS.hashing,
  QUEUE_STATUS.uploading,
  QUEUE_STATUS.finalizing,
  QUEUE_STATUS.cancelling,
])

export function summarizeQueueItems(items) {
  return items.reduce((summary, item) => {
    summary.total += 1
    summary.bytes += item.sizeBytes || 0
    if (item.status === QUEUE_STATUS.saved) summary.saved += 1
    if (item.status === QUEUE_STATUS.failed) summary.failed += 1
    if (item.status === QUEUE_STATUS.cancelled) summary.cancelled += 1
    if (item.status === QUEUE_STATUS.queued) summary.queued += 1
    if (ACTIVE_STATUSES.has(item.status)) summary.active += 1
    return summary
  }, { active: 0, bytes: 0, cancelled: 0, failed: 0, queued: 0, saved: 0, total: 0 })
}

export function isRetryableFailurePhase(phase) {
  return phase !== QUEUE_STATUS.validating
}

export { ACTIVE_STATUSES }
