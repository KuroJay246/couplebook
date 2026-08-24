export const WRITE_MODES = Object.freeze({
  firestoreEmulatorWrite: 'firestore-emulator-write',
  firestoreProductionWrite: 'firestore-production-write',
  productionWriteDisabled: 'production-write-disabled',
});

function getRuntimeMode(env = {}) {
  return String(env.NODE_ENV || env.MODE || 'development').trim().toLowerCase();
}

export function resolveWriteMode(env = {}) {
  const requested = String(
    env.EXPO_PUBLIC_FIREBASE_WRITE_MODE || env.VITE_WRITE_MODE || '',
  )
    .trim()
    .toLowerCase();

  if (Object.values(WRITE_MODES).includes(requested)) {
    return requested;
  }

  return WRITE_MODES.productionWriteDisabled;
}

export function isFirestoreEmulatorWriteMode(env = {}) {
  return (
    resolveWriteMode(env) === WRITE_MODES.firestoreEmulatorWrite &&
    getRuntimeMode(env) !== 'production'
  );
}

export function isFirestoreProductionWriteMode(env = {}) {
  return (
    resolveWriteMode(env) === WRITE_MODES.firestoreProductionWrite &&
    getRuntimeMode(env) === 'production'
  );
}

export function isFirestoreWriteMode(env = {}) {
  return (
    isFirestoreEmulatorWriteMode(env) || isFirestoreProductionWriteMode(env)
  );
}
