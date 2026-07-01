/**
 * persistence.js — MemoryBook Unified Storage API
 *
 * ARCHITECTURE:
 *   LOCAL-FIRST (primary) → Firebase Hosting (public access) → Future sync (not active)
 *
 * This module is the single source of truth for all localStorage access.
 * All keys are namespaced under "memorybook_" to avoid collisions.
 *
 * USER-SCOPED keys:  memorybook_{key}_{Username}    → per-user, isolated
 * SHARED keys:       memorybook_{key}               → couple-wide, both users see it
 *
 * When Firestore sync is added in the future, swap the read/write internals here
 * and every module that uses UserStore gets sync for free.
 */

const NS = 'memorybook';

// ─── Internal helpers ────────────────────────────────────────────────────────

function _read(fullKey) {
  try {
    return localStorage.getItem(fullKey);
  } catch (e) {
    console.warn('[UserStore] localStorage read failed:', fullKey, e);
    return null;
  }
}

function _write(fullKey, value) {
  try {
    localStorage.setItem(fullKey, value);
  } catch (e) {
    console.warn('[UserStore] localStorage write failed:', fullKey, e);
  }
}

function _remove(fullKey) {
  try {
    localStorage.removeItem(fullKey);
  } catch (e) {
    console.warn('[UserStore] localStorage remove failed:', fullKey, e);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const UserStore = {
  /**
   * Returns the currently active username from session, or 'Guest'.
   */
  getActiveUser() {
    return _read(`${NS}_active_session`) || _read(`${NS}_active_user`) || 'Guest';
  },

  /**
   * Returns the scoped storage key for the current user.
   * e.g. UserStore.scopedKey('theme') → 'memorybook_theme_Jaylan'
   */
  scopedKey(suffix) {
    const user = this.getActiveUser();
    return `${NS}_${suffix}_${user}`;
  },

  /**
   * Returns the global (shared/couple-wide) storage key.
   * e.g. UserStore.sharedKey('profiles') → 'memorybook_profiles'
   */
  sharedKey(suffix) {
    return `${NS}_${suffix}`;
  },

  // ── User-scoped reads/writes ─────────────────────────────────────────────

  /**
   * Get a user-scoped value. Falls back to the legacy global key if user-scoped
   * key is missing (migration path for existing data).
   */
  get(suffix, defaultValue = null) {
    const scoped = _read(this.scopedKey(suffix));
    if (scoped !== null) return scoped;

    // Migration fallback: check legacy non-scoped key
    const legacy = _read(this.sharedKey(suffix));
    if (legacy !== null) {
      // Promote legacy value to user-scoped key (one-time migration)
      _write(this.scopedKey(suffix), legacy);
      return legacy;
    }

    return defaultValue;
  },

  set(suffix, value) {
    _write(this.scopedKey(suffix), value);
  },

  remove(suffix) {
    _remove(this.scopedKey(suffix));
  },

  getJSON(suffix, defaultValue = null) {
    const raw = this.get(suffix);
    if (raw === null) return defaultValue;
    try { return JSON.parse(raw); } catch { return defaultValue; }
  },

  setJSON(suffix, value) {
    this.set(suffix, JSON.stringify(value));
  },

  // ── Shared (couple-wide) reads/writes ────────────────────────────────────

  /**
   * Get a shared (non-user-scoped) value. Used for data both users should see:
   * profiles, memories, signatures, users list.
   */
  getShared(suffix, defaultValue = null) {
    const val = _read(this.sharedKey(suffix));
    return val !== null ? val : defaultValue;
  },

  setShared(suffix, value) {
    _write(this.sharedKey(suffix), value);
  },

  removeShared(suffix) {
    _remove(this.sharedKey(suffix));
  },

  getSharedJSON(suffix, defaultValue = null) {
    const raw = this.getShared(suffix);
    if (raw === null) return defaultValue;
    try { return JSON.parse(raw); } catch { return defaultValue; }
  },

  setSharedJSON(suffix, value) {
    this.setShared(suffix, JSON.stringify(value));
  },

  // ── Explicit key access (raw, no namespacing) ────────────────────────────

  getRaw(fullKey, defaultValue = null) {
    const val = _read(fullKey);
    return val !== null ? val : defaultValue;
  },

  setRaw(fullKey, value) {
    _write(fullKey, value);
  },

  removeRaw(fullKey) {
    _remove(fullKey);
  },

  // ── Media path normalization ─────────────────────────────────────────────

  /**
   * Normalizes a media path for the current environment.
   *
   * In the pages/ directory:  '../assets/photo.jpg' works fine
   * At hosted root (/):       '../assets/photo.jpg' would be wrong → use '/assets/photo.jpg'
   * This method returns the correct absolute path from site root.
   *
   * We always return an absolute path starting with '/assets/' so it works
   * on both local dev (served from root via server.js) and Firebase Hosting.
   */
  normalizeMediaPath(path) {
    if (!path || typeof path !== 'string') return '/assets/photos/anniversary_2025.png';

    // Already absolute (starts with / or http)
    if (path.startsWith('/') || path.startsWith('http')) return path;

    // Convert relative '../assets/...' or 'assets/...' to absolute '/assets/...'
    const normalized = path
      .replace(/^\.\.\//, '/')       // '../assets/' → '/assets/'
      .replace(/^\.\//, '/')         // './assets/'  → '/assets/'
      .replace(/^assets\//, '/assets/'); // 'assets/' → '/assets/'

    // If it still looks relative (no leading slash), prefix it
    if (!normalized.startsWith('/')) return '/' + normalized;

    return normalized;
  },

  /**
   * Returns the fallback placeholder path.
   */
  get FALLBACK_IMAGE() {
    return '/assets/photos/anniversary_2025.png';
  },

  get FALLBACK_VIDEO_POSTER() {
    return '/assets/photos/anniversary_2025.png';
  }
};

export default UserStore;
