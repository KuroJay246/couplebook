import { readLegacySpecialMoment } from '../data/legacySpecialMomentAdapter.js'
import { FIRESTORE_SOURCE } from '../data/adapterUtils.js'
import { normalizeSpecialMomentPayload } from '../data/legacySpecialMomentAdapter.js'
import { db } from '../lib/firebaseClient.js'
import { specialMomentPath } from './firestorePaths.js'
import { readDocument, requireSchemaVersion } from './firestoreReaders.js'

export async function getLegacySpecialMoment(momentKey, options = {}) {
  const read = options.readLegacySpecialMoment || readLegacySpecialMoment
  return read(momentKey, options)
}

export function normalizeFirestoreSpecialMoment(momentKey, data, warnings) {
  if (!requireSchemaVersion(data, warnings)) return null
  const normalized = normalizeSpecialMomentPayload(momentKey, {
    moment: {
      type: momentKey,
      title: data.title,
      subtitle: data.subtitle,
      date: data.date,
      sections: data.sections,
    },
    media: data.media,
  })
  warnings.push(...normalized.warnings)
  if (normalized.status === 'invalid') return null
  return {
    ...normalized.data,
    sourceStatus: {
      ...(normalized.data?.sourceStatus || {}),
      source: FIRESTORE_SOURCE,
      runtimeOnly: false,
    },
    privacy: {
      runtimeOnly: false,
      privateContentBundled: false,
    },
  }
}

export async function getFirestoreSpecialMoment(coupleId, momentKey, options = {}) {
  return readDocument({
    firestore: options.firestore || db,
    path: specialMomentPath(coupleId, momentKey),
    getDocument: options.getDocument,
    normalize: (id, data, warnings) => normalizeFirestoreSpecialMoment(id, data, warnings),
  })
}
