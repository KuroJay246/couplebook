import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  type User,
} from 'firebase/auth';
import { Platform } from 'react-native';

import { auth, isFirebaseConfigured, missingFirebaseConfigMessage } from '@/lib/firebase';
import { secureStorePersistence } from '@/lib/secure-store-persistence';

let persistencePromise: Promise<void> | null = null;

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

export async function signInWithEmail(email: string, password: string) {
  if (!auth || !isFirebaseConfigured) {
    throw new Error(missingFirebaseConfigMessage || 'Firebase auth is not configured for Couple Book mobile.');
  }

  if (!email.trim()) throw new Error('Enter an approved account email.');
  if (!password.trim()) throw new Error('Enter the account password.');

  await ensureAuthPersistence();
  return signInWithEmailAndPassword(auth, email.trim(), password);
}
