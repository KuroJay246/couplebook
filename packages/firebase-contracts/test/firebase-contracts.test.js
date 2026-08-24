import test from 'node:test'
import assert from 'node:assert/strict'

import {
  APPROVED_USER_ACCESS_STATES,
  COLLECTIONS,
  FIREBASE_PROJECT_ID,
  MEMORY_STATUSES,
  MEMORY_TYPES,
  MEMBER_ROLES,
  PLAN_CATEGORIES,
  PLAN_STATUSES,
  SCHEMA_VERSIONS,
  SETTINGS_DOCUMENT_IDS,
  SETTINGS_SCOPES,
  SPECIAL_SECTION_KINDS,
} from '../src/index.js'

test('firebase contracts stay scoped to the Couple Book project and core collections', () => {
  assert.equal(FIREBASE_PROJECT_ID, 'couplebook-97830')
  assert.equal(COLLECTIONS.members, 'members')
  assert.equal(COLLECTIONS.specialMoments, 'specialMoments')
  assert.equal(APPROVED_USER_ACCESS_STATES.active, 'active')
  assert.equal(MEMBER_ROLES.member, 'member')
  assert.equal(SCHEMA_VERSIONS.specialMoments, 1)
  assert.equal(SCHEMA_VERSIONS.records, 1)
  assert.equal(MEMORY_TYPES.milestone, 'milestone')
  assert.equal(MEMORY_STATUSES.archived, 'archived')
  assert.equal(PLAN_STATUSES.completed, 'completed')
  assert.ok(PLAN_CATEGORIES.includes('Restaurant'))
  assert.equal(SETTINGS_DOCUMENT_IDS.shared, 'shared')
  assert.equal(SETTINGS_SCOPES.owner, 'owner')
  assert.ok(SPECIAL_SECTION_KINDS.includes('quote'))
})
