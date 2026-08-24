const REQUIRED_FIREBASE_ENV_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

const REQUIRED_FIREBASE_ENV_TO_CONFIG_KEY = {
  EXPO_PUBLIC_FIREBASE_API_KEY: 'apiKey',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'authDomain',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'projectId',
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'messagingSenderId',
  EXPO_PUBLIC_FIREBASE_APP_ID: 'appId',
} as const;

const REQUIRED_COUPLE_BOOK_PROJECT_ID = 'couplebook-97830';
const PROHIBITED_FIREBASE_PROJECT_IDS = ['gathervibeshub'] as const;

export type MobileFirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

type MobileFirebaseEnv = {
  EXPO_PUBLIC_FIREBASE_API_KEY: string;
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: string;
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  EXPO_PUBLIC_FIREBASE_APP_ID: string;
  EXPO_PUBLIC_FIREBASE_USE_EMULATORS: string;
  EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: string;
  EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST: string;
  EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT: string;
  NODE_ENV: string;
};

type FirebaseConfigValidationResult = {
  missingVariableNames: readonly string[];
  errors: readonly string[];
  isDevelopment: boolean;
};

function readEnv(): MobileFirebaseEnv {
  return {
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
    EXPO_PUBLIC_FIREBASE_USE_EMULATORS: process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS ?? '',
    EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL:
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL ?? '',
    EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST: process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST ?? '',
    EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT: process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT ?? '',
    NODE_ENV: process.env.NODE_ENV ?? '',
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

function isLocalhostValue(value: string) {
  return /(^|:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(value.trim());
}

function isEmulatorProjectId(projectId: string) {
  return /^demo-/i.test(projectId.trim());
}

function getMissingFirebaseConfigVariableNames(
  config = createFirebaseConfig(),
): readonly string[] {
  return REQUIRED_FIREBASE_ENV_KEYS.filter((envKey) => {
    const configKey = REQUIRED_FIREBASE_ENV_TO_CONFIG_KEY[envKey];
    return !String(config[configKey] || '').trim();
  });
}

export function validateFirebaseConfig(
  config = createFirebaseConfig(),
  env = readEnv(),
): FirebaseConfigValidationResult {
  const missingVariableNames = getMissingFirebaseConfigVariableNames(config);
  const errors: string[] = [];
  const projectId = config.projectId.trim();
  const authDomain = config.authDomain.trim();
  const storageBucket = config.storageBucket.trim();
  const authEmulatorUrl = env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL.trim();
  const firestoreEmulatorHost = env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST.trim();
  const useFirebaseEmulators = env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS.trim() === 'true';
  const isDevelopment = env.NODE_ENV.trim().toLowerCase() !== 'production';

  if (projectId) {
    if (PROHIBITED_FIREBASE_PROJECT_IDS.some((blockedProjectId) => blockedProjectId === projectId)) {
      errors.push(`Firebase project ${projectId} is prohibited for Couple Book mobile.`);
    } else if (projectId !== REQUIRED_COUPLE_BOOK_PROJECT_ID && !isEmulatorProjectId(projectId)) {
      errors.push(
        `Firebase project ${projectId} is not allowed for Couple Book mobile; expected ${REQUIRED_COUPLE_BOOK_PROJECT_ID}.`,
      );
    }
  }

  if (!isDevelopment) {
    const hasLocalRuntimeConfig =
      isLocalhostValue(authDomain) ||
      isLocalhostValue(storageBucket) ||
      isLocalhostValue(authEmulatorUrl) ||
      isLocalhostValue(firestoreEmulatorHost) ||
      useFirebaseEmulators;

    if (hasLocalRuntimeConfig) {
      errors.push('Production Couple Book mobile builds must not use localhost or Firebase emulator configuration.');
    }
  }

  return {
    missingVariableNames,
    errors,
    isDevelopment,
  };
}

export function formatFirebaseConfigValidationMessage(
  validation: FirebaseConfigValidationResult,
) {
  if (validation.missingVariableNames.length) {
    return `Firebase configuration is incomplete: ${validation.missingVariableNames.join(', ')}`;
  }

  if (!validation.errors.length) return '';

  const scope = validation.isDevelopment ? 'development' : 'production';
  return `Firebase ${scope} configuration is invalid: ${validation.errors.join(' ')}`;
}

export const firebaseConfig = createFirebaseConfig();
export const firebaseConfigValidation = validateFirebaseConfig(firebaseConfig);
export const missingFirebaseConfigKeys = firebaseConfigValidation.missingVariableNames;
export const missingFirebaseConfigMessage =
  formatFirebaseConfigValidationMessage(firebaseConfigValidation);
export const isFirebaseConfigured =
  firebaseConfigValidation.missingVariableNames.length === 0 &&
  firebaseConfigValidation.errors.length === 0;
