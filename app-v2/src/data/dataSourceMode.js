import { getRuntimeMode, readRuntimeEnv, toTrimmedString } from './adapterUtils.js'

export const DATA_SOURCE_MODES = Object.freeze({
  legacy: 'legacy',
  firestore: 'firestore',
  test: 'test',
})

export function resolveDataSourceMode(env = readRuntimeEnv()) {
  const requested = toTrimmedString(env.VITE_DATA_SOURCE_MODE).toLowerCase()
  const mode = requested || DATA_SOURCE_MODES.legacy

  if (!Object.values(DATA_SOURCE_MODES).includes(mode)) {
    return DATA_SOURCE_MODES.legacy
  }

  if (mode === DATA_SOURCE_MODES.test && getRuntimeMode(env) === 'production') {
    return DATA_SOURCE_MODES.legacy
  }

  return mode
}
