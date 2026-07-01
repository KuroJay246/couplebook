/**
 * Firebase Configuration — MemoryBook
 *
 * BROWSER COMPATIBILITY:
 *   node_modules is excluded from Firebase Hosting deploy.
 *   We use the Firebase CDN (gstatic v10.14.1) so browsers resolve modules
 *   without a bundler. The CDN v10.x modular API is identical to npm v9+.
 *
 * ARCHITECTURE:
 *   localStorage (primary runtime)
 *       ↕ non-blocking sync
 *   Firestore (cross-device persistence layer)
 *       ↓ static files
 *   Firebase Hosting (public access)
 *
 * SAFETY: All Firebase calls are wrapped in try/catch. App runs fully without Firebase.
 */

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyBJdkxbUUAhFYQOycpvTxo4nGKFMmGohy8",
  authDomain: "couplebook-97830.firebaseapp.com",
  projectId: "couplebook-97830",
  storageBucket: "couplebook-97830.appspot.com",
  messagingSenderId: "520837866446",
  appId: "1:520837866446:web:91261df87de3d0e2a3819f"
};

let app = null;
let db = null;
let auth = null;

try {
  // Prevent duplicate initialization if module is imported multiple times
  app = getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

  db = getFirestore(app);
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error('Firebase Auth Persistence Error:', err);
  });
  console.log('🔥 Firebase Auth + Firestore ready');
} catch (e) {
  console.log('Firebase offline mode — localStorage handles everything:', e.message);
}

export { app, db, auth };

// Legacy stub — kept for backward compatibility with any existing import
export const firebaseServices = {
  syncProfileToCloud: async () => {},
  syncMemoryToCloud: async () => {}
};
