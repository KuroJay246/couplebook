import {
  browserLocalPersistence,
  onAuthStateChanged,
  reload,
  setPersistence,
  signOut,
  signInWithEmailAndPassword,
  type User,
} from 'firebase/auth';
import { Platform } from 'react-native';

import { auth, isFirebaseConfigured, missingFirebaseConfigMessage } from '@/lib/firebase';
import { secureStorePersistence } from '@/lib/secure-store-persistence';

let persistencePromise: Promise<void> | null = null;
const INVALID_SESSION_ERROR_CODES = new Set([
  'auth/invalid-user-token',
  'auth/user-disabled',
  'auth/user-not-found',
  'auth/user-token-expired',
]);

export async function ensureAuthPersistence() {
  if (!auth || !isFirebaseConfigured) {
    throw new Error(missingFirebaseConfigMessage || 'Firebase auth is not configured for Couple Book mobile.');
  }

  if (!persistencePromise) {
    const selectedPersistence =
      Platform.OS === 'web' ? browserLocalPersistence : (secureStorePersistence as never);

    persistencePromise = setPersistence(auth, selectedPersistence).catch((error) => {
      persistencePromise = null;
      throw error;
    });
  }

  await persistencePromise;
}

export function observeAuthState(
  onResolve: (user: User | null) => void,
  onError?: (error: Error) => void,
) {
  if (!auth) {
    queueMicrotask(() => onResolve(null));
    return () => {};
  }

  return onAuthStateChanged(auth, onResolve, onError);
}

function getFirebaseErrorCode(error: unknown) {
  if (!error || typeof error !== 'object') return '';
  const code = 'code' in error ? error.code : '';
  return typeof code === 'string' ? code : '';
}

export async function refreshObservedUser(user: User) {
  try {
    await reload(user);
    return user;
  } catch (error) {
    if (auth && INVALID_SESSION_ERROR_CODES.has(getFirebaseErrorCode(error))) {
      await signOut(auth);
    }

    throw error;
  }
}

export async function signInWithEmail(email: string, password: string) {
  if (!auth || !isFirebaseConfigured) {
    throw new Error(missingFirebaseConfigMessage || 'Firebase auth is not configured for Couple Book mobile.');
  }

  if (!email.trim()) throw new Error('Enter an approved account email.');
  if (!password.trim()) throw new Error('Enter the account password.');

  await ensureAuthPersistence();
  return signInWithEmailAndPassword(auth, email.trim(), password);
}
