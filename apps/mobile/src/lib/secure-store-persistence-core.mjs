const PERSISTENCE_PREFIX = 'couplebook.firebase.auth.';

export function getStorageKey(key) {
  const safeKey = String(key || '')
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${PERSISTENCE_PREFIX}${safeKey || 'firebase_auth'}`;
}

export function createSecureStorePersistence({ platformOs, secureStore }) {
  function supportsSecureStore() {
    return platformOs !== 'web';
  }

  class SecureStorePersistence {
    static type = 'LOCAL';

    constructor() {
      this.type = 'LOCAL';
    }

    async _isAvailable() {
      if (!supportsSecureStore()) return false;

      if (typeof secureStore?.isAvailableAsync === 'function') {
        try {
          return await secureStore.isAvailableAsync();
        } catch {
          return false;
        }
      }

      return true;
    }

    async _set(key, value) {
      if (!supportsSecureStore()) return;

      await secureStore.setItemAsync(getStorageKey(key), JSON.stringify(value), {
        keychainAccessible: secureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }

    async _get(key) {
      if (!supportsSecureStore()) return null;

      const json = await secureStore.getItemAsync(getStorageKey(key));
      return json ? JSON.parse(json) : null;
    }

    async _remove(key) {
      if (!supportsSecureStore()) return;
      await secureStore.deleteItemAsync(getStorageKey(key));
    }

    _addListener() {}

    _removeListener() {}
  }

  return SecureStorePersistence;
}
