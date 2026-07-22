import { firebaseApp } from '../lib/firebaseClient.js'

const SAFE_STORAGE_PATH = /^couples\/[A-Za-z0-9_-]{1,120}\/media\/[A-Za-z0-9_-]{1,120}\/(original|thumbnail|poster)$/

export function isSafeMediaStoragePath(path) {
  return typeof path === 'string' && SAFE_STORAGE_PATH.test(path)
}

export async function resolveMediaUrl(storagePath, options = {}) {
  if (!isSafeMediaStoragePath(storagePath)) throw new Error('Media storage path is not approved.')
  const { getDownloadURL, getStorage, ref } = await import('firebase/storage')
  const storageClient = options.storage || (firebaseApp ? getStorage(firebaseApp) : null)
  const getUrl = options.getDownloadURL || getDownloadURL
  const createRef = options.ref || ref
  if (!storageClient) throw new Error('Firebase Storage is not configured.')
  return getUrl(createRef(storageClient, storagePath))
}
