import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'
import {
  ACCEPTED_MEDIA_TYPES,
  MAX_UPLOAD_RETRY_ATTEMPTS,
  createMediaEntityId,
  createMediaUploadDraft,
  deleteUploadedMediaSet,
  formatBytes,
  revokePreviewUrl,
  sha256ForFile,
  validateMediaFile,
  waitForPrivateMediaUpload,
  createPrivateMediaUploadTask,
} from '../../services/mediaUploadService.js'
import { ACTIVE_STATUSES, isRetryableFailurePhase, QUEUE_STATUS, summarizeQueueItems } from './mediaUploadQueueDomain.js'

export { QUEUE_STATUS, summarizeQueueItems, isRetryableFailurePhase } from './mediaUploadQueueDomain.js'

const RETRYABLE_STATUSES = new Set([QUEUE_STATUS.failed, QUEUE_STATUS.cancelled])
const FINISHED_STATUSES = new Set([QUEUE_STATUS.saved, QUEUE_STATUS.failed, QUEUE_STATUS.cancelled])
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}

const initialState = Object.freeze({
  items: [],
  notice: { kind: '', message: '' },
})

function createQueueItem(draft) {
  return {
    ...draft,
    attempt: 0,
    bytesTransferred: 0,
    checksum: '',
    createdAt: Date.now(),
    error: '',
    memoryId: '',
    progress: 0,
    retryable: true,
    status: QUEUE_STATUS.queued,
    storagePath: '',
    totalBytes: draft.sizeBytes || 0,
  }
}

function patchItem(item, patch) {
  return { ...item, ...(typeof patch === 'function' ? patch(item) : patch) }
}

export function mediaUploadQueueReducer(state, action) {
  switch (action.type) {
    case 'queue/add':
      return {
        ...state,
        items: [...state.items, ...action.items],
      }
    case 'queue/remove':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.itemId),
      }
    case 'queue/clear-finished':
      return {
        ...state,
        items: state.items.filter((item) => !FINISHED_STATUSES.has(item.status)),
      }
    case 'queue/update-item':
      return {
        ...state,
        items: state.items.map((item) => (
          item.id === action.itemId
            ? patchItem(item, action.patch)
            : item
        )),
      }
    case 'queue/update-notice':
      return {
        ...state,
        notice: action.notice,
      }
    default:
      return state
  }
}

function toMemoryPayload(item) {
  const tags = String(item.tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  return {
    title: item.title,
    description: item.description,
    date: item.date,
    tags,
    kindLabel: item.kindLabel,
    mediaNote: item.mediaNote,
    specialMomentType: 'ordinary',
    revision: 0,
  }
}

function isAbortError(error) {
  const code = String(error?.code || '').toLowerCase()
  return code === 'storage/canceled' || code === 'aborterror'
}

function normalizeQueueError(error, fallbackMessage) {
  const message = String(error?.message || '').trim()
  return message || fallbackMessage
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve())
      return
    }

    setTimeout(resolve, 0)
  })
}

function isLocalUploadTestWindow() {
  if (typeof window === 'undefined') return false
  if (env.VITE_ENABLE_LOCAL_UPLOAD_TEST_HOOKS !== 'true') return false
  const host = String(window.location?.hostname || '')
  return host === '127.0.0.1' || host === 'localhost'
}

function readUploadTestDelay(phase) {
  if (!isLocalUploadTestWindow()) return 0
  const config = window.__COUPLEBOOK_UPLOAD_TEST__
  if (!config || config.enabled !== true || typeof config.phaseDelayMs !== 'object') return 0
  const delay = Number(config.phaseDelayMs[phase] || 0)
  return Number.isFinite(delay) && delay > 0 ? delay : 0
}

function waitForUploadTestDelay(phase) {
  const delay = readUploadTestDelay(phase)
  if (!delay) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, delay))
}

function canStartItem(item) {
  return item && (item.status === QUEUE_STATUS.queued || item.status === QUEUE_STATUS.failed)
}

function canCancelItem(item) {
  return item && ACTIVE_STATUSES.has(item.status)
}

function isRetryableError(status, retryable) {
  return status === QUEUE_STATUS.failed && retryable !== false
}

export function useMediaUploadQueue(onRefresh) {
  const writer = useOwnerWrite(onRefresh)
  const [state, dispatch] = useReducer(mediaUploadQueueReducer, initialState)
  const mountedRef = useRef(true)
  const stateRef = useRef(state)
  const operationRef = useRef(new Map())
  const completedChecksumsRef = useRef(new Set())
  const completedFingerprintsRef = useRef(new Set())

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    mountedRef.current = true
    const operationRegistry = operationRef.current

    return () => {
      mountedRef.current = false
      for (const item of stateRef.current.items) {
        revokePreviewUrl(item.previewUrl)
      }
      for (const operation of operationRegistry.values()) {
        operation.abortController.abort()
        try {
          operation.task?.cancel?.()
        } catch {
          // Best-effort cancellation only.
        }
      }
      operationRegistry.clear()
    }
  }, [])

  const findItem = useCallback((itemId) => stateRef.current.items.find((item) => item.id === itemId) || null, [])

  const updateItem = useCallback((itemId, patch) => {
    dispatch({ type: 'queue/update-item', itemId, patch })
  }, [])

  const setNotice = useCallback((notice) => {
    dispatch({ type: 'queue/update-notice', notice })
  }, [])

  const cleanupOperation = useCallback((itemId) => {
    operationRef.current.delete(itemId)
  }, [])

  const finalizeCancelledItem = useCallback((itemId, message = 'Upload cancelled.') => {
    const item = findItem(itemId)
    if (!item) return
    revokePreviewUrl(item.previewUrl)
    updateItem(itemId, {
      bytesTransferred: 0,
      error: '',
      previewUrl: '',
      progress: 0,
      status: QUEUE_STATUS.cancelled,
      totalBytes: item.sizeBytes || 0,
    })
    setNotice({ kind: 'info', message })
  }, [findItem, setNotice, updateItem])

  const removeUploadedArtifacts = useCallback(async (item) => {
    const paths = [item?.storagePath]
    if (item?.thumbnailPath) paths.push(item.thumbnailPath)
    if (item?.posterPath) paths.push(item.posterPath)
    await deleteUploadedMediaSet(paths)
  }, [])

  const removeSavedAlbumItem = useCallback(async (item) => {
    const memoryId = item?.memoryId || item?.id
    const memoryRevision = item?.memoryRevision ?? item?.revision ?? 0

    if (!memoryId || item?.media?.status !== 'storage-verified') {
      throw new Error('Only verified private media items can be removed from Album.')
    }

    await deleteUploadedMediaSet([
      item.media.storagePath,
      item.media.thumbnailPath,
      item.media.posterPath,
    ])
    return writer.removeMemoryMedia(memoryId, memoryRevision)
  }, [writer])

  const handleProcessingFailure = useCallback(async (itemId, error, fallbackMessage, retryable = true) => {
    const item = findItem(itemId)
    if (!item) return

    if (isAbortError(error)) {
      finalizeCancelledItem(itemId, 'Upload cancelled before completion.')
      return
    }

    if (item.storagePath) {
      try {
        await removeUploadedArtifacts(item)
      } catch {
        // Best-effort cleanup only.
      }
    }

    updateItem(itemId, {
      error: normalizeQueueError(error, fallbackMessage),
      progress: 0,
      retryable,
      status: QUEUE_STATUS.failed,
    })
    setNotice({
      kind: 'error',
      message: normalizeQueueError(error, 'This upload could not be completed.'),
    })
  }, [finalizeCancelledItem, findItem, removeUploadedArtifacts, setNotice, updateItem])

  const processItem = useCallback(async (itemId) => {
    const startingItem = findItem(itemId)
    if (!canStartItem(startingItem)) return

    const abortController = new AbortController()
    const operation = { abortController, cancelRequested: false, task: null }
    operationRef.current.set(itemId, operation)
    let failurePhase = QUEUE_STATUS.validating

    updateItem(itemId, (item) => ({
      attempt: (item.attempt || 0) + 1,
      bytesTransferred: 0,
      error: '',
      progress: 0,
      retryable: true,
      status: QUEUE_STATUS.validating,
      totalBytes: item.sizeBytes || 0,
    }))
    await waitForNextPaint()
    await waitForUploadTestDelay('validating')

    try {
      const current = findItem(itemId)
      const details = validateMediaFile(current.file)

      if (abortController.signal.aborted) {
        finalizeCancelledItem(itemId)
        return
      }

      updateItem(itemId, {
        kind: details.kind,
        progress: 5,
        status: QUEUE_STATUS.hashing,
      })
      failurePhase = QUEUE_STATUS.hashing
      await waitForUploadTestDelay('hashing')

      const checksum = await sha256ForFile(current.file)

      if (abortController.signal.aborted) {
        finalizeCancelledItem(itemId)
        return
      }

      const latest = findItem(itemId)
      if (completedChecksumsRef.current.has(checksum) || completedFingerprintsRef.current.has(latest.fingerprint)) {
        updateItem(itemId, {
          checksum,
          error: 'This file is already saved in the current private Album session.',
          progress: 0,
          retryable: false,
          status: QUEUE_STATUS.failed,
        })
        setNotice({ kind: 'error', message: 'Duplicate private media was blocked before upload.' })
        return
      }

      const mediaId = latest.mediaId || createMediaEntityId('media')
      const { task, verifiedMedia } = createPrivateMediaUploadTask({
        checksum,
        contentType: details.contentType,
        coupleId: writer.approvedUser.coupleId,
        extension: details.extension,
        file: latest.file,
        kind: details.kind,
        mediaId,
        ownerUid: writer.user.uid,
        sizeBytes: details.sizeBytes,
      })

      operation.task = task
      updateItem(itemId, {
        bytesTransferred: 0,
        checksum,
        mediaId,
        progress: 20,
        status: QUEUE_STATUS.uploading,
        storagePath: verifiedMedia.storagePath,
        totalBytes: verifiedMedia.sizeBytes,
      })
      failurePhase = QUEUE_STATUS.uploading

      await waitForPrivateMediaUpload(task, {
        signal: abortController.signal,
        onProgress: ({ bytesTransferred, progress, totalBytes }) => {
          updateItem(itemId, {
            bytesTransferred,
            progress,
            totalBytes,
          })
        },
      })

      if (abortController.signal.aborted) {
        finalizeCancelledItem(itemId)
        return
      }

      updateItem(itemId, {
        progress: 96,
        status: QUEUE_STATUS.finalizing,
      })
      failurePhase = QUEUE_STATUS.finalizing
      await waitForUploadTestDelay('finalizing')

      const finalizedItem = findItem(itemId)
      const result = await writer.createMemoryWithMedia(toMemoryPayload(finalizedItem), verifiedMedia)

      if (operation.cancelRequested) {
        updateItem(itemId, { status: QUEUE_STATUS.cancelling })
        await removeSavedAlbumItem({
          id: result.memoryId,
          media: {
            status: 'storage-verified',
            storagePath: verifiedMedia.storagePath,
            thumbnailPath: verifiedMedia.thumbnailPath,
            posterPath: verifiedMedia.posterPath,
          },
          revision: result.revision || 1,
        })
        finalizeCancelledItem(itemId, 'Upload was cancelled after finalization and removed from Album.')
        return
      }

      completedChecksumsRef.current.add(checksum)
      completedFingerprintsRef.current.add(finalizedItem.fingerprint)
      revokePreviewUrl(finalizedItem.previewUrl)
      updateItem(itemId, {
        bytesTransferred: verifiedMedia.sizeBytes,
        memoryId: result.memoryId,
        previewUrl: '',
        progress: 100,
        retryable: false,
        status: QUEUE_STATUS.saved,
        totalBytes: verifiedMedia.sizeBytes,
      })
      setNotice({
        kind: result.refreshError ? 'info' : 'success',
        message: result.refreshError
          ? `Uploaded ${formatBytes(finalizedItem.sizeBytes)} and saved. Album refresh still needs attention.`
          : `Uploaded ${formatBytes(finalizedItem.sizeBytes)} and saved to Album.`,
      })
    } catch (error) {
      await handleProcessingFailure(
        itemId,
        error,
        'This upload could not be completed.',
        isRetryableFailurePhase(failurePhase),
      )
    } finally {
      cleanupOperation(itemId)
    }
  }, [
    cleanupOperation,
    finalizeCancelledItem,
    findItem,
    handleProcessingFailure,
    removeSavedAlbumItem,
    setNotice,
    updateItem,
    writer,
  ])

  const addFiles = useCallback((fileList) => {
    const nextItems = []
    const errors = []
    const knownFingerprints = new Set(stateRef.current.items.map((item) => item.fingerprint))

    for (const file of Array.from(fileList || [])) {
      try {
        const draft = createMediaUploadDraft(file)
        if (knownFingerprints.has(draft.fingerprint) || completedFingerprintsRef.current.has(draft.fingerprint)) {
          throw new Error('This file is already in the current private Album queue.')
        }
        knownFingerprints.add(draft.fingerprint)
        nextItems.push(createQueueItem(draft))
      } catch (error) {
        errors.push(normalizeQueueError(error, 'A file could not be added to the upload queue.'))
      }
    }

    if (nextItems.length > 0) {
      dispatch({ type: 'queue/add', items: nextItems })
      setNotice({
        kind: errors.length > 0 ? 'info' : 'success',
        message: `${nextItems.length} ${nextItems.length === 1 ? 'file is' : 'files are'} ready for private upload.`,
      })
    } else if (errors.length > 0) {
      setNotice({ kind: 'error', message: errors[0] })
    }
  }, [setNotice])

  const removeItem = useCallback((itemId) => {
    const item = findItem(itemId)
    if (!item) return
    revokePreviewUrl(item.previewUrl)
    dispatch({ type: 'queue/remove', itemId })
  }, [findItem])

  const updateDraft = useCallback((itemId, patch) => {
    updateItem(itemId, (item) => {
      if (ACTIVE_STATUSES.has(item.status) || item.status === QUEUE_STATUS.saved) return item
      return typeof patch === 'function' ? patch(item) : patch
    })
  }, [updateItem])

  const clearCompleted = useCallback(() => {
    for (const item of stateRef.current.items) {
      if (FINISHED_STATUSES.has(item.status)) {
        revokePreviewUrl(item.previewUrl)
      }
    }
    dispatch({ type: 'queue/clear-finished' })
  }, [])

  const cancelItem = useCallback((itemId) => {
    const item = findItem(itemId)
    if (!canCancelItem(item)) return

    const operation = operationRef.current.get(itemId)
    if (!operation) return

    operation.cancelRequested = true
    updateItem(itemId, { status: QUEUE_STATUS.cancelling })

    if (item.status === QUEUE_STATUS.uploading && typeof operation.task?.cancel === 'function') {
      operation.task.cancel()
      return
    }

    operation.abortController.abort()
  }, [findItem, updateItem])

  const retryItem = useCallback(async (itemId) => {
    const item = findItem(itemId)
    if (!item || !isRetryableError(item.status, item.retryable)) return
    if ((item.attempt || 0) >= MAX_UPLOAD_RETRY_ATTEMPTS + 1) {
      setNotice({ kind: 'error', message: 'This item has reached the current retry limit.' })
      return
    }
    updateItem(itemId, {
      error: '',
      progress: 0,
      retryable: true,
      status: QUEUE_STATUS.queued,
    })
    await processItem(itemId)
  }, [findItem, processItem, setNotice, updateItem])

  const startUploads = useCallback(async () => {
    if (!writer.canWrite || !writer.approvedUser?.coupleId || !writer.user?.uid) {
      setNotice({ kind: 'error', message: 'An approved signed-in member is required before uploading media.' })
      return
    }

    const pendingIds = stateRef.current.items
      .filter((item) => item.status === QUEUE_STATUS.queued || item.status === QUEUE_STATUS.failed)
      .map((item) => item.id)

    if (pendingIds.length === 0) {
      setNotice({ kind: 'info', message: 'Add files to the queue before starting uploads.' })
      return
    }

    setNotice({ kind: 'info', message: 'Uploading private media and saving memory records…' })
    for (const itemId of pendingIds) {
      if (!mountedRef.current) return
      await processItem(itemId)
    }
  }, [processItem, setNotice, writer])

  const removeSavedItem = useCallback(async (item) => {
    setNotice({ kind: 'info', message: `Removing ${item.title} from Album…` })
    const result = await removeSavedAlbumItem(item)
    setNotice({
      kind: result?.refreshError ? 'info' : 'success',
      message: result?.refreshError
        ? `${item.title} was removed, but Album refresh still needs attention.`
        : `${item.title} was removed from Album.`,
    })
  }, [removeSavedAlbumItem, setNotice])

  const summary = useMemo(() => summarizeQueueItems(state.items), [state.items])
  const isUploading = summary.active > 0

  return {
    acceptedTypes: ACCEPTED_MEDIA_TYPES,
    addFiles,
    canUpload: writer.canWrite,
    cancelItem,
    clearCompleted,
    isUploading,
    items: state.items,
    notice: state.notice,
    removeItem,
    removeSavedItem,
    retryItem,
    startUploads,
    summary,
    updateDraft,
  }
}
