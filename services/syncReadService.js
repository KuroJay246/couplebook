import { doc, getDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db } from '../firebase/firebase-config.js';

function requireDb() {
  if (!db) throw new Error('Offline');
  return db;
}

function withTimeout(promise, timeoutMs) {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
  ]);
}

export function normalizeUserCloudData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  return {
    username: typeof data.username === 'string' ? data.username : '',
    theme: typeof data.theme === 'string' ? data.theme : null,
    settings: data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)
      ? { ...data.settings }
      : null,
    contractAccepted: data.contractAccepted === true,
    profile: data.profile && typeof data.profile === 'object' && !Array.isArray(data.profile)
      ? { ...data.profile }
      : null,
    favorites: data.favorites && typeof data.favorites === 'object' && !Array.isArray(data.favorites)
      ? { ...data.favorites }
      : null,
    signature: data.signature && typeof data.signature === 'object' && !Array.isArray(data.signature)
      ? { ...data.signature }
      : null,
    migrationCompleted: data.migrationCompleted === true,
    lastSync: data.lastSync ?? null
  };
}

export async function getUserDataByUid(uid, options = {}) {
  if (!uid) throw new Error('Missing uid');
  const firestore = requireDb();
  const timeoutMs = options.timeoutMs ?? 5000;
  const snapshot = await withTimeout(getDoc(doc(firestore, 'users', uid)), timeoutMs);
  if (!snapshot.exists()) return null;
  return normalizeUserCloudData(snapshot.data());
}

export function listenToUserDoc(uid, callback, options = {}) {
  if (!uid) throw new Error('Missing uid');
  if (typeof callback !== 'function') throw new Error('Missing callback');

  const firestore = requireDb();
  const onError = typeof options.onError === 'function' ? options.onError : () => {};

  return onSnapshot(
    doc(firestore, 'users', uid),
    (snapshot) => callback(snapshot.exists() ? normalizeUserCloudData(snapshot.data()) : null, snapshot),
    onError
  );
}
