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
  records: 1,
  mediaMetadata: 1,
  specialMoments: 1,
})

export const MEMORY_TYPES = Object.freeze({
  ordinary: 'ordinary',
  birthday: 'birthday',
  valentine: 'valentine',
  confession: 'confession',
  milestone: 'milestone',
})

export const MEMORY_KIND_LABELS = Object.freeze([
  'Everyday Moment',
  'Date',
  'First',
  'Trip',
  'Milestone',
  'Celebration',
  'Funny Moment',
  'Note',
  'Photo Memory',
  'Video Memory',
])

export const MEMORY_STATUSES = Object.freeze({
  active: 'active',
  archived: 'archived',
})

export const PLAN_STATUSES = Object.freeze({
  idea: 'idea',
  planned: 'planned',
  completed: 'completed',
  archived: 'archived',
})

export const PLAN_CATEGORIES = Object.freeze([
  'Date Idea',
  'Place to Visit',
  'Restaurant',
  'Movie or Show',
  'Goal',
  'Gift or Surprise',
  'Bucket List',
  'Other',
])

export const SETTINGS_DOCUMENT_IDS = Object.freeze({
  shared: 'shared',
})

export const SETTINGS_SCOPES = Object.freeze({
  owner: 'owner',
  couple: 'couple',
})

export const SPECIAL_SECTION_KINDS = Object.freeze(['paragraph', 'note', 'quote', 'list'])
