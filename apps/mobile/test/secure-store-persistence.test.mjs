import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSecureStorePersistence,
  getStorageKey,
} from '../src/lib/secure-store-persistence-core.mjs';

function createFakeSecureStore() {
  const calls = [];
  const values = new Map();

  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
    calls,
    values,
    async setItemAsync(key, value, options) {
      calls.push(['set', key, value, options]);
      values.set(key, value);
    },
    async getItemAsync(key) {
      calls.push(['get', key]);
      return values.get(key) ?? null;
    },
    async deleteItemAsync(key) {
      calls.push(['delete', key]);
      values.delete(key);
    },
  };
}

test('getStorageKey keeps Couple Book auth keys scoped with a stable prefix', () => {
  assert.equal(getStorageKey('firebase:user'), 'couplebook.firebase.auth.firebase_user');
});

test('native persistence stores, reads, and removes auth payloads through SecureStore', async () => {
  const secureStore = createFakeSecureStore();
  const Persistence = createSecureStorePersistence({ platformOs: 'ios', secureStore });
  const persistence = new Persistence();

  assert.equal(await persistence._isAvailable(), true);
  await persistence._set('firebase:user', 'session-value');
  assert.equal(await persistence._get('firebase:user'), 'session-value');
  await persistence._remove('firebase:user');
  assert.equal(await persistence._get('firebase:user'), null);

  assert.deepEqual(secureStore.calls[0], [
    'set',
    'couplebook.firebase.auth.firebase_user',
    '"session-value"',
    { keychainAccessible: 'device-only' },
  ]);
});

test('web persistence is a safe no-op and does not touch SecureStore', async () => {
  const secureStore = createFakeSecureStore();
  const Persistence = createSecureStorePersistence({ platformOs: 'web', secureStore });
  const persistence = new Persistence();

  assert.equal(await persistence._isAvailable(), false);
  await persistence._set('firebase:user', 'session-value');
  assert.equal(await persistence._get('firebase:user'), null);
  await persistence._remove('firebase:user');
  assert.equal(secureStore.calls.length, 0);
});
