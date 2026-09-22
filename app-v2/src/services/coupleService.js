import { db } from '../lib/firebase.js'
import { couplePath, memberPath, pathToString } from './firestorePaths.js'
import { readDocument, requireSchemaVersion, safeString } from './firestoreReaders.js'

export const ACTIVE_COUPLE_MEMBER_ROLES = Object.freeze(['member', 'owner', 'partner'])

export function isActiveCoupleMemberRole(role) {
  return ACTIVE_COUPLE_MEMBER_ROLES.includes(role)
}

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
  const role = safeString(data.role, 40)
  if (data.active !== true || !isActiveCoupleMemberRole(role)) {
    warnings.push('Couple membership is not active.')
    return null
  }
  return {
    uid,
    active: true,
    role,
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
