import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getBrowserTestAuthState,
  getBrowserTestCompatibilityState,
  getBrowserTestMode,
} from '../lib/browserTestMode.js'
import {
  browserRegressionAuthorizedFixture,
  browserRegressionSignedOutFixture,
} from '../test-fixtures/browser-regression.fixture.js'

function createWindowLike(hostname, browserTestMode) {
  return {
    location: { hostname },
    __COUPLEBOOK_BROWSER_TEST__: browserTestMode,
  }
}

test('browser regression test mode stays disabled away from localhost', () => {
  const mode = getBrowserTestMode(createWindowLike('couplebook.web.app', browserRegressionAuthorizedFixture))
  assert.equal(mode, null)
})

test('browser regression auth fixture resolves to an approved local-only session', () => {
  const authState = getBrowserTestAuthState(createWindowLike('127.0.0.1', browserRegressionAuthorizedFixture))

  assert.equal(authState.mode, 'authorized')
  assert.equal(authState.isAuthorized, true)
  assert.equal(authState.user.email, 'approved-reader@example.com')
  assert.equal(authState.approvedUser.username, 'Reader')
  assert.equal(Object.isFrozen(authState), true)
})

test('browser regression signed-out fixture stays configured without restoring auth', () => {
  const authState = getBrowserTestAuthState(createWindowLike('localhost', browserRegressionSignedOutFixture))

  assert.equal(authState.mode, 'signed-out')
  assert.equal(authState.user, null)
  assert.equal(authState.approvedUser, null)
  assert.equal(authState.isAuthorized, false)
  assert.equal(authState.authError, '')
})

test('browser regression compatibility fixture remains local-only and frozen', () => {
  const compatibilityState = getBrowserTestCompatibilityState(createWindowLike('127.0.0.1', browserRegressionAuthorizedFixture))

  assert.equal(compatibilityState.state, 'ready')
  assert.equal(compatibilityState.snapshot.sources.settings.data.theme, 'sunset')
  assert.equal(compatibilityState.snapshot.sources.contract.status, 'ready')
  assert.equal(compatibilityState.snapshot.sources.contract.data.activeSignature.hasLegacyPayload, true)
  assert.equal(Object.isFrozen(compatibilityState.snapshot), true)
})
