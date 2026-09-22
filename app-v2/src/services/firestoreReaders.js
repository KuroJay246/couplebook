import { collection, doc, documentId, getDoc, getDocsFromServer, limit as queryLimit, orderBy, query, startAfter } from 'firebase/firestore'
import {
  createCompatibilityResult,
  FIRESTORE_SOURCE,
  freezeClone,
  isPlainObject,
  LOCAL_PRIVATE_MEDIA_PATTERN,
  toTrimmedString,
} from '../data/adapterUtils.js'

export async function readDocument({ firestore, path, getDocument = getDoc, normalize, missingStatus = 'unavailable' }) {
  if (!firestore) throw new Error('Firestore is not configured for Couple Book.')
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

const DEFAULT_COLLECTION_PAGE_SIZE = 50
const MAX_COLLECTION_PAGES = 20

async function getCollectionInPages(reference, { getCollection, pageSize = DEFAULT_COLLECTION_PAGE_SIZE } = {}) {
  if (getCollection) return getCollection(reference)

  const documents = []
  let lastId = ''
  for (let page = 0; page < MAX_COLLECTION_PAGES; page += 1) {
    const constraints = [orderBy(documentId()), queryLimit(pageSize)]
    if (lastId) constraints.splice(1, 0, startAfter(lastId))
    const snapshot = await getDocsFromServer(query(reference, ...constraints))
    snapshot.forEach((documentSnapshot) => {
      documents.push(documentSnapshot)
      lastId = documentSnapshot.id
    })
    if (snapshot.size < pageSize) break
  }

  return {
    forEach(callback) {
      documents.forEach(callback)
    },
  }
}

export async function readCollection({ firestore, path, getCollection = null, normalizeEntry, emptyStatus = 'empty', pageSize = DEFAULT_COLLECTION_PAGE_SIZE }) {
  if (!firestore) throw new Error('Firestore is not configured for Couple Book.')
  const snapshot = await getCollectionInPages(collection(firestore, ...path), { getCollection, pageSize })
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
  if (LOCAL_PRIVATE_MEDIA_PATTERN.test(text)) return ''
  return text.length <= 240 ? text : ''
}
