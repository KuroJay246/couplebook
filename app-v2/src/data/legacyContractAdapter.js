import {
  LEGACY_LOCAL_STORAGE_SOURCE,
  createCompatibilityResult,
  isPlainObject,
  normalizeBoolean,
  normalizePersonKey,
  parseStoredJson,
  pickObjectEntries,
  readStorageValue,
  resolveStorage,
  toTrimmedString,
} from './adapterUtils.js'

const ACCEPTED_KEY_PREFIX = 'memorybook_contract_accepted_'
const SIGNATURES_KEY = 'memorybook_contract_signatures'

/**
 * @typedef {Object} NormalizedContractSignature
 * @property {boolean} accepted
 * @property {string | null} timestamp
 * @property {string | null} version
 * @property {Array<{ accepted: boolean, timestamp: string | null, version: string | null, unknownFields: Record<string, unknown> }>} history
 * @property {Record<string, unknown>} unknownFields
 */

/**
 * @typedef {Object} NormalizedContractState
 * @property {string} username
 * @property {boolean} accepted
 * @property {NormalizedContractSignature | null} activeSignature
 * @property {Record<string, NormalizedContractSignature>} signaturesByUsername
 */

export const legacyContractAdapterBoundary = Object.freeze({
  adapter: 'legacyContractAdapter',
  currentSources: [
    'localStorage: memorybook_contract_accepted_{username}',
    'localStorage: memorybook_contract_signatures',
    'Firestore: users/{uid}.contractAccepted',
    'Firestore: users/{uid}.signature',
  ],
  expectedNormalizedOutput:
    'CompatibilityResult<NormalizedContractState> for the approved active user without treating localStorage as auth proof.',
  mode: 'read-only',
  futureOwner: 'R3 compatibility mapping before contract domain service extraction',
})

function normalizeSignatureRecord(rawSignature) {
  if (!isPlainObject(rawSignature)) {
    return {
      accepted: false,
      timestamp: null,
      version: null,
      history: [],
      unknownFields: {},
    }
  }

  const history = Array.isArray(rawSignature.history)
    ? rawSignature.history
        .filter((entry) => isPlainObject(entry))
        .map((entry) => ({
          accepted: normalizeBoolean(entry.accepted, false),
          timestamp: toTrimmedString(entry.timestamp) || null,
          version: toTrimmedString(entry.version) || null,
          unknownFields: pickObjectEntries(entry, ['accepted', 'timestamp', 'version']),
        }))
    : []

  return {
    accepted: normalizeBoolean(rawSignature.accepted, false),
    timestamp: toTrimmedString(rawSignature.timestamp) || null,
    version: toTrimmedString(rawSignature.version) || null,
    history,
    unknownFields: pickObjectEntries(rawSignature, ['accepted', 'timestamp', 'version', 'history']),
  }
}

export async function readLegacyContractState(options = {}) {
  const username = toTrimmedString(options.username)
  if (!username) {
    return createCompatibilityResult({
      status: 'invalid',
      source: LEGACY_LOCAL_STORAGE_SOURCE,
      warnings: ['An approved username is required before reading legacy contract state.'],
    })
  }

  const warnings = []
  const storage = resolveStorage(options.storage)

  if (!storage) {
    return createCompatibilityResult({
      status: 'unavailable',
      source: LEGACY_LOCAL_STORAGE_SOURCE,
      warnings: ['Browser storage is unavailable for legacy contract state.'],
    })
  }

  const acceptedKey = `${ACCEPTED_KEY_PREFIX}${username}`
  const acceptedRawValue = readStorageValue(storage, acceptedKey, warnings)
  const accepted = acceptedRawValue === 'true'

  if (acceptedRawValue && acceptedRawValue !== 'true' && acceptedRawValue !== 'false') {
    warnings.push(`Legacy contract flag for ${username} used an unexpected value.`)
  }

  const parsedSignatures = parseStoredJson(readStorageValue(storage, SIGNATURES_KEY, warnings), SIGNATURES_KEY, warnings)
  const signaturesByUsername = {}
  let status = accepted ? 'ready' : 'empty'

  if (!parsedSignatures.missing) {
    if (!parsedSignatures.ok || !isPlainObject(parsedSignatures.value)) {
      status = status === 'ready' ? 'invalid' : 'invalid'
    } else {
      for (const [key, value] of Object.entries(parsedSignatures.value)) {
        signaturesByUsername[normalizePersonKey(key)] = normalizeSignatureRecord(value)
      }

      if (Object.keys(signaturesByUsername).length) {
        status = status === 'empty' ? 'ready' : status
      }
    }
  }

  const activeSignature = signaturesByUsername[normalizePersonKey(username)] || null
  const resolvedAccepted = accepted || activeSignature?.accepted === true

  return createCompatibilityResult({
    status,
    source: LEGACY_LOCAL_STORAGE_SOURCE,
    data: {
      username,
      accepted: resolvedAccepted,
      activeSignature,
      signaturesByUsername,
    },
    warnings,
  })
}
