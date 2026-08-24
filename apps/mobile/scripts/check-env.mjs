import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_ENV_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

const REQUIRED_PROJECT_ID = 'couplebook-97830';
const PROHIBITED_PROJECT_IDS = new Set(['gathervibeshub']);
const ALLOWED_WRITE_MODES = new Set([
  '',
  'production-write-disabled',
  'firestore-emulator-write',
  'firestore-production-write',
]);

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const env = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const separatorIndex = trimmed.indexOf('=');
    const name = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    env[name] = value;
  }

  return env;
}

function isLocalhostValue(value) {
  return /(^|:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(String(value || '').trim());
}

const appRoot = process.cwd();
const envFilePath = path.join(appRoot, '.env.local');
const fileEnv = parseEnvFile(envFilePath);
const env = { ...fileEnv, ...process.env };

const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !String(env[key] || '').trim());
if (missingKeys.length) {
  console.error(`Couple Book mobile env check failed. Missing variables: ${missingKeys.join(', ')}`);
  process.exit(1);
}

const projectId = String(env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '').trim();
if (PROHIBITED_PROJECT_IDS.has(projectId)) {
  console.error(`Couple Book mobile env check failed. Firebase project ${projectId} is prohibited.`);
  process.exit(1);
}

if (projectId !== REQUIRED_PROJECT_ID && !/^demo-/i.test(projectId)) {
  console.error(
    `Couple Book mobile env check failed. Firebase project ${projectId} does not match ${REQUIRED_PROJECT_ID}.`,
  );
  process.exit(1);
}

const isDevelopment = String(env.NODE_ENV || 'development').trim().toLowerCase() !== 'production';
const writeMode = String(env.EXPO_PUBLIC_FIREBASE_WRITE_MODE || '').trim().toLowerCase();
if (!ALLOWED_WRITE_MODES.has(writeMode)) {
  console.error(
    `Couple Book mobile env check failed. Unsupported write mode: ${env.EXPO_PUBLIC_FIREBASE_WRITE_MODE}.`,
  );
  process.exit(1);
}

if (!isDevelopment && writeMode === 'firestore-emulator-write') {
  console.error(
    'Couple Book mobile env check failed. Production builds must not use firestore-emulator-write.',
  );
  process.exit(1);
}

const useEmulators = String(env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS || '').trim() === 'true';
const hasLocalRuntimeConfig =
  isLocalhostValue(env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN) ||
  isLocalhostValue(env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET) ||
  isLocalhostValue(env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL) ||
  isLocalhostValue(env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST) ||
  useEmulators;

if (!isDevelopment && hasLocalRuntimeConfig) {
  console.error(
    'Couple Book mobile env check failed. Production builds must not use localhost or Firebase emulator configuration.',
  );
  process.exit(1);
}

console.log(`Couple Book mobile env check passed for ${projectId} (${isDevelopment ? 'development' : 'production'}).`);
