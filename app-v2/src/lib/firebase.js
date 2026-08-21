import { getApp, getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import {
  createFirebaseConfig,
  formatMissingFirebaseConfigMessage,
  getMissingFirebaseConfigKeys,
} from './firebaseConfig.js'

const firebaseConfig = createFirebaseConfig()
const missingFirebaseConfigKeys = getMissingFirebaseConfigKeys(firebaseConfig)
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}

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

if (useFirebaseEmulators && typeof window !== 'undefined') {
  window.__COUPLEBOOK_FIREBASE_EMULATORS__ ||= {}

  if (auth && !window.__COUPLEBOOK_FIREBASE_EMULATORS__.auth) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    window.__COUPLEBOOK_FIREBASE_EMULATORS__.auth = true
  }

  if (db && !window.__COUPLEBOOK_FIREBASE_EMULATORS__.firestore) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    window.__COUPLEBOOK_FIREBASE_EMULATORS__.firestore = true
  }
}
