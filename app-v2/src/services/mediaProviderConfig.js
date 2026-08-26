import { readRuntimeEnv } from '../data/adapterUtils.js'

export const MEDIA_PROVIDER_IDS = Object.freeze({
  googleDrive: 'google-drive',
  firebaseStorage: 'firebase-storage',
})

export function resolveMediaProvider(env = readRuntimeEnv()) {
  const configured = String(env.VITE_MEDIA_PROVIDER || MEDIA_PROVIDER_IDS.googleDrive).trim().toLowerCase()
  return configured === MEDIA_PROVIDER_IDS.firebaseStorage
    ? MEDIA_PROVIDER_IDS.firebaseStorage
    : MEDIA_PROVIDER_IDS.googleDrive
}

export function assertProductionMediaProvider(env = readRuntimeEnv()) {
  const isProductionWrite = env.VITE_WRITE_MODE === 'firestore-production-write'
  const provider = resolveMediaProvider(env)
  if (isProductionWrite && provider !== MEDIA_PROVIDER_IDS.googleDrive) {
    throw new Error('Production media must use Google Drive. Firebase Storage is limited to local and emulator workflows.')
  }
  return provider
}
