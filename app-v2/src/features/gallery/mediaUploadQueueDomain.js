export const QUEUE_STATUS = Object.freeze({
  queued: 'queued',
  validating: 'validating',
  hashing: 'hashing',
  duplicate: 'duplicate',
  possibleDuplicate: 'possible-duplicate',
  ready: 'ready',
  uploading: 'uploading',
  finalizing: 'finalizing',
  orphanedUpload: 'orphaned-upload',
  reconnectRequired: 'reconnect-required',
  cancelling: 'cancelling',
  cancelled: 'cancelled',
  failed: 'failed',
  saved: 'saved',
})

const ACTIVE_STATUSES = new Set([
  QUEUE_STATUS.validating,
  QUEUE_STATUS.hashing,
  QUEUE_STATUS.ready,
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
    if (item.status === QUEUE_STATUS.duplicate) summary.duplicate += 1
    if (item.status === QUEUE_STATUS.possibleDuplicate) summary.possibleDuplicate += 1
    if (item.status === QUEUE_STATUS.orphanedUpload) summary.orphaned += 1
    if (ACTIVE_STATUSES.has(item.status)) summary.active += 1
    return summary
  }, { active: 0, bytes: 0, cancelled: 0, duplicate: 0, failed: 0, orphaned: 0, possibleDuplicate: 0, queued: 0, saved: 0, total: 0 })
}

export function queueStatusLabel(status) {
  if (status === QUEUE_STATUS.validating) return 'Validating'
  if (status === QUEUE_STATUS.hashing) return 'Hashing'
  if (status === QUEUE_STATUS.duplicate) return 'Duplicate blocked'
  if (status === QUEUE_STATUS.possibleDuplicate) return 'Possible duplicate'
  if (status === QUEUE_STATUS.ready) return 'Ready'
  if (status === QUEUE_STATUS.uploading) return 'Uploading'
  if (status === QUEUE_STATUS.finalizing) return 'Finalizing'
  if (status === QUEUE_STATUS.orphanedUpload) return 'Finalize upload'
  if (status === QUEUE_STATUS.reconnectRequired) return 'Reconnect Drive'
  if (status === QUEUE_STATUS.cancelling) return 'Cancelling'
  if (status === QUEUE_STATUS.cancelled) return 'Cancelled'
  if (status === QUEUE_STATUS.failed) return 'Needs review'
  if (status === QUEUE_STATUS.saved) return 'Saved'
  return 'Queued'
}

export function queueStatusTone(status) {
  if (status === QUEUE_STATUS.saved) return 'success'
  if ([QUEUE_STATUS.failed, QUEUE_STATUS.duplicate].includes(status)) return 'error'
  if ([QUEUE_STATUS.orphanedUpload, QUEUE_STATUS.reconnectRequired, QUEUE_STATUS.possibleDuplicate].includes(status)) return 'warning'
  if (status === QUEUE_STATUS.cancelled) return 'warning'
  if ([QUEUE_STATUS.uploading, QUEUE_STATUS.finalizing, QUEUE_STATUS.hashing].includes(status)) return 'info'
  return 'neutral'
}

export function isRetryableFailurePhase(phase) {
  return phase !== QUEUE_STATUS.validating
}

export { ACTIVE_STATUSES }
