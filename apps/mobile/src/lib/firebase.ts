import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  signOut,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

import {
  firebaseConfig,
  isFirebaseConfigured,
  missingFirebaseConfigMessage,
} from '@/lib/firebase-config';
import { secureStorePersistence } from '@/lib/secure-store-persistence';

function readEnv() {
  return {
    EXPO_PUBLIC_FIREBASE_USE_EMULATORS: process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS ?? '',
    EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL:
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL ?? '',
    EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST:
      process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST ?? '',
    EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT:
      process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT ?? '',
  };
}

const env = readEnv();
const useFirebaseEmulators = env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS === 'true';
const authEmulatorUrl = env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL || 'http://127.0.0.1:9099';
const firestoreEmulatorHost = env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST || '127.0.0.1';
const firestoreEmulatorPort = Number.parseInt(
  env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT || '8085',
  10,
);

export const firebaseProjectId = firebaseConfig.projectId || '';

const firebaseApp = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

function initializeMobileAuth() {
  if (!firebaseApp) return null;

  if (Platform.OS === 'web') {
    return getAuth(firebaseApp);
  }

  try {
    return initializeAuth(firebaseApp, {
      persistence: secureStorePersistence as never,
    });
  } catch (error) {
    if (String(error).includes('already exists')) {
      return getAuth(firebaseApp);
    }

    throw error;
  }
}

function initializeDatabase() {
  if (!firebaseApp) return null;

  if (Platform.OS === 'web') {
    return getFirestore(firebaseApp);
  }

  try {
    return initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    });
  } catch {
    return getFirestore(firebaseApp);
  }
}

export const auth = initializeMobileAuth();
export const db = initializeDatabase();
export const storage = firebaseApp ? getStorage(firebaseApp) : null;

if (useFirebaseEmulators && auth && db) {
  const globalKey = '__COUPLEBOOK_MOBILE_FIREBASE_EMULATORS__';
  const globalStateHost = globalThis as unknown as Record<
    string,
    Record<string, boolean> | undefined
  >;
  const globalState = globalStateHost[globalKey] || {};
  globalStateHost[globalKey] = globalState;

  if (!globalState.auth) {
    connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
    globalState.auth = true;
  }

  if (!globalState.firestore) {
    connectFirestoreEmulator(db, firestoreEmulatorHost, firestoreEmulatorPort);
    globalState.firestore = true;
  }
}

export async function signOutCurrentUser() {
  if (!auth) return;
  await signOut(auth);
}

export { isFirebaseConfigured, missingFirebaseConfigMessage, useFirebaseEmulators };
