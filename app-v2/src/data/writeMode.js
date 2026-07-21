import { getRuntimeMode, readRuntimeEnv, toTrimmedString } from './adapterUtils.js'

export const WRITE_MODES = Object.freeze({
  legacyRead: 'legacy-read',
  firestoreRead: 'firestore-read',
  firestoreEmulatorWrite: 'firestore-emulator-write',
  productionWriteDisabled: 'production-write-disabled',
})

export function resolveWriteMode(env = readRuntimeEnv()) {
  const requested = toTrimmedString(env.VITE_WRITE_MODE).toLowerCase()
  if (Object.values(WRITE_MODES).includes(requested)) {
    return requested
  }

  return WRITE_MODES.productionWriteDisabled
}

export function isFirestoreEmulatorWriteMode(env = readRuntimeEnv()) {
  return resolveWriteMode(env) === WRITE_MODES.firestoreEmulatorWrite && getRuntimeMode(env) !== 'production'
}
