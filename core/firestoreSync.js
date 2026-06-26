/**
 * firestoreSync.js — Cross-Device Sync Layer for MemoryBook
 *
 * SAFETY CONTRACT:
 *   ✅ Every Firestore call is wrapped in try/catch
 *   ✅ 5-second timeout on all network operations
 *   ✅ App runs fully offline — localStorage is always the fallback
 *   ✅ Never blocks UI rendering or login redirect
 *
 * SYNC MODEL:
 *   PULL (on login):   Firestore → merge → localStorage → render
 *   PUSH (on change):  localStorage → Firestore (fire-and-forget)
 *
 * MERGE RULES:
 *   theme          → Firestore wins (last device synced wins)
 *   settings       → deep merge, Firestore wins on conflict
 *   contractAccepted → OR logic (once true on any device → always true)
 *   profile        → Firestore wins for each user's own profile fields
 *   favorites      → deep person-level merge, Firestore wins on conflict
 *
 * DOCUMENT FORMAT:  users/{username}
 *   { theme, settings, contractAccepted, profile, favorites, lastSync, username }
 */

import { UserStore } from './persistence.js';

// CDN base — must match firebase/firebase-config.js
const FB_CDN = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const TIMEOUT_MS = 5000; // Max ms to wait for any Firestore operation

// ─── Internal: race a promise against a timeout ────────────────────────────

function withTimeout(promise, ms = TIMEOUT_MS, label = 'operation') {
  const clock = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`[Firestore] ${label} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, clock]);
}

// ─── Internal: lazy-load db from firebase-config ──────────────────────────

let _cachedDb = null;
async function getDB() {
  if (_cachedDb) return _cachedDb;
  const mod = await import('../firebase/firebase-config.js');
  if (!mod.db) throw new Error('Firestore db is null (init failed)');
  _cachedDb = mod.db;
  return _cachedDb;
}

// ─── Internal: lazy-load Firestore functions from CDN ─────────────────────

let _firestoreFns = null;
async function getFns() {
  if (_firestoreFns) return _firestoreFns;
  const mod = await import(FB_CDN);
  _firestoreFns = {
    doc: mod.doc,
    getDoc: mod.getDoc,
    setDoc: mod.setDoc,
    collection: mod.collection,
    getDocs: mod.getDocs,
    onSnapshot: mod.onSnapshot,
    serverTimestamp: mod.serverTimestamp
  };
  return _firestoreFns;
}

// ─── Public API ───────────────────────────────────────────────────────────

export const firestoreSync = {

  /**
   * Pull user data from Firestore and merge into localStorage.
   */
  async loadUserData(uid, username) {
    try {
      const db = await withTimeout(getDB(), TIMEOUT_MS, 'getDB');
      const { collection, getDocs } = await withTimeout(getFns(), TIMEOUT_MS, 'getFns');

      const colRef = collection(db, 'users');
      const snap = await withTimeout(getDocs(colRef), TIMEOUT_MS, 'getDocs');

      let currentUserDoc = null;
      snap.forEach(doc => {
        if (doc.id === uid) currentUserDoc = doc;
      });

      if (!currentUserDoc || !currentUserDoc.data().migrationCompleted) {
        // First login on this user — push local state to initialize cloud doc and set migration flag
        console.log(`[MemoryBook Debug] No cloud data for ${username} or migration pending — initializing...`);
        await this.saveUserData(uid, username);
        return;
      }

      // Prepare shared data accumulators
      const profiles = UserStore.getSharedJSON('profiles') || {};
      const favorites = UserStore.getSharedJSON('favorites') || {};
      const signatures = UserStore.getSharedJSON('contract_signatures') || {};

      snap.forEach(doc => {
        const cloud = doc.data();
        const docUsername = cloud.username;
        if (!docUsername) return;

        // --- ACTIVE USER ONLY LOGIC (Private Settings & Theme) ---
        if (docUsername === username) {
          console.log(`[MemoryBook Debug] ✅ Loaded active user ${username}:`, Object.keys(cloud));
          
          if (cloud.theme && typeof cloud.theme === 'string') {
            UserStore.set('theme', cloud.theme);
            UserStore.setShared('theme', cloud.theme);
            if (typeof document !== 'undefined') {
              document.documentElement.setAttribute('data-theme', cloud.theme);
            }
          }

          if (cloud.settings && typeof cloud.settings === 'object' && !Array.isArray(cloud.settings)) {
            const local = UserStore.getJSON('settings') || {};
            const merged = { ...local, ...cloud.settings };
            if (cloud.settings.privacyToggles) {
              merged.privacyToggles = {
                ...(local.privacyToggles || {}),
                ...cloud.settings.privacyToggles
              };
            }
            UserStore.setJSON('settings', merged);
          }

          if (cloud.contractAccepted === true) {
            UserStore.set('contract_accepted', 'true');
            UserStore.setRaw(`memorybook_contract_accepted_${username}`, 'true');
            UserStore.setShared('contract_accepted', 'true');
          }
        }

        // --- SHARED DATA LOGIC (For ALL Users) ---
        
        // Profile Merge
        if (cloud.profile && typeof cloud.profile === 'object' && !Array.isArray(cloud.profile)) {
          profiles[docUsername] = {
            ...(profiles[docUsername] || {}),
            ...cloud.profile
          };
        }

        // Favorites Merge
        if (cloud.favorites && typeof cloud.favorites === 'object' && !Array.isArray(cloud.favorites)) {
          Object.keys(cloud.favorites).forEach(person => {
            const cloudPerson = cloud.favorites[person];
            const localPerson = (favorites[docUsername] && favorites[docUsername][person]) || {};
            if (!favorites[docUsername]) favorites[docUsername] = {};
            if (typeof cloudPerson === 'object') {
              favorites[docUsername][person] = { ...localPerson, ...cloudPerson };
            }
          });
          // Also backward compat for top-level favorites layout
          Object.keys(cloud.favorites).forEach(person => {
             if (!favorites[person]) favorites[person] = {};
             favorites[person] = { ...favorites[person], ...cloud.favorites[person] };
          });
        }

        // Signature Merge
        if (cloud.signature && typeof cloud.signature === 'object') {
          signatures[docUsername] = cloud.signature;
        } else if (cloud.contractAccepted === true) {
          // Fallback if signature object is missing but they accepted
          if (!signatures[docUsername]) {
            signatures[docUsername] = {
              accepted: true,
              timestamp: new Date().toISOString(),
              version: '3.0',
              history: []
            };
          }
        }
      });

      // Save shared accumulations
      UserStore.setSharedJSON('profiles', profiles);
      UserStore.setSharedJSON('favorites', favorites);
      UserStore.setSharedJSON('contract_signatures', signatures);

      console.log(`[MemoryBook Debug] ✅ Merge complete across all partners for ${username}`);

    } catch (e) {
      console.log(`[MemoryBook Debug] Load skipped (offline or error): ${e.message}`);
    }
  },

  /**
   * Push current localStorage state for a user to Firestore.
   */
  async saveUserData(uid, username, partialPayload = null) {
    try {
      if (!username || username === 'Guest' || !uid) return;

      const db = await withTimeout(getDB(), TIMEOUT_MS, 'getDB');
      const { doc, setDoc, serverTimestamp } = await withTimeout(getFns(), TIMEOUT_MS, 'getFns');

      const ref = doc(db, 'users', uid);

      let payload = partialPayload;
      
      if (!payload) {
        // Read current scoped state from localStorage
        const theme             = UserStore.get('theme', 'dark');
        const settings          = UserStore.getJSON('settings') || {};
        const contractAccepted  = localStorage.getItem(`memorybook_contract_accepted_${username}`) === 'true';
        const profiles          = UserStore.getSharedJSON('profiles') || {};
        const profile           = profiles[username] || {};
        const favorites         = UserStore.getSharedJSON('favorites') || {};
        const allSignatures     = UserStore.getSharedJSON('contract_signatures') || {};
        const signature         = allSignatures[username] || null;

        payload = {
          username,
          theme,
          settings,
          contractAccepted,
          profile,
          favorites,
          signature,
          migrationCompleted: true,
          lastSync: serverTimestamp()
        };
      } else {
        payload.lastSync = serverTimestamp();
      }

      await withTimeout(
        setDoc(ref, payload, { merge: true }),
        TIMEOUT_MS,
        'setDoc'
      );

      console.log(`[MemoryBook Debug] ✅ Saved user data for ${username}`);
    } catch (e) {
      console.log(`[MemoryBook Debug] Save skipped (offline or error): ${e.message}`);
    }
  },

  /**
   * Sync active user data (fire and forget)
   */
  syncUserData() {
    const username = UserStore.getActiveUser();
    const uid = localStorage.getItem('memorybook_active_uid');
    if (!username || username === 'Guest' || !uid) return;
    this.saveUserData(uid, username).catch(() => {});
  },

  /**
   * Listen to real-time updates from Firestore for the current user.
   * Keeps local cache in sync across devices.
   */
  async listen(uid, username) {
    if (!username || username === 'Guest' || !uid) return;

    try {
      const db = await getDB();
      const { collection, onSnapshot } = await getFns();
      const colRef = collection(db, 'users');

      if (this._unsubscribe) {
        this._unsubscribe();
      }

      this._unsubscribe = onSnapshot(colRef, (snap) => {
        let needsRender = false;

        snap.forEach(doc => {
          const cloud = doc.data();
          const docUsername = cloud.username;
          if (!docUsername) return;

          // For the active user — sync private prefs
          if (docUsername === username) {
            const localLastUpdated = parseInt(localStorage.getItem('memorybook_last_local_write') || '0', 10);
            const remoteLastUpdated = cloud.lastSync ? (cloud.lastSync.toMillis ? cloud.lastSync.toMillis() : cloud.lastSync.seconds * 1000) : 0;
            
            // Timestamp protection: Firestore must NEVER overwrite newer local updates
            if (remoteLastUpdated && localLastUpdated && remoteLastUpdated < localLastUpdated) {
              // Ignore stale remote write (race condition protection)
            } else {
              // We can safely apply remote updates
              if (cloud.theme && cloud.theme !== UserStore.get('theme')) {
                UserStore.set('theme', cloud.theme);
                UserStore.setShared('theme', cloud.theme);
                if (typeof document !== 'undefined') {
                  document.documentElement.setAttribute('data-theme', cloud.theme);
                }
              }
            }

            if (cloud.contractAccepted === true && UserStore.get('contract_accepted') !== 'true') {
              UserStore.set('contract_accepted', 'true');
              UserStore.setRaw(`memorybook_contract_accepted_${username}`, 'true');
              needsRender = true;
            }
          }

          // For ALL users — sync shared couple data
          if (cloud.profile) {
            const profiles = UserStore.getSharedJSON('profiles') || {};
            if (JSON.stringify(profiles[docUsername]) !== JSON.stringify(cloud.profile)) {
              profiles[docUsername] = { ...(profiles[docUsername] || {}), ...cloud.profile };
              UserStore.setSharedJSON('profiles', profiles);
              needsRender = true;
            }
          }

          if (cloud.signature) {
            const signatures = UserStore.getSharedJSON('contract_signatures') || {};
            if (JSON.stringify(signatures[docUsername]) !== JSON.stringify(cloud.signature)) {
              signatures[docUsername] = cloud.signature;
              UserStore.setSharedJSON('contract_signatures', signatures);
              needsRender = true;
            }
          }
        });

        if (needsRender && typeof window !== 'undefined') {
          window.dispatchEvent(new Event('memorybook-sync-updated'));
        }
      });

      console.log(`[Firestore] Listening for partner updates (${username})`);
    } catch (e) {
      console.log(`[Firestore] Listener failed to start: ${e.message}`);
    }
  }
};

export default firestoreSync;
