import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { firebaseConfig, isFirebaseConfigured, missingFirebaseConfigMessage } from './firebaseConfig'

export let firebaseInitializationError = ''

function initializeDatabase(app) {
  if (typeof window === 'undefined' || import.meta.env.MODE === 'test' || window.__FIRESTORE_TEST_ENV__) {
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

export const firebaseApp = isFirebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null

if (!isFirebaseConfigured) {
  firebaseInitializationError = missingFirebaseConfigMessage
}

export const auth = firebaseApp ? getAuth(firebaseApp) : null
export const db = firebaseApp ? initializeDatabase(firebaseApp) : null
