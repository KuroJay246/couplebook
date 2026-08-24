import test from 'node:test'
import assert from 'node:assert/strict'

import {
  APPROVED_USER_ACCESS_STATES,
  COLLECTIONS,
  FIREBASE_PROJECT_ID,
  MEMBER_ROLES,
  SCHEMA_VERSIONS,
} from '../src/index.js'

test('firebase contracts stay scoped to the Couple Book project and core collections', () => {
  assert.equal(FIREBASE_PROJECT_ID, 'couplebook-97830')
  assert.equal(COLLECTIONS.members, 'members')
  assert.equal(COLLECTIONS.specialMoments, 'specialMoments')
  assert.equal(APPROVED_USER_ACCESS_STATES.active, 'active')
  assert.equal(MEMBER_ROLES.member, 'member')
  assert.equal(SCHEMA_VERSIONS.specialMoments, 1)
})
