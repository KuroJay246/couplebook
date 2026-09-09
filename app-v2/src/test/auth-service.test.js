import assert from 'node:assert/strict'
import test from 'node:test'
import { GOOGLE_PROVIDER_ID, getLinkedProviderIds, isGoogleProviderLinked, linkCurrentUserWithGoogle } from '../services/authService.js'

test('Google provider helpers read Firebase providerData without trusting email alone', () => {
  const user = {
    email: 'approved@example.com',
    providerData: [
      { providerId: 'password' },
      { providerId: GOOGLE_PROVIDER_ID },
    ],
  }

  assert.deepEqual(getLinkedProviderIds(user), ['password', GOOGLE_PROVIDER_ID])
  assert.equal(isGoogleProviderLinked(user), true)
  assert.equal(isGoogleProviderLinked({ providerData: [{ providerId: 'password' }] }), false)
})

test('Google linking requires an existing signed-in Firebase user', async () => {
  await assert.rejects(
    linkCurrentUserWithGoogle({
      authInstance: { currentUser: null },
      ensurePersistence: async () => {},
      firebaseConfigured: true,
      linkPopup: async () => {
        throw new Error('link popup should not open')
      },
    }),
    /existing Couple Book account/i,
  )
})

test('Google linking returns early when the approved UID already has Google linked', async () => {
  let popupCalls = 0
  const currentUser = {
    uid: 'approved-uid',
    providerData: [{ providerId: GOOGLE_PROVIDER_ID }],
  }

  const result = await linkCurrentUserWithGoogle({
    authInstance: { currentUser },
    ensurePersistence: async () => {},
    firebaseConfigured: true,
    linkPopup: async () => {
      popupCalls += 1
      throw new Error('link popup should not open')
    },
  })

  assert.equal(result.user, currentUser)
  assert.equal(result.alreadyLinked, true)
  assert.equal(result.providerId, GOOGLE_PROVIDER_ID)
  assert.equal(popupCalls, 0)
})

test('Google linking links the existing UID rather than signing in as a new user', async () => {
  const currentUser = {
    uid: 'approved-uid',
    providerData: [{ providerId: 'password' }],
  }
  let linkedUser = null

  const result = await linkCurrentUserWithGoogle({
    authInstance: { currentUser },
    ensurePersistence: async () => {},
    firebaseConfigured: true,
    linkPopup: async (user, provider) => {
      linkedUser = user
      assert.equal(user.uid, 'approved-uid')
      assert.ok(provider)
      return {
        user: {
          ...user,
          providerData: [...user.providerData, { providerId: GOOGLE_PROVIDER_ID }],
        },
      }
    },
    providerFactory: () => ({ providerId: GOOGLE_PROVIDER_ID }),
  })

  assert.equal(linkedUser, currentUser)
  assert.equal(result.user.uid, 'approved-uid')
  assert.equal(result.alreadyLinked, false)
  assert.equal(isGoogleProviderLinked(result.user), true)
})

test('Google linking rejects a returned Firebase user with a different uid', async () => {
  const currentUser = {
    uid: 'approved-uid',
    providerData: [{ providerId: 'password' }],
  }

  await assert.rejects(
    linkCurrentUserWithGoogle({
      authInstance: { currentUser },
      ensurePersistence: async () => {},
      firebaseConfigured: true,
      linkPopup: async () => ({
        user: {
          uid: 'second-google-uid',
          providerData: [{ providerId: GOOGLE_PROVIDER_ID }],
        },
      }),
      providerFactory: () => ({ providerId: GOOGLE_PROVIDER_ID }),
    }),
    (error) => {
      assert.equal(error.code, 'auth/google-link-uid-mismatch')
      assert.match(error.message, /different Firebase account/i)
      return true
    },
  )
})

test('Google linking times out instead of leaving the app in a pending auth state', async () => {
  const currentUser = {
    uid: 'approved-uid',
    providerData: [{ providerId: 'password' }],
  }

  await assert.rejects(
    linkCurrentUserWithGoogle({
      authInstance: { currentUser },
      ensurePersistence: async () => {},
      firebaseConfigured: true,
      linkPopup: async () => new Promise(() => {}),
      linkTimeoutMs: 5,
      providerFactory: () => ({ providerId: GOOGLE_PROVIDER_ID }),
    }),
    /linking did not finish/i,
  )
})
