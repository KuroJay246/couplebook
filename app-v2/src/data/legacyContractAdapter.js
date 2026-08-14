import {
  LEGACY_LOCAL_STORAGE_SOURCE,
  createCompatibilityResult,
  deepClone,
  isPlainObject,
  normalizeBoolean,
  normalizePersonKey,
  parseStoredJson,
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
 * @property {Array<{ accepted: boolean, timestamp: string | null, version: string | null, unknownFields: Record<string, unknown>, hasLegacyPayload: boolean, redactedFields: string[] }>} history
 * @property {Record<string, unknown>} unknownFields
 * @property {boolean} hasLegacyPayload
 * @property {string[]} redactedFields
 */

/**
 * @typedef {Object} NormalizedContractState
 * @property {string} username
 * @property {boolean} accepted
 * @property {NormalizedContractSignature | null} activeSignature
 * @property {Record<string, NormalizedContractSignature>} signaturesByUsername
 */

const REDACTED_VALUE = Symbol('contract-signature-redacted')
const SENSITIVE_SIGNATURE_KEY_PATTERN = /(signature|dataurl|base64|stroke|canvas|image|binary|payload|svg|png|jpe?g|webp|gif|points|path)/i

function getSafeRedactionLabel(keyPath) {
  const [rootKey = 'signature'] = toTrimmedString(keyPath).split(/[.[\]]+/).filter(Boolean)
  return /^payload$/i.test(rootKey) ? 'payload' : 'signature-data'
}

function isLikelyDataUrl(value) {
  return /^data:/i.test(toTrimmedString(value))
}

function isLikelyBase64Payload(value) {
  const normalized = toTrimmedString(value).replace(/\s+/g, '')
  return normalized.length >= 80 && /^[A-Za-z0-9+/=]+$/.test(normalized)
}

function isSensitiveSignatureValue(keyPath, value) {
  if (SENSITIVE_SIGNATURE_KEY_PATTERN.test(keyPath)) return true
  if (typeof value === 'string' && (isLikelyDataUrl(value) || isLikelyBase64Payload(value))) {
    return true
  }
  return false
}

function sanitizeSignatureUnknownValue(value, keyPath, redactedFields) {
  if (Array.isArray(value)) {
    const sanitizedItems = value.flatMap((entry, index) => {
      const sanitizedEntry = sanitizeSignatureUnknownValue(entry, `${keyPath}[${index}]`, redactedFields)
      return sanitizedEntry === REDACTED_VALUE ? [] : [sanitizedEntry]
    })

    if (sanitizedItems.length === 0 && SENSITIVE_SIGNATURE_KEY_PATTERN.test(keyPath)) {
      return REDACTED_VALUE
    }

    return sanitizedItems.map((entry) => deepClone(entry))
  }

  if (isPlainObject(value)) {
    const sanitizedEntries = Object.entries(value).flatMap(([entryKey, entryValue]) => {
      const sanitizedValue = sanitizeSignatureUnknownValue(entryValue, `${keyPath}.${entryKey}`, redactedFields)
      return sanitizedValue === REDACTED_VALUE ? [] : [[entryKey, sanitizedValue]]
    })

    if (sanitizedEntries.length === 0 && SENSITIVE_SIGNATURE_KEY_PATTERN.test(keyPath)) {
      return REDACTED_VALUE
    }

    return Object.fromEntries(sanitizedEntries)
  }

  if (isSensitiveSignatureValue(keyPath, value)) {
    redactedFields.push(getSafeRedactionLabel(keyPath))
    return REDACTED_VALUE
  }

  return deepClone(value)
}

function sanitizeSignatureUnknownFields(rawSource, excludedKeys = []) {
  const unknownFields = {}
  const redactedFields = []
  const excluded = new Set(excludedKeys)

  for (const [key, value] of Object.entries(rawSource || {})) {
    if (excluded.has(key)) continue

    const sanitizedValue = sanitizeSignatureUnknownValue(value, key, redactedFields)
    if (sanitizedValue !== REDACTED_VALUE) {
      unknownFields[key] = sanitizedValue
    }
  }

  return {
    unknownFields,
    redactedFields: [...new Set(redactedFields)],
  }
}

function normalizeSignatureHistoryEntry(rawEntry) {
  const { unknownFields, redactedFields } = sanitizeSignatureUnknownFields(rawEntry, ['accepted', 'timestamp', 'version'])

  return {
    accepted: normalizeBoolean(rawEntry.accepted, false),
    timestamp: toTrimmedString(rawEntry.timestamp) || null,
    version: toTrimmedString(rawEntry.version) || null,
    unknownFields,
    hasLegacyPayload: redactedFields.length > 0,
    redactedFields,
  }
}

function normalizeSignatureRecord(rawSignature) {
  if (!isPlainObject(rawSignature)) {
    return {
      accepted: false,
      timestamp: null,
      version: null,
      history: [],
      unknownFields: {},
      hasLegacyPayload: false,
      redactedFields: [],
    }
  }

  const history = Array.isArray(rawSignature.history)
    ? rawSignature.history.flatMap((entry) => (isPlainObject(entry) ? [normalizeSignatureHistoryEntry(entry)] : []))
    : []
  const { unknownFields, redactedFields } = sanitizeSignatureUnknownFields(rawSignature, ['accepted', 'timestamp', 'version', 'history'])
  const historyRedactions = history.flatMap((entry) => entry.redactedFields || [])
  const allRedactedFields = [...new Set([...redactedFields, ...historyRedactions])]

  return {
    accepted: normalizeBoolean(rawSignature.accepted, false),
    timestamp: toTrimmedString(rawSignature.timestamp) || null,
    version: toTrimmedString(rawSignature.version) || null,
    history,
    unknownFields,
    hasLegacyPayload: allRedactedFields.length > 0,
    redactedFields: allRedactedFields,
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
