import { deleteObject, ref, uploadBytesResumable } from 'firebase/storage'
import { isLocalHostname, readRuntimeEnv } from '../data/adapterUtils.js'
import { storage } from '../lib/firebase.js'

const IMAGE_CONTENT_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const VIDEO_CONTENT_TYPES = Object.freeze(['video/mp4', 'video/webm'])
const IMAGE_EXTENSIONS = Object.freeze(['jpg', 'jpeg', 'png', 'webp', 'gif'])
const VIDEO_EXTENSIONS = Object.freeze(['mp4', 'webm'])
export const ACCEPTED_MEDIA_TYPES = [...IMAGE_CONTENT_TYPES, ...VIDEO_CONTENT_TYPES].join(',')
export const MAX_UPLOAD_RETRY_ATTEMPTS = 2
const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const MAX_VIDEO_BYTES = 250 * 1024 * 1024
const SAFE_STORAGE_PATH = /^couples\/[A-Za-z0-9_-]{1,120}\/media\/[A-Za-z0-9_-]{1,120}\/(original|thumbnail|poster)$/
const env = readRuntimeEnv()

function isLocalUploadTestWindow() {
  if (typeof window === 'undefined') return false
  if (env.VITE_ENABLE_LOCAL_UPLOAD_TEST_HOOKS !== 'true') return false
  const host = String(window.location?.hostname || '')
  return isLocalHostname(host)
}

function readUploadTestConfig() {
  if (!isLocalUploadTestWindow()) return null
  const config = window.__COUPLEBOOK_UPLOAD_TEST__
  return config && typeof config === 'object' ? config : null
}

function consumeForcedUploadFailure() {
  const config = readUploadTestConfig()
  const remaining = Number(config?.failUploadsRemaining || 0)
  if (!Number.isFinite(remaining) || remaining <= 0) return false
  config.failUploadsRemaining = remaining - 1
  return true
}

function randomId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replaceAll('-', '_')}`
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function bytesToHex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10)
}

function titleFromFilename(name) {
  const base = String(name || '')
    .replace(/\.[A-Za-z0-9]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!base) return 'New media memory'
  return base.replace(/\b\w/g, (value) => value.toUpperCase())
}

function extensionFromName(name) {
  const match = /\.([A-Za-z0-9]+)$/.exec(String(name || ''))
  return match ? match[1].toLowerCase() : ''
}

export function createMediaEntityId(prefix = 'media') {
  return randomId(prefix)
}

export function createMediaFingerprint(file) {
  return [
    String(file?.name || '').trim().toLowerCase(),
    String(file?.type || '').trim().toLowerCase(),
    Number(file?.size || 0),
    Number(file?.lastModified || 0),
  ].join('::')
}

export function createPreviewUrl(file) {
  if (!(file instanceof File)) return ''
  if (typeof URL?.createObjectURL !== 'function') return ''
  try {
    return URL.createObjectURL(file)
  } catch {
    return ''
  }
}

export function revokePreviewUrl(previewUrl) {
  if (!previewUrl || typeof URL?.revokeObjectURL !== 'function') return
  try {
    URL.revokeObjectURL(previewUrl)
  } catch {
    // Best-effort cleanup only.
  }
}

export function inferMediaKind(file) {
  if (IMAGE_CONTENT_TYPES.includes(file?.type)) return 'image'
  if (VIDEO_CONTENT_TYPES.includes(file?.type)) return 'video'
  return ''
}

export function formatBytes(sizeBytes) {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) return '0 B'
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  if (sizeBytes < 1024 * 1024 * 1024) return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function validateMediaFile(file) {
  if (!(file instanceof File)) {
    throw new Error('Choose an image or video file before uploading.')
  }

  const kind = inferMediaKind(file)
  if (!kind) {
    throw new Error('Only JPG, PNG, WEBP, GIF, MP4, and WEBM files are supported.')
  }

  const maxBytes = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES
  if (file.size <= 0) {
    throw new Error('The selected file is empty.')
  }
  if (file.size > maxBytes) {
    throw new Error(`${kind === 'image' ? 'Images' : 'Videos'} must stay under ${formatBytes(maxBytes)}.`)
  }

  const extension = extensionFromName(file.name)
  if (!extension) {
    throw new Error('The selected file is missing a supported extension.')
  }
  const allowedExtensions = kind === 'image' ? IMAGE_EXTENSIONS : VIDEO_EXTENSIONS
  if (!allowedExtensions.includes(extension)) {
    throw new Error('Only JPG, PNG, WEBP, GIF, MP4, and WEBM files are supported.')
  }

  return {
    kind,
    extension,
    contentType: file.type,
    sizeBytes: file.size,
  }
}

export function createMediaUploadDraft(file) {
  const details = validateMediaFile(file)
  return {
    id: randomId('upload'),
    file,
    fileName: file.name,
    kind: details.kind,
    contentType: details.contentType,
    extension: details.extension,
    sizeBytes: details.sizeBytes,
    title: titleFromFilename(file.name),
    description: '',
    date: toDateInputValue(new Date()),
    tags: '',
    mediaNote: '',
    kindLabel: details.kind === 'video' ? 'Video Memory' : 'Photo Memory',
    fingerprint: createMediaFingerprint(file),
    previewUrl: createPreviewUrl(file),
  }
}

export async function sha256ForFile(file) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Secure hashing is unavailable in this browser.')
  }

  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return bytesToHex(new Uint8Array(digest))
}

export function buildVerifiedMediaRecord({ checksum, contentType, coupleId, kind, mediaId, sizeBytes }) {
  const storagePath = `couples/${coupleId}/media/${mediaId}/original`
  return {
    id: mediaId,
    kind,
    storagePath,
    thumbnailPath: '',
    posterPath: '',
    contentType,
    sizeBytes,
    checksum,
  }
}

export function createPrivateMediaUploadTask({
  checksum,
  contentType,
  coupleId,
  extension,
  file,
  kind,
  mediaId = createMediaEntityId('media'),
  ownerUid,
  sizeBytes,
  storageInstance = storage,
}) {
  if (!storageInstance) {
    throw new Error('Firebase Storage is not configured for this build.')
  }
  if (!coupleId || !ownerUid) {
    throw new Error('An approved signed-in member is required before uploading media.')
  }

  const verifiedMedia = buildVerifiedMediaRecord({
    checksum,
    contentType,
    coupleId,
    kind,
    mediaId,
    sizeBytes,
  })

  const storageReference = ref(storageInstance, verifiedMedia.storagePath)
  const task = uploadBytesResumable(storageReference, file, {
    contentType,
    customMetadata: {
      coupleId,
      mediaId,
      ownerUid,
      schemaVersion: '1',
      kind,
      extension,
    },
  })

  return { task, verifiedMedia }
}

export async function waitForPrivateMediaUpload(task, { onProgress, signal } = {}) {
  if (!task || typeof task.on !== 'function') {
    throw new Error('Private media upload task is unavailable.')
  }

  return new Promise((resolve, reject) => {
    let settled = false
    const unsubscribeAbort = typeof signal?.addEventListener === 'function'
      ? () => signal.removeEventListener('abort', handleAbort)
      : () => {}

    function cleanup() {
      unsubscribe?.()
      unsubscribeAbort()
    }

    function handleAbort() {
      try {
        task.cancel()
      } catch {
        // Best-effort cancellation only.
      }
    }

    function rejectOnce(error) {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }

    function resolveOnce() {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }

    if (signal?.aborted) {
      handleAbort()
    } else if (typeof signal?.addEventListener === 'function') {
      signal.addEventListener('abort', handleAbort, { once: true })
    }

    const unsubscribe = task.on(
      'state_changed',
      (snapshot) => {
        if (settled) return
        if (consumeForcedUploadFailure()) {
          handleAbort()
          const error = new Error('Local upload test forced a retryable failure.')
          error.code = 'storage/retry-limit-exceeded'
          rejectOnce(error)
          return
        }
        if (!snapshot.totalBytes) return
        onProgress?.({
          bytesTransferred: snapshot.bytesTransferred,
          progress: Math.min(95, 20 + Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 70)),
          totalBytes: snapshot.totalBytes,
        })
      },
      (error) => {
        rejectOnce(error)
      },
      () => {
        resolveOnce()
      },
    )
  })
}

export async function uploadPrivateMediaFile({
  coupleId,
  file,
  mediaId = randomId('media'),
  ownerUid,
  onProgress,
  storageInstance = storage,
}) {
  if (!storageInstance) {
    throw new Error('Firebase Storage is not configured for this build.')
  }
  if (!coupleId || !ownerUid) {
    throw new Error('An approved signed-in member is required before uploading media.')
  }

  const details = validateMediaFile(file)
  onProgress?.(5)
  const checksum = await sha256ForFile(file)
  onProgress?.(20)

  const { task, verifiedMedia } = createPrivateMediaUploadTask({
    checksum,
    contentType: details.contentType,
    coupleId,
    extension: details.extension,
    file,
    kind: details.kind,
    mediaId,
    ownerUid,
    sizeBytes: details.sizeBytes,
    storageInstance,
  })

  await waitForPrivateMediaUpload(task, {
    onProgress: ({ progress }) => onProgress?.(progress),
  })

  onProgress?.(100)
  return verifiedMedia
}

export async function deleteUploadedMedia(storagePath, storageInstance = storage) {
  if (!storageInstance || !SAFE_STORAGE_PATH.test(String(storagePath || ''))) return false
  await deleteObject(ref(storageInstance, storagePath))
  return true
}

export async function deleteUploadedMediaSet(paths = [], storageInstance = storage) {
  const uniquePaths = [...new Set((Array.isArray(paths) ? paths : []).filter((path) => SAFE_STORAGE_PATH.test(String(path || ''))))]
  for (const path of uniquePaths) {
    await deleteUploadedMedia(path, storageInstance)
  }
  return uniquePaths.length
}
