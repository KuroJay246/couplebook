import { isLocalHostname } from '../../data/adapterUtils.js'
import { COUPLE_BOOK_DRIVE_FOLDER_ID, DRIVE_STATE } from '../../services/googleDriveMediaProvider.js'

const STORE_KEY = '__couplebook_drive_test_files__'

function isEnabled() {
  if (typeof window === 'undefined') return false
  if (window.__COUPLEBOOK_DRIVE_TEST__?.enabled !== true) return false
  return isLocalHostname(window.location?.hostname || '')
}

function readConfig() {
  return window.__COUPLEBOOK_DRIVE_TEST__ || {}
}

function readStoredFiles() {
  try {
    return JSON.parse(window.sessionStorage.getItem(STORE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeStoredFiles(files) {
  window.sessionStorage.setItem(STORE_KEY, JSON.stringify(files))
}

function createDriveId() {
  if (globalThis.crypto?.randomUUID) {
    return `drive_test_${crypto.randomUUID().replaceAll('-', '')}`
  }
  return `drive_test_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

async function waitForConfiguredDelay() {
  const delayMs = Number(readConfig().uploadDelayMs || 0)
  if (Number.isFinite(delayMs) && delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
}

function maybeFailUpload() {
  const config = readConfig()
  const remaining = Number(config.failUploadsRemaining || 0)
  if (!Number.isFinite(remaining) || remaining <= 0) return
  config.failUploadsRemaining = remaining - 1
  const error = new Error('Local Google Drive test upload failed.')
  error.code = DRIVE_STATE.temporaryFailure
  throw error
}

export function createLocalGoogleDriveTestProvider({ folderId = COUPLE_BOOK_DRIVE_FOLDER_ID } = {}) {
  let state = DRIVE_STATE.disconnected
  const blobs = new Map()

  function requireConnected() {
    if (state !== DRIVE_STATE.connected) {
      const error = new Error('Reconnect Google Drive before accessing private media.')
      error.code = DRIVE_STATE.reconnectRequired
      throw error
    }
  }

  async function connect() {
    if (!isEnabled()) {
      const error = new Error('Local Google Drive test provider is unavailable.')
      error.code = DRIVE_STATE.temporaryFailure
      throw error
    }
    state = DRIVE_STATE.connected
    writeStoredFiles(readStoredFiles())
    return { state, folderId }
  }

  function disconnect() {
    state = DRIVE_STATE.disconnected
    blobs.clear()
  }

  async function listFiles({ pageToken = '', pageSize = 100 } = {}) {
    requireConnected()
    const offset = Math.max(Number(pageToken || 0) || 0, 0)
    const limit = Math.min(Math.max(Number(pageSize) || 100, 1), 1000)
    const files = readStoredFiles()
    const page = files.slice(offset, offset + limit)
    const nextOffset = offset + limit
    return { files: page, nextPageToken: nextOffset < files.length ? String(nextOffset) : '' }
  }

  async function fetchPreview(fileId) {
    requireConnected()
    const metadata = await getFile(fileId)
    return `data:${metadata.mimeType || 'application/octet-stream'};base64,`
  }

  async function getFile(fileId) {
    requireConnected()
    const file = readStoredFiles().find((entry) => entry.id === fileId)
    if (!file) {
      const error = new Error('Local Google Drive test file was not found.')
      error.code = DRIVE_STATE.folderInaccessible
      throw error
    }
    return file
  }

  async function upload(file, { name, mimeType = file?.type, folder = folderId } = {}) {
    requireConnected()
    await waitForConfiguredDelay()
    maybeFailUpload()
    const id = createDriveId()
    const now = new Date().toISOString()
    const metadata = {
      id,
      name: name || file?.name || id,
      mimeType: mimeType || file?.type || 'application/octet-stream',
      size: String(file?.size || 0),
      parents: [folder],
      md5Checksum: id.slice(-32),
      createdTime: now,
      modifiedTime: now,
    }
    blobs.set(id, file)
    writeStoredFiles([metadata, ...readStoredFiles()])
    return metadata
  }

  async function remove(fileId) {
    requireConnected()
    blobs.delete(fileId)
    writeStoredFiles(readStoredFiles().filter((entry) => entry.id !== fileId))
    return true
  }

  function openExternally() {
    return true
  }

  function getConnectionState() {
    return state
  }

  return Object.freeze({ connect, disconnect, fetchPreview, getConnectionState, getFile, listFiles, openExternally, remove, upload })
}
