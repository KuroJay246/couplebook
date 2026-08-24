const REQUIRED_FIREBASE_CONFIG = [
  'apiKey',
  'authDomain',
  'projectId',
  'messagingSenderId',
  'appId',
] as const;

export type MobileFirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function readEnv() {
  return {
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  };
}

export function createFirebaseConfig(env = readEnv()): MobileFirebaseConfig {
  return {
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
}

export function getMissingFirebaseConfigKeys(config = createFirebaseConfig()) {
  return REQUIRED_FIREBASE_CONFIG.filter((key) => !String(config[key] || '').trim());
}

export function formatMissingFirebaseConfigMessage(missingKeys: readonly string[]) {
  if (!missingKeys.length) return '';
  return `Firebase configuration is incomplete: ${missingKeys.join(', ')}`;
}

export const firebaseConfig = createFirebaseConfig();
export const missingFirebaseConfigKeys = getMissingFirebaseConfigKeys(firebaseConfig);
export const missingFirebaseConfigMessage =
  formatMissingFirebaseConfigMessage(missingFirebaseConfigKeys);
export const isFirebaseConfigured = missingFirebaseConfigKeys.length === 0;
