export const FIREBASE_PROJECT_ID = 'couplebook-97830'

export const COLLECTIONS = Object.freeze({
  users: 'users',
  couples: 'couples',
  members: 'members',
  memories: 'memories',
  plans: 'plans',
  profiles: 'profiles',
  favorites: 'favorites',
  settings: 'settings',
  specialMoments: 'specialMoments',
})

export const APPROVED_USER_ACCESS_STATES = Object.freeze({
  active: 'active',
  pending: 'pending',
  inactive: 'inactive',
  removed: 'removed',
})

export const MEMBER_ROLES = Object.freeze({
  member: 'member',
})

export const SCHEMA_VERSIONS = Object.freeze({
  accessModel: 1,
  mediaMetadata: 1,
  specialMoments: 1,
})
