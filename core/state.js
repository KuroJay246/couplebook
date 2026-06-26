/**
 * State Management Module for MemoryBook
 *
 * Firestore sync: state changes trigger a fire-and-forget push to Firestore
 * via dynamic import of firestoreSync. This means:
 *   - No hard dependency on Firestore (app works fully offline)
 *   - Circular imports are avoided (firestoreSync → persistence, not → state)
 *
 * PERSISTENCE RULES:
 *   - User-scoped data  (theme, settings, contract) → stored with username suffix
 *   - Shared/couple data (profiles, memories, signatures) → stored globally
 *   - All storage goes through UserStore for consistency
 *
 * CROSS-DEVICE NOTE:
 *   localStorage is per-browser. State is properly isolated per-user on each
 *   device but cannot sync between devices without a backend (future feature).
 *   Media files ARE cross-device via Firebase Hosting (/assets/...).
 */

import { UserStore } from './persistence.js';

// ─── Shared storage key suffixes (couple-wide) ────────────────────────────────
const SHARED = {
  PROFILES: 'profiles',
  CONTRACT_SIGNATURES: 'contract_signatures',
  CUSTOM_MEMORIES: 'custom_memories',
  DELETED_MEMORIES: 'deleted_memories',
  OVERRIDDEN_MEMORIES: 'overridden_memories',
  USERS: 'users'
};

// ─── User-scoped storage key suffixes (per-user) ──────────────────────────────
const USER = {
  THEME: 'theme',
  CONTRACT_ACCEPTED: 'contract_accepted',
  SETTINGS: 'settings'
};

// ─── Default Data ─────────────────────────────────────────────────────────────

const DEFAULT_PROFILES = {
  Jaylan: {
    name: 'Jaylan',
    bio: 'Tech enthusiast, memory keeper, and proud partner.',
    avatar: '/assets/photos/anniversary_2025.png',
    anniversaryView: 'dual',
    joinedDate: '2025-12-28',
    birthday: '2006-12-13'
  },
  Omia: {
    name: 'Omia',
    bio: 'Creative soul, details planner, and beloved partner.',
    avatar: '/assets/photos/sunset_walk.png',
    anniversaryView: 'dual',
    joinedDate: '2025-12-29',
    birthday: '2006-09-16'
  }
};

const DEFAULT_SETTINGS = {
  theme: 'dark',
  anniversaryConfig: 'dual', // 'dual' | 'jaylan' | 'omia'
  privacyToggles: {
    hideOfflineWarning: false,
    localOnlyMode: true
  }
};

let cachedMemories = null;

// ─── State Object ─────────────────────────────────────────────────────────────

export const state = {

  // ── Internal: non-blocking Firestore push ─────────────────────────────────

  _syncToCloud() {
    // Dynamic import so Firestore is never a hard dependency
    import('./firestoreSync.js').then(({ firestoreSync }) => {
      firestoreSync.syncUserData();
    }).catch(() => {}); // silently skip if offline
  },

  // ── Theme ──────────────────────────────────────────────────────────────────

  getTheme() {
    // User-scoped with fallback to legacy global key
    return UserStore.get(USER.THEME, 'dark');
  },

  setTheme(theme) {
    UserStore.set(USER.THEME, theme);
    // Also write the legacy global key so index.html boot loader picks it up
    UserStore.setShared(USER.THEME, theme);
    // Store local write timestamp to prevent sync race conditions
    localStorage.setItem('memorybook_last_local_write', Date.now().toString());
    document.documentElement.setAttribute('data-theme', theme);
    // Push to Firestore (fire-and-forget)
    this._syncToCloud();
  },

  // ── Active User ────────────────────────────────────────────────────────────

  getActiveUser() {
    const username = UserStore.getActiveUser();
    if (!username || username === 'Guest') return null;
    return this.getProfiles()[username] || null;
  },

  setActiveUser(username) {
    UserStore.setRaw('memorybook_active_session', username);
    UserStore.setRaw('memorybook_active_user', username);
  },

  /**
   * Restores all user-specific UI state immediately after login.
   * Call this right after Auth.login() succeeds, before redirecting.
   */
  restoreUserSession(username) {
    try {
      // 1. Apply user's theme
      const theme = UserStore.get(USER.THEME, 'dark');
      document.documentElement.setAttribute('data-theme', theme);

      // 2. Seed default settings if this user has none yet
      const existingSettings = UserStore.getJSON(USER.SETTINGS);
      if (!existingSettings) {
        UserStore.setJSON(USER.SETTINGS, DEFAULT_SETTINGS);
      }

      // 3. Seed default profiles if missing
      const existingProfiles = UserStore.getSharedJSON(SHARED.PROFILES);
      if (!existingProfiles) {
        UserStore.setSharedJSON(SHARED.PROFILES, DEFAULT_PROFILES);
      }

      console.log(`[MemoryBook] Session restored for ${username}`);
    } catch (e) {
      console.warn('[MemoryBook] Session restore failed (non-fatal):', e.message);
    }
  },

  // ── Profiles (shared between both users) ───────────────────────────────────

  getProfiles() {
    const stored = UserStore.getSharedJSON(SHARED.PROFILES);
    if (!stored) {
      // Normalize default avatar paths to absolute before saving
      const defaults = { ...DEFAULT_PROFILES };
      UserStore.setSharedJSON(SHARED.PROFILES, defaults);
      return defaults;
    }
    return stored;
  },

  saveProfile(username, data) {
    const profiles = this.getProfiles();
    if (profiles[username]) {
      profiles[username] = { ...profiles[username], ...data };
      UserStore.setSharedJSON(SHARED.PROFILES, profiles);

      // Sync nav badge if this is the active user
      const activeUsername = UserStore.getActiveUser();
      if (activeUsername === username) {
        const badgeAvatar = document.getElementById('header-user-avatar');
        const badgeName = document.getElementById('header-user-name');
        if (badgeAvatar) badgeAvatar.src = data.avatar || profiles[username].avatar;
        if (badgeName) badgeName.textContent = data.name || profiles[username].name;
      }

      // Push profile change to Firestore (fire-and-forget)
      this._syncToCloud();
    }
  },

  // ── Contract (user-scoped — each user signs independently) ────────────────

  /**
   * isContractAcceptedFor(username)
   *
   * SINGLE SOURCE OF TRUTH for contract status.
   *
   * CHECK ORDER:
   *   1. Per-user localStorage key (primary, written by acceptContract + Firestore pullAndMerge)
   *   2. contract_signatures record (migration — covers users who signed before the per-user
   *      key system was introduced). On match, promotes to per-user key so future checks are O(1).
   *
   * NEVER reads the global 'memorybook_contract_accepted' key.
   * NEVER assumes a user has signed based on any other user's data.
   */
  isContractAcceptedFor(username) {
    if (!username || username === 'Guest') return false;

    // PRIMARY: per-user key written by acceptContract() and firestoreSync.pullAndMerge()
    const perUserKey = `memorybook_contract_accepted_${username}`;
    if (localStorage.getItem(perUserKey) === 'true') return true;

    // MIGRATION: check the contract_signatures record
    // This is the authoritative record written by acceptContract() for all versions.
    // Catches users who signed before the per-user localStorage key was introduced.
    try {
      const sigsRaw = localStorage.getItem('memorybook_contract_signatures');
      if (sigsRaw) {
        const sigs = JSON.parse(sigsRaw);
        if (sigs[username] && sigs[username].accepted === true) {
          // Promote to per-user key so this migration only runs once
          localStorage.setItem(perUserKey, 'true');
          return true;
        }
      }
    } catch (e) {
      // JSON parse failed — ignore, return false
    }

    return false;
  },

  /**
   * isContractAccepted() — legacy compat wrapper.
   * Uses the active session username. Prefer isContractAcceptedFor(username).
   */
  isContractAccepted() {
    const username = UserStore.getActiveUser();
    return this.isContractAcceptedFor(username);
  },

  /**
   * setContractAccepted(username) — clean setter alias.
   * Writes ONLY the user-specific key — never the global key.
   */
  setContractAccepted(username) {
    if (!username || username === 'Guest') return;
    // Write in all formats checked by isContractAcceptedFor
    localStorage.setItem(`memorybook_contract_accepted_${username}`, 'true');
    // Also write the new UserStore scoped format for the active session
    UserStore.set(USER.CONTRACT_ACCEPTED, 'true');
  },

  getSignatures() {
    return UserStore.getSharedJSON(SHARED.CONTRACT_SIGNATURES) || {};
  },

  acceptContract(username, userBio) {
    // Mark contract accepted for this specific user
    const originalUser = UserStore.getActiveUser();

    // Temporarily set active user to the one accepting (in case they're different)
    this.setActiveUser(username);

    // Write the user-scoped accepted flag
    UserStore.set(USER.CONTRACT_ACCEPTED, 'true');

    // Also write legacy key for backward compat
    UserStore.setRaw(`memorybook_contract_accepted_${username}`, 'true');
    UserStore.setShared('contract_accepted', 'true'); // legacy global

    // Save signature history (shared)
    const signatures = this.getSignatures();
    const newSig = {
      accepted: true,
      timestamp: new Date().toISOString(),
      version: '3.0'
    };

    if (!signatures[username]) {
      signatures[username] = { ...newSig, history: [newSig] };
    } else {
      signatures[username] = {
        ...newSig,
        history: [...(signatures[username].history || []), newSig]
      };
    }

    UserStore.setSharedJSON(SHARED.CONTRACT_SIGNATURES, signatures);

    // Set active user
    this.setActiveUser(username);

    // Save profile bio if entered
    if (userBio) {
      this.saveProfile(username, { bio: userBio });
    }

    // Apply session immediately
    this.restoreUserSession(username);

    // Push contract acceptance to Firestore (fire-and-forget)
    this._syncToCloud();
  },

  // ── Memories (shared between both users — same couple data) ───────────────

  async getMemories() {
    if (cachedMemories) return cachedMemories;

    let staticMemories = [];
    try {
      // Use absolute path so it works from any page depth
      const response = await fetch('/core/memories.json');
      if (response.ok) {
        staticMemories = await response.json();
      } else {
        // Fallback: try relative path for local dev without server
        const r2 = await fetch('../core/memories.json');
        if (r2.ok) staticMemories = await r2.json();
      }
    } catch (e) {
      console.warn('Failed to fetch memories.json:', e);
      staticMemories = [
        {
          id: 'mem_001',
          title: 'First Shared Anniversary Celebration',
          description: 'Celebrating our special day under soft fairy lights.',
          date: '2025-12-28',
          media: '/assets/photos/anniversary_2025.png',
          isVideo: false,
          tags: ['anniversary', 'love']
        }
      ];
    }

    // Normalize all media paths to absolute
    staticMemories = staticMemories.map(mem => ({
      ...mem,
      media: UserStore.normalizeMediaPath(mem.media)
    }));

    // Auto-scan from local dev server (silently skipped on Firebase Hosting)
    try {
      const scanRes = await fetch('/api/scan-media');
      if (scanRes.ok) {
        const scannedFiles = await scanRes.json();
        const existingPaths = new Set(staticMemories.map(m => m.media));

        scannedFiles.forEach(file => {
          const normalizedPath = UserStore.normalizeMediaPath(file.path);
          if (!existingPaths.has(normalizedPath)) {
            const rawName = file.filename.replace(/\.[^.]+$/, '');
            const friendlyTitle = rawName.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
            const date = new Date(file.mtime).toISOString().split('T')[0];

            staticMemories.push({
              id: `autoscan_${rawName.replace(/\W/g, '_')}`,
              title: friendlyTitle,
              description: `Auto-imported from your ${file.isVideo ? 'videos' : 'photos'} folder.`,
              date,
              media: normalizedPath,
              isVideo: file.isVideo,
              tags: [file.isVideo ? 'video' : 'photo', 'auto-import']
            });
          }
        });
      }
    } catch (e) {
      // Offline or Firebase Hosting — silently skip
    }

    // Load blacklist & overrides (shared, both users see same edits)
    const deletedMemories = UserStore.getSharedJSON(SHARED.DELETED_MEMORIES) || [];
    const overriddenMemories = UserStore.getSharedJSON(SHARED.OVERRIDDEN_MEMORIES) || {};
    const customMemories = (UserStore.getSharedJSON(SHARED.CUSTOM_MEMORIES) || []).map(mem => ({
      ...mem,
      media: UserStore.normalizeMediaPath(mem.media)
    }));

    const processedStatic = staticMemories
      .filter(mem => !deletedMemories.includes(mem.id))
      .map(mem => overriddenMemories[mem.id] ? { ...mem, ...overriddenMemories[mem.id], media: UserStore.normalizeMediaPath(overriddenMemories[mem.id].media || mem.media) } : mem);

    const processedCustom = customMemories.filter(mem => !deletedMemories.includes(mem.id));

    cachedMemories = [...processedStatic, ...processedCustom].sort((a, b) => new Date(b.date) - new Date(a.date));
    return cachedMemories;
  },

  addMemory(memory) {
    const customMemories = UserStore.getSharedJSON(SHARED.CUSTOM_MEMORIES) || [];

    const newMemory = {
      id: 'mem_custom_' + Date.now(),
      title: memory.title,
      description: memory.description,
      date: memory.date,
      media: UserStore.normalizeMediaPath(memory.media || '/assets/photos/anniversary_2025.png'),
      isVideo: memory.isVideo || false,
      tags: memory.tags || []
    };

    customMemories.push(newMemory);
    UserStore.setSharedJSON(SHARED.CUSTOM_MEMORIES, customMemories);
    cachedMemories = null;

    // Non-blocking cloud sync (future)
    try {
      const settings = this.getSettings();
      if (settings.privacyToggles && !settings.privacyToggles.localOnlyMode) {
        import('../firebase/firebase-config.js').then(({ firebaseServices }) => {
          firebaseServices.syncMemoryToCloud(newMemory);
        }).catch(err => console.log('Firebase sync import failed:', err));
      }
    } catch (e) { /* non-blocking */ }

    return newMemory;
  },

  deleteMemory(id) {
    const deletedMemories = UserStore.getSharedJSON(SHARED.DELETED_MEMORIES) || [];
    if (!deletedMemories.includes(id)) {
      deletedMemories.push(id);
      UserStore.setSharedJSON(SHARED.DELETED_MEMORIES, deletedMemories);
    }

    if (id.startsWith('mem_custom_')) {
      const customMemories = UserStore.getSharedJSON(SHARED.CUSTOM_MEMORIES) || [];
      UserStore.setSharedJSON(SHARED.CUSTOM_MEMORIES, customMemories.filter(m => m.id !== id));
    }

    cachedMemories = null;
  },

  updateMemory(id, data) {
    if (id.startsWith('mem_custom_')) {
      const customMemories = UserStore.getSharedJSON(SHARED.CUSTOM_MEMORIES) || [];
      const index = customMemories.findIndex(m => m.id === id);
      if (index !== -1) {
        customMemories[index] = {
          ...customMemories[index],
          ...data,
          media: UserStore.normalizeMediaPath(data.media || customMemories[index].media)
        };
        UserStore.setSharedJSON(SHARED.CUSTOM_MEMORIES, customMemories);
      }
    } else {
      const overriddenMemories = UserStore.getSharedJSON(SHARED.OVERRIDDEN_MEMORIES) || {};
      overriddenMemories[id] = {
        ...overriddenMemories[id],
        ...data,
        id,
        media: UserStore.normalizeMediaPath(data.media || (overriddenMemories[id] && overriddenMemories[id].media) || '')
      };
      UserStore.setSharedJSON(SHARED.OVERRIDDEN_MEMORIES, overriddenMemories);
    }

    cachedMemories = null;

    // Non-blocking cloud sync (future)
    try {
      const settings = this.getSettings();
      if (settings.privacyToggles && !settings.privacyToggles.localOnlyMode) {
        import('../firebase/firebase-config.js').then(({ firebaseServices }) => {
          firebaseServices.syncMemoryToCloud({ id, ...data });
        }).catch(err => console.log('Firebase sync import failed:', err));
      }
    } catch (e) { /* non-blocking */ }
  },

  // ── Settings (user-scoped — each user has their own preferences) ──────────

  getSettings() {
    const stored = UserStore.getJSON(USER.SETTINGS);
    if (!stored) {
      UserStore.setJSON(USER.SETTINGS, DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    }
    // Deep merge to ensure all keys exist even if schema grew
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      privacyToggles: {
        ...DEFAULT_SETTINGS.privacyToggles,
        ...(stored.privacyToggles || {})
      }
    };
  },

  saveSettings(settings) {
    UserStore.setJSON(USER.SETTINGS, settings);
    if (settings.theme) {
      // setTheme already calls _syncToCloud, so just apply the theme attr
      UserStore.set(USER.THEME, settings.theme);
      UserStore.setShared(USER.THEME, settings.theme);
      localStorage.setItem('memorybook_last_local_write', Date.now().toString());
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
    // Push settings change to Firestore (fire-and-forget)
    this._syncToCloud();
  }
};
