import test from 'node:test'
import assert from 'node:assert/strict'

import { COLLECTIONS, FIREBASE_PROJECT_ID, SCHEMA_VERSIONS } from '../src/index.js'

test('firebase contracts stay scoped to the Couple Book project and core collections', () => {
  assert.equal(FIREBASE_PROJECT_ID, 'couplebook-97830')
  assert.equal(COLLECTIONS.specialMoments, 'specialMoments')
  assert.equal(SCHEMA_VERSIONS.specialMoments, 1)
})
