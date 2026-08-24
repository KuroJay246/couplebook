import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PERSISTENCE_PREFIX = 'couplebook.firebase.auth:';

function supportsSecureStore() {
  return Platform.OS !== 'web';
}

function getStorageKey(key: string) {
  return `${PERSISTENCE_PREFIX}${key}`;
}

export const secureStorePersistence = {
  type: 'LOCAL',
  async _isAvailable() {
    return supportsSecureStore();
  },
  async _set(key: string, value: string) {
    if (!supportsSecureStore()) return;
    await SecureStore.setItemAsync(getStorageKey(key), value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  async _get(key: string) {
    if (!supportsSecureStore()) return null;
    return SecureStore.getItemAsync(getStorageKey(key));
  },
  async _remove(key: string) {
    if (!supportsSecureStore()) return;
    await SecureStore.deleteItemAsync(getStorageKey(key));
  },
} as const;
