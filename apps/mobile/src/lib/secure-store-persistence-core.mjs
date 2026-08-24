const PERSISTENCE_PREFIX = 'couplebook.firebase.auth:';

export function getStorageKey(key) {
  return `${PERSISTENCE_PREFIX}${key}`;
}

export function createSecureStorePersistence({ platformOs, secureStore }) {
  function supportsSecureStore() {
    return platformOs !== 'web';
  }

  return {
    type: 'LOCAL',
    async _isAvailable() {
      return supportsSecureStore();
    },
    async _set(key, value) {
      if (!supportsSecureStore()) return;
      await secureStore.setItemAsync(getStorageKey(key), value, {
        keychainAccessible: secureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    },
    async _get(key) {
      if (!supportsSecureStore()) return null;
      return secureStore.getItemAsync(getStorageKey(key));
    },
    async _remove(key) {
      if (!supportsSecureStore()) return;
      await secureStore.deleteItemAsync(getStorageKey(key));
    },
  };
}
