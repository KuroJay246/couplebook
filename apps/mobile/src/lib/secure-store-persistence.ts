import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createSecureStorePersistence } from '@/lib/secure-store-persistence-core.mjs';

export const secureStorePersistence = createSecureStorePersistence({
  platformOs: Platform.OS,
  secureStore: SecureStore,
});
