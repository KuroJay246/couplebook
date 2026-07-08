import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
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

export async function listDevicesForUser(uid, options = {}) {
  if (!uid) throw new Error('Missing uid');

  const firestore = requireDb();
  const timeoutMs = options.timeoutMs ?? 5000;
  const devicesQuery = query(collection(firestore, 'devices'), where('userId', '==', uid));
  const snapshot = await withTimeout(getDocs(devicesQuery), timeoutMs);

  return snapshot.docs.map((deviceDoc) => ({
    id: deviceDoc.id,
    ...deviceDoc.data(),
  }));
}
