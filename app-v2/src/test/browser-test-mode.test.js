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
    sessionStorage: {
      getItem() {
        return null
      },
    },
  }
}

function createWindowLikeWithStoredFixture(hostname, browserTestMode) {
  return {
    location: { hostname },
    sessionStorage: {
      getItem(key) {
        if (key !== '__COUPLEBOOK_BROWSER_TEST__') return null
        return JSON.stringify(browserTestMode)
      },
    },
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

test('browser regression fixture can also come from localhost session storage', () => {
  const authState = getBrowserTestAuthState(createWindowLikeWithStoredFixture('localhost', browserRegressionAuthorizedFixture))
  const compatibilityState = getBrowserTestCompatibilityState(createWindowLikeWithStoredFixture('localhost', browserRegressionAuthorizedFixture))

  assert.equal(authState.mode, 'authorized')
  assert.equal(compatibilityState.state, 'ready')
})

test('browser regression auth-only fixture does not force a compatibility snapshot', () => {
  const compatibilityState = getBrowserTestCompatibilityState(createWindowLike('127.0.0.1', {
    enabled: true,
    auth: browserRegressionAuthorizedFixture.auth,
  }))

  assert.equal(compatibilityState, null)
})

test('browser regression auth fixture preserves optional approved-user write fields', () => {
  const authState = getBrowserTestAuthState(createWindowLike('127.0.0.1', {
    enabled: true,
    auth: {
      status: 'authorized',
      user: {
        uid: 'member_one',
        email: 'member-one@example.com',
        displayName: 'Member One',
      },
      approvedUser: {
        uid: 'member_one',
        coupleId: 'couple_alpha',
        username: 'Member One',
        displayName: 'Member One',
      },
    },
  }))

  assert.equal(authState.approvedUser.uid, 'member_one')
  assert.equal(authState.approvedUser.coupleId, 'couple_alpha')
  assert.equal(authState.approvedUser.raw.coupleId, 'couple_alpha')
})
