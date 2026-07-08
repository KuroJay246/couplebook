import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
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

export async function getUserDoc(uid, options = {}) {
  if (!uid) throw new Error('Missing uid');
  const firestore = requireDb();
  const timeoutMs = options.timeoutMs ?? 5000;
  return withTimeout(getDoc(doc(firestore, 'users', uid)), timeoutMs);
}

export async function userDocExists(uid, options = {}) {
  const snapshot = await getUserDoc(uid, options);
  return snapshot.exists();
}

export async function getUserProfileSummary(uid, options = {}) {
  const snapshot = await getUserDoc(uid, options);
  if (!snapshot.exists()) return null;

  const data = snapshot.data() || {};
  return {
    uid,
    username: data.username || '',
    profileName: data.profile?.name || '',
    contractAccepted: data.contractAccepted === true,
    theme: data.theme || null,
    hasFavorites: !!(data.favorites && Object.keys(data.favorites).length > 0),
    hasProfile: !!(data.profile && Object.keys(data.profile).length > 0),
  };
}
