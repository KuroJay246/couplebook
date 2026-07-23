import { db } from '../lib/firebaseClient.js'
import { couplePath, memberPath, pathToString } from './firestorePaths.js'
import { readDocument, requireSchemaVersion, safeString } from './firestoreReaders.js'

export function buildCoupleDocumentPath(coupleId) {
  return pathToString(couplePath(coupleId))
}

export function buildMemberDocumentPath(coupleId, uid) {
  return pathToString(memberPath(coupleId, uid))
}

export function normalizeCoupleDocument(id, data, warnings) {
  if (!requireSchemaVersion(data, warnings)) return null
  return {
    coupleId: id,
    title: safeString(data.title, 120),
    migrationVersion: Number.isInteger(data.migrationVersion) ? data.migrationVersion : 0,
    schemaVersion: data.schemaVersion,
  }
}

export function normalizeMemberDocument(uid, data, warnings) {
  if (!requireSchemaVersion(data, warnings)) return null
  if (data.active !== true || data.role !== 'member') {
    warnings.push('Couple membership is not active.')
    return null
  }
  return {
    uid,
    active: true,
    role: 'member',
    schemaVersion: data.schemaVersion,
  }
}

export async function getCoupleDocumentSnapshot(coupleId, options = {}) {
  return readDocument({
    firestore: options.firestore || db,
    path: couplePath(coupleId),
    getDocument: options.getDocument,
    normalize: normalizeCoupleDocument,
  })
}

export async function getCoupleMembership(coupleId, uid, options = {}) {
  return readDocument({
    firestore: options.firestore || db,
    path: memberPath(coupleId, uid),
    getDocument: options.getDocument,
    normalize: normalizeMemberDocument,
  })
}
