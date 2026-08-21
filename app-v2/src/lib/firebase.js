import { getApp, getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'
import {
  createFirebaseConfig,
  formatMissingFirebaseConfigMessage,
  getMissingFirebaseConfigKeys,
} from './firebaseConfig.js'

const firebaseConfig = createFirebaseConfig()
const missingFirebaseConfigKeys = getMissingFirebaseConfigKeys(firebaseConfig)
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}
const FIREBASE_AUTH_EMULATOR_URL = env.VITE_FIREBASE_AUTH_EMULATOR_URL || 'http://127.0.0.1:9099'
const FIRESTORE_EMULATOR_HOST = env.VITE_FIRESTORE_EMULATOR_HOST || '127.0.0.1'
const FIRESTORE_EMULATOR_PORT = Number.parseInt(env.VITE_FIRESTORE_EMULATOR_PORT || '8085', 10)
const STORAGE_EMULATOR_HOST = env.VITE_FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1'
const STORAGE_EMULATOR_PORT = Number.parseInt(env.VITE_FIREBASE_STORAGE_EMULATOR_PORT || '9199', 10)

export const missingFirebaseConfigMessage = formatMissingFirebaseConfigMessage(missingFirebaseConfigKeys)
export const isFirebaseConfigured = missingFirebaseConfigKeys.length === 0
export const firebaseProjectId = firebaseConfig.projectId || ''

const firebaseApp = isFirebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null

export const auth = firebaseApp ? getAuth(firebaseApp) : null

const useFirebaseEmulators = env.VITE_FIREBASE_USE_EMULATORS === 'true'

function initializeDatabase(app) {
  if (useFirebaseEmulators) {
    return initializeFirestore(app, { experimentalForceLongPolling: true })
  }

  if (typeof window === 'undefined' || env.MODE === 'test' || window.__FIRESTORE_TEST_ENV__) {
    return getFirestore(app)
  }

  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  } catch {
    return getFirestore(app)
  }
}

export const db = firebaseApp ? initializeDatabase(firebaseApp) : null
export const storage = firebaseApp ? getStorage(firebaseApp) : null

if (useFirebaseEmulators && typeof window !== 'undefined') {
  window.__COUPLEBOOK_FIREBASE_EMULATORS__ ||= {}

  if (auth && !window.__COUPLEBOOK_FIREBASE_EMULATORS__.auth) {
    connectAuthEmulator(auth, FIREBASE_AUTH_EMULATOR_URL, { disableWarnings: true })
    window.__COUPLEBOOK_FIREBASE_EMULATORS__.auth = true
  }

  if (db && !window.__COUPLEBOOK_FIREBASE_EMULATORS__.firestore) {
    connectFirestoreEmulator(db, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT)
    window.__COUPLEBOOK_FIREBASE_EMULATORS__.firestore = true
  }

  if (storage && !window.__COUPLEBOOK_FIREBASE_EMULATORS__.storage) {
    connectStorageEmulator(storage, STORAGE_EMULATOR_HOST, STORAGE_EMULATOR_PORT)
    window.__COUPLEBOOK_FIREBASE_EMULATORS__.storage = true
  }
}
