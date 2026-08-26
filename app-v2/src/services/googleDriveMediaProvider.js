export const COUPLE_BOOK_DRIVE_FOLDER_ID = '17Ar4UK5_puORz9TE1dijIk2-qHgh7oIa'
export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'

export const DRIVE_STATE = Object.freeze({
  disconnected: 'disconnected',
  connecting: 'connecting',
  connected: 'connected',
  wrongAccount: 'wrong-account',
  folderInaccessible: 'folder-inaccessible',
  insufficientScope: 'insufficient-scope',
  tokenExpired: 'token-expired',
  reconnectRequired: 'reconnect-required',
  cancelled: 'cancelled',
  temporaryFailure: 'temporary-failure',
})

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files'

function driveError(state, message, cause) {
  const error = new Error(message)
  error.code = state
  error.cause = cause
  return error
}

function requireToken(token) {
  if (!token) throw driveError(DRIVE_STATE.reconnectRequired, 'Reconnect Google Drive before accessing private media.')
  return token
}

async function driveFetch(fetchImpl, url, token, init = {}) {
  const response = await fetchImpl(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${requireToken(token)}`,
    },
  })

  if (response.ok) return response
  if (response.status === 401) throw driveError(DRIVE_STATE.tokenExpired, 'Google Drive authorization expired. Reconnect to continue.', response)
  if (response.status === 403) throw driveError(DRIVE_STATE.folderInaccessible, 'This Google account cannot open the Couple Book media folder.', response)
  throw driveError(DRIVE_STATE.temporaryFailure, 'Google Drive is temporarily unavailable. Try again.', response)
}

export function createGoogleDriveMediaProvider({ clientId, fetchImpl = globalThis.fetch, google = globalThis.google, folderId = COUPLE_BOOK_DRIVE_FOLDER_ID } = {}) {
  let accessToken = ''
  let state = DRIVE_STATE.disconnected
  let tokenClient = null

  function getConnectionState() {
    return state
  }

  function disconnect() {
    accessToken = ''
    tokenClient = null
    state = DRIVE_STATE.disconnected
  }

  async function connect() {
    if (!clientId) throw driveError(DRIVE_STATE.temporaryFailure, 'Google Drive connection is not configured for this preview.')
    const googleApi = google || globalThis.google
    if (!fetchImpl || !googleApi?.accounts?.oauth2?.initTokenClient) {
      throw driveError(DRIVE_STATE.temporaryFailure, 'Google Drive authorization is unavailable in this browser.')
    }

    state = DRIVE_STATE.connecting
    return new Promise((resolve, reject) => {
      tokenClient = googleApi.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_DRIVE_SCOPE,
        callback: async (response) => {
          if (response?.error) {
            state = response.error === 'access_denied' ? DRIVE_STATE.cancelled : DRIVE_STATE.temporaryFailure
            reject(driveError(state, 'Google Drive authorization was not completed.'))
            return
          }
          accessToken = response.access_token || ''
          try {
            await validateFolder()
            state = DRIVE_STATE.connected
            resolve({ state, folderId })
          } catch (error) {
            accessToken = ''
            state = error.code === DRIVE_STATE.folderInaccessible ? DRIVE_STATE.wrongAccount : error.code || DRIVE_STATE.temporaryFailure
            reject(error)
          }
        },
      })
      tokenClient.requestAccessToken({ prompt: 'consent' })
    })
  }

  async function validateFolder() {
    const response = await driveFetch(fetchImpl, `${DRIVE_API}/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,trashed,parents`, accessToken)
    const data = await response.json()
    if (data.id !== folderId || data.mimeType !== 'application/vnd.google-apps.folder' || data.trashed) {
      throw driveError(DRIVE_STATE.folderInaccessible, 'The Couple Book media folder is unavailable.')
    }
    return data
  }

  async function listFiles({ pageToken = '', pageSize = 100, includeUnsupported = false } = {}) {
    const query = [`'${folderId}' in parents`, 'trashed = false'].join(' and ')
    const params = new URLSearchParams({ q: query, pageSize: String(Math.min(Math.max(pageSize, 1), 1000)), fields: 'nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,parents,md5Checksum,imageMediaMetadata,videoMediaMetadata)', orderBy: 'createdTime desc' })
    if (pageToken) params.set('pageToken', pageToken)
    const response = await driveFetch(fetchImpl, `${DRIVE_API}/files?${params}`, accessToken)
    const data = await response.json()
    const files = (data.files || []).filter((file) => includeUnsupported || file.mimeType?.startsWith('image/') || file.mimeType?.startsWith('video/'))
    return { files, nextPageToken: data.nextPageToken || '' }
  }

  async function fetchPreview(fileId) {
    const response = await driveFetch(fetchImpl, `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, accessToken)
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  }

  async function getFile(fileId) {
    const params = new URLSearchParams({
      fields: 'id,name,mimeType,size,parents,md5Checksum,createdTime,modifiedTime,imageMediaMetadata,videoMediaMetadata,trashed',
    })
    const response = await driveFetch(fetchImpl, `${DRIVE_API}/files/${encodeURIComponent(fileId)}?${params}`, accessToken)
    return response.json()
  }

  async function upload(file, { name, description = '', mimeType = file?.type, folder = folderId } = {}) {
    const metadata = { name, description, mimeType, parents: [folder] }
    const boundary = `couplebook_${crypto.randomUUID()}`
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
      file,
      `\r\n--${boundary}--\r\n`,
    ])
    const response = await driveFetch(fetchImpl, `${UPLOAD_API}?uploadType=multipart&fields=id,name,mimeType,size,parents,md5Checksum,createdTime`, accessToken, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    })
    return response.json()
  }

  async function remove(fileId) {
    await driveFetch(fetchImpl, `${DRIVE_API}/files/${encodeURIComponent(fileId)}`, accessToken, { method: 'DELETE' })
    return true
  }

  function openExternally(fileId) {
    if (typeof window === 'undefined' || !fileId) return false
    window.open(`https://drive.google.com/open?id=${encodeURIComponent(fileId)}`, '_blank', 'noopener,noreferrer')
    return true
  }

  return Object.freeze({ connect, disconnect, fetchPreview, getConnectionState, getFile, listFiles, openExternally, remove, upload, validateFolder })
}
