import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { createCompatibilityResult, FIRESTORE_SOURCE, freezeClone, isPlainObject, toTrimmedString } from '../data/adapterUtils.js'

export async function readDocument({ firestore, path, getDocument = getDoc, normalize, missingStatus = 'unavailable' }) {
  if (!firestore) throw new Error('Firestore is not configured for app-v2.')
  const reference = doc(firestore, ...path)
  const snapshot = await getDocument(reference)

  if (!snapshot.exists()) {
    return createCompatibilityResult({
      status: missingStatus,
      source: FIRESTORE_SOURCE,
      warnings: [`Firestore document ${path.join('/')} is missing.`],
    })
  }

  return normalizeDocumentData(snapshot.id, snapshot.data(), normalize)
}

export async function readCollection({ firestore, path, getCollection = getDocs, normalizeEntry, emptyStatus = 'empty' }) {
  if (!firestore) throw new Error('Firestore is not configured for app-v2.')
  const snapshot = await getCollection(collection(firestore, ...path))
  const warnings = []
  const entries = []

  snapshot.forEach((documentSnapshot) => {
    const normalized = normalizeEntry(documentSnapshot.id, documentSnapshot.data(), warnings)
    if (normalized) entries.push(normalized)
  })

  return createCompatibilityResult({
    status: entries.length > 0 ? 'ready' : emptyStatus,
    source: FIRESTORE_SOURCE,
    data: { entries },
    warnings,
  })
}

export function normalizeDocumentData(id, data, normalize) {
  if (!isPlainObject(data)) {
    return createCompatibilityResult({
      status: 'invalid',
      source: FIRESTORE_SOURCE,
      warnings: ['Firestore document was malformed.'],
    })
  }

  const warnings = []
  const normalized = normalize(id, data, warnings)

  if (!normalized) {
    return createCompatibilityResult({
      status: 'invalid',
      source: FIRESTORE_SOURCE,
      warnings: warnings.length ? warnings : ['Firestore document failed validation.'],
    })
  }

  return createCompatibilityResult({
    status: warnings.length ? 'partial' : 'ready',
    source: FIRESTORE_SOURCE,
    data: freezeClone(normalized),
    warnings,
  })
}

export function requireSchemaVersion(data, warnings, version = 1) {
  if (data.schemaVersion !== version) {
    warnings.push('Firestore document schemaVersion is unsupported.')
    return false
  }
  return true
}

export function safeString(value, maxLength = 500) {
  const text = toTrimmedString(value)
  if (!text || text.length > maxLength) return ''
  if (/<\s*\/?\s*(script|style|iframe|object|embed|img|video|audio)\b|on[a-z]+\s*=|javascript:/i.test(text)) return ''
  return text
}

export function safeStringArray(value, maxItems = 20, maxLength = 80) {
  if (!Array.isArray(value)) return []
  return value
    .flatMap((item) => {
      const safeItem = safeString(item, maxLength)
      return safeItem ? [safeItem] : []
    })
    .slice(0, maxItems)
}

export function rejectUnsafeMediaReference(value) {
  const text = toTrimmedString(value)
  if (!text) return ''
  if (/[A-Z]:\\|file:\/\/|\\Users\\|\/Users\/|OUR MEMORIES|assets\/(?:photos|videos)/i.test(text)) return ''
  return text.length <= 240 ? text : ''
}
