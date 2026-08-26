import test from 'node:test'
import assert from 'node:assert/strict'
import { toAuthError, toUserFacingError } from '../services/userFacingError.js'

test('raw Firebase permission errors are never returned to owner-facing UI', () => {
  const error = new Error('Missing or insufficient permissions.')
  assert.equal(toUserFacingError(error, 'fallback'), 'Your access to this Couple Book could not be confirmed. Try again.')
  assert.equal(toAuthError(error), 'This account is not connected to this Couple Book.')
  assert.doesNotMatch(toUserFacingError(error), /Missing or insufficient permissions/i)
})

test('technical network errors become calm retry guidance', () => {
  assert.equal(toUserFacingError(new Error('Failed to fetch from Firestore'), 'fallback'), 'We could not load this right now. Try again.')
})
