import test from 'node:test'
import assert from 'node:assert/strict'

import { DRIVE_CONNECTION_STATES, DRIVE_USER_MESSAGE } from '../src/index.js'

test('drive contracts expose the approved connection states and owner-safe copy', () => {
  assert.equal(DRIVE_CONNECTION_STATES.includes('connected'), true)
  assert.equal(DRIVE_CONNECTION_STATES.includes('permission-insufficient'), true)
  assert.match(DRIVE_USER_MESSAGE, /Google Drive is not available/i)
})
