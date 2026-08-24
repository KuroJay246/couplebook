import {
  COLLECTIONS,
  FIREBASE_PROJECT_ID,
} from '../../../../packages/firebase-contracts/src/index.js';

const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/;

export function assertSafeId(value: string, label: string) {
  const id = String(value || '').trim();
  if (!SAFE_ID_PATTERN.test(id)) {
    throw new Error(`${label} must be a non-empty safe Firestore document id.`);
  }
  return id;
}

export function userPath(uid: string) {
  return [COLLECTIONS.users, assertSafeId(uid, 'uid')] as const;
}

export function couplePath(coupleId: string) {
  return [COLLECTIONS.couples, assertSafeId(coupleId, 'coupleId')] as const;
}

export function memberPath(coupleId: string, uid: string) {
  return [...couplePath(coupleId), COLLECTIONS.members, assertSafeId(uid, 'uid')] as const;
}

export function profilesPath(coupleId: string) {
  return [...couplePath(coupleId), COLLECTIONS.profiles] as const;
}

export function profilePath(coupleId: string, uid: string) {
  return [...profilesPath(coupleId), assertSafeId(uid, 'uid')] as const;
}

export function favoritesCollectionPath(coupleId: string) {
  return [...couplePath(coupleId), COLLECTIONS.favorites] as const;
}

export function favoritesPath(coupleId: string, uid: string) {
  return [...favoritesCollectionPath(coupleId), assertSafeId(uid, 'uid')] as const;
}

export function sharedSettingsPath(coupleId: string) {
  return [...couplePath(coupleId), COLLECTIONS.settings, 'shared'] as const;
}

export function privateSettingsPath(coupleId: string, uid: string) {
  return [...couplePath(coupleId), COLLECTIONS.settings, assertSafeId(uid, 'uid')] as const;
}

export function memoriesPath(coupleId: string) {
  return [...couplePath(coupleId), COLLECTIONS.memories] as const;
}

export function memoryPath(coupleId: string, memoryId: string) {
  return [...memoriesPath(coupleId), assertSafeId(memoryId, 'memoryId')] as const;
}

export function plansPath(coupleId: string) {
  return [...couplePath(coupleId), COLLECTIONS.plans] as const;
}

export function planPath(coupleId: string, planId: string) {
  return [...plansPath(coupleId), assertSafeId(planId, 'planId')] as const;
}

export function specialMomentPath(coupleId: string, momentKey: string) {
  return [...couplePath(coupleId), COLLECTIONS.specialMoments, assertSafeId(momentKey, 'momentKey')] as const;
}

export function pathToString(parts: readonly string[]) {
  return parts.join('/');
}

export { FIREBASE_PROJECT_ID };
