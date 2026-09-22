import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  DEFAULT_AUTHENTICATED_PATH,
  LOGIN_PATH,
  protectedRouteMeta,
  resolveProtectedRouteOutcome,
} from '../app/routeConfig.js'
import { formatMissingFirebaseConfigMessage } from '../lib/firebaseConfig.js'
import { shouldPreserveLastAuthorizedState } from '../auth/authorizationCache.js'
import { resolveApprovedUser } from '../services/authorizationService.js'
import { buildMemberDocumentPath } from '../services/coupleService.js'
import { buildUserDocumentPath } from '../services/userService.js'
import { getRequestedReturnPath, sanitizeReturnPath } from '../utils/navigation.js'

test('signed-out protected routes redirect to login', () => {
  for (const route of ['/dashboard', '/contract', '/birthday', '/valentine', '/confession']) {
    const outcome = resolveProtectedRouteOutcome({
      pathname: route,
      isLoading: false,
      user: null,
      isAuthorized: false,
    })

    assert.equal(outcome.type, 'redirect')
    assert.equal(outcome.to, LOGIN_PATH)
  }
})

test('auth loading state does not redirect before Firebase resolves', () => {
  const outcome = resolveProtectedRouteOutcome({
    pathname: '/dashboard',
    isLoading: true,
    user: null,
    isAuthorized: false,
  })

  assert.equal(outcome.type, 'loading')
  assert.equal(outcome.path, '/dashboard')
})

test('approved authenticated access stays on the requested protected route', () => {
  const outcome = resolveProtectedRouteOutcome({
    pathname: '/settings',
    isLoading: false,
    user: { uid: 'approved' },
    isAuthorized: true,
  })

  assert.equal(outcome.type, 'allow')
  assert.equal(outcome.path, '/settings')
})

test('unknown app routes stay protected and resolve back into the shell', () => {
  const signedOut = resolveProtectedRouteOutcome({
    pathname: '/unknown-readiness-route',
    isLoading: false,
    user: null,
    isAuthorized: false,
  })
  const approved = resolveProtectedRouteOutcome({
    pathname: '/unknown-readiness-route',
    isLoading: false,
    user: { uid: 'approved' },
    isAuthorized: true,
  })

  assert.equal(signedOut.type, 'redirect')
  assert.equal(signedOut.to, LOGIN_PATH)
  assert.equal(signedOut.path, '/unknown-readiness-route')
  assert.equal(approved.type, 'allow')
  assert.equal(approved.path, DEFAULT_AUTHENTICATED_PATH)
})

test('unauthorized authenticated access returns a blocked state', () => {
  const outcome = resolveProtectedRouteOutcome({
    pathname: '/gallery',
    isLoading: false,
    user: { uid: 'not-approved' },
    isAuthorized: false,
  })

  assert.equal(outcome.type, 'blocked')
  assert.equal(outcome.path, '/gallery')
})

test('direct reload keeps the intended protected destination after auth restoration', () => {
  const requested = getRequestedReturnPath({
    from: { pathname: '/favorites', search: '?tab=shared', hash: '#recent' },
  })

  assert.equal(requested, '/favorites?tab=shared#recent')

  const pending = resolveProtectedRouteOutcome({
    pathname: '/favorites',
    isLoading: true,
    user: null,
    isAuthorized: false,
  })
  const resolved = resolveProtectedRouteOutcome({
    pathname: '/favorites',
    isLoading: false,
    user: { uid: 'approved' },
    isAuthorized: true,
  })

  assert.equal(pending.type, 'loading')
  assert.equal(resolved.type, 'allow')
  assert.equal(resolved.path, '/favorites')
})

test('owner-facing route aliases resolve to canonical protected pages while Story stays retired', () => {
  const us = resolveProtectedRouteOutcome({
    pathname: '/us',
    isLoading: false,
    user: { uid: 'approved' },
    isAuthorized: true,
  })

  const story = resolveProtectedRouteOutcome({
    pathname: '/story',
    isLoading: false,
    user: { uid: 'approved' },
    isAuthorized: true,
  })

  assert.equal(story.type, 'allow')
  assert.equal(story.path, DEFAULT_AUTHENTICATED_PATH)
  assert.equal(us.type, 'allow')
  assert.equal(us.path, '/profile')
})

test('authorization uses a targeted users uid lookup only', async () => {
  const userCalls = []
  const membershipCalls = []
  const resolution = await resolveApprovedUser(
    { uid: 'uid-123', email: 'approved@example.com' },
    {
      readUserProfileByUid: async (uid) => {
        userCalls.push(uid)
        return { uid, approved: true, accessStatus: 'active', username: 'Jaylan', profileName: 'Jaylan', coupleId: 'couple-alpha' }
      },
      readCoupleMembership: async (coupleId, uid) => {
        membershipCalls.push(`${coupleId}/${uid}`)
        return { status: 'ready', data: { uid, active: true, role: 'member', schemaVersion: 1 } }
      },
    },
  )

  assert.equal(buildUserDocumentPath('uid-123'), 'users/uid-123')
  assert.equal(buildMemberDocumentPath('couple-alpha', 'uid-123'), 'couples/couple-alpha/members/uid-123')
  assert.deepEqual(userCalls, ['uid-123'])
  assert.deepEqual(membershipCalls, ['couple-alpha/uid-123'])
  assert.equal(resolution.status, 'authorized')
  assert.equal(resolution.approvedUser.displayName, 'Jaylan')
  assert.equal(resolution.approvedUser.memberRole, 'member')
})

test('pending approved accounts receive the safe unopened-book status', async () => {
  const resolution = await resolveApprovedUser(
    { uid: 'pending-uid', email: 'pending@example.com' },
    {
      readUserProfileByUid: async (uid) => ({
        uid,
        approved: true,
        accessStatus: 'pending',
        coupleId: 'couple-alpha',
      }),
    },
  )

  assert.equal(resolution.status, 'pending')
  assert.equal(resolution.approvedUser, null)
})

test('approved users without active couple membership remain blocked', async () => {
  const resolution = await resolveApprovedUser(
    { uid: 'missing-member', email: 'approved@example.com' },
    {
      readUserProfileByUid: async (uid) => ({
        uid,
        approved: true,
        accessStatus: 'active',
        coupleId: 'couple-alpha',
        username: 'Jaylan',
      }),
      readCoupleMembership: async () => ({
        status: 'unavailable',
        data: null,
      }),
    },
  )

  assert.equal(resolution.status, 'pending')
  assert.equal(resolution.approvedUser, null)
})

test('disabled approved accounts remain blocked by authorization resolution', async () => {
  const resolution = await resolveApprovedUser(
    { uid: 'disabled-member', email: 'disabled@example.com' },
    {
      readUserProfileByUid: async (uid) => ({
        uid,
        approved: true,
        accessStatus: 'disabled',
        coupleId: 'couple-alpha',
        username: 'Disabled',
      }),
      readCoupleMembership: async () => ({
        status: 'ready',
        data: { active: true, role: 'member', schemaVersion: 1 },
      }),
    },
  )

  assert.equal(resolution.status, 'pending')
  assert.equal(resolution.approvedUser, null)
})

test('removed couple membership remains blocked by authorization resolution', async () => {
  const resolution = await resolveApprovedUser(
    { uid: 'removed-member', email: 'removed@example.com' },
    {
      readUserProfileByUid: async (uid) => ({
        uid,
        approved: true,
        accessStatus: 'active',
        coupleId: 'couple-alpha',
        username: 'Removed',
      }),
      readCoupleMembership: async () => null,
    },
  )

  assert.equal(resolution.status, 'pending')
  assert.equal(resolution.approvedUser, null)
})

test('cached authorization fallback is limited to transient same-uid verification failures', () => {
  const lastAuthorizedState = {
    user: { uid: 'uid-123' },
    approvedUser: { uid: 'uid-123', coupleId: 'couple-alpha' },
    isAuthorized: true,
  }

  assert.equal(
    shouldPreserveLastAuthorizedState({
      error: Object.assign(new Error('Firestore network timeout'), { code: 'unavailable' }),
      lastAuthorizedState,
      nextUser: { uid: 'uid-123' },
    }),
    true,
  )

  assert.equal(
    shouldPreserveLastAuthorizedState({
      error: Object.assign(new Error('Firestore network timeout'), { code: 'unavailable' }),
      lastAuthorizedState,
      nextUser: { uid: 'different-uid' },
    }),
    false,
  )

  assert.equal(
    shouldPreserveLastAuthorizedState({
      error: Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }),
      lastAuthorizedState,
      nextUser: { uid: 'uid-123' },
    }),
    false,
  )

  assert.equal(
    shouldPreserveLastAuthorizedState({
      error: Object.assign(new Error('Firebase ID token expired.'), { code: 'auth/id-token-expired' }),
      lastAuthorizedState,
      nextUser: { uid: 'uid-123' },
    }),
    false,
  )

  assert.equal(
    shouldPreserveLastAuthorizedState({
      error: Object.assign(new Error('User must sign in again.'), { code: 'unauthenticated' }),
      lastAuthorizedState: null,
      nextUser: null,
    }),
    false,
  )
})

test('local session-like values do not unlock protected routes independently', () => {
  const outcome = resolveProtectedRouteOutcome({
    pathname: '/contract',
    isLoading: false,
    user: null,
    isAuthorized: false,
    localSessionUser: 'Jaylan',
  })

  assert.equal(outcome.type, 'redirect')
  assert.equal(outcome.to, LOGIN_PATH)
})

test('missing Firebase configuration fails clearly and safely', () => {
  const message = formatMissingFirebaseConfigMessage(['apiKey', 'projectId'])

  assert.match(message, /apiKey/)
  assert.match(message, /projectId/)
})

test('return-path sanitization rejects login and external redirects', () => {
  assert.equal(sanitizeReturnPath('/gallery'), '/gallery')
  assert.equal(sanitizeReturnPath('/login'), DEFAULT_AUTHENTICATED_PATH)
  assert.equal(sanitizeReturnPath('https://evil.example'), DEFAULT_AUTHENTICATED_PATH)
  assert.equal(sanitizeReturnPath('//evil.example'), DEFAULT_AUTHENTICATED_PATH)
})

test('route source and auth shell source keep the protected migration contract explicit', async () => {
  const routesSource = await readFile(new URL('../app/routes.jsx', import.meta.url), 'utf8')
  const protectedRouteSource = await readFile(new URL('../auth/ProtectedRoute.jsx', import.meta.url), 'utf8')
  const authProviderSource = await readFile(new URL('../auth/AuthProvider.jsx', import.meta.url), 'utf8')
  const authorizationSource = await readFile(new URL('../services/authorizationService.js', import.meta.url), 'utf8')
  const loginSource = await readFile(new URL('../pages/LoginPage.jsx', import.meta.url), 'utf8')
  const authServiceSource = await readFile(new URL('../services/authService.js', import.meta.url), 'utf8')

  assert.match(routesSource, /path=\{DEFAULT_AUTHENTICATED_PATH\}/)
  assert.doesNotMatch(routesSource, /path="\/timeline"|path="\/story"|TimelinePage/)
  assert.match(routesSource, /path="\/gallery"/)
  assert.match(routesSource, /path="\/update"/)
  assert.match(routesSource, /path="\/us"/)
  assert.match(routesSource, /to="\/profile"/)
  assert.match(routesSource, /path="\/profile"/)
  assert.match(routesSource, /path="\/favorites"/)
  assert.match(routesSource, /path="\/plans"/)
  assert.match(routesSource, /path="\/settings"/)
  assert.match(routesSource, /path="\/contract"/)
  assert.match(routesSource, /path="\/birthday"/)
  assert.match(routesSource, /path="\/valentine"/)
  assert.match(routesSource, /path="\/confession"/)
  assert.match(routesSource, /path="\*"/)
  assert.match(routesSource, /<ProtectedRoute \/>/)
  assert.match(routesSource, /<AppShell \/>/)
  assert.equal(protectedRouteMeta.length, 11)
  assert.match(protectedRouteSource, /AuthorizationGate/)
  assert.doesNotMatch(protectedRouteSource, /localStorage/)
  assert.doesNotMatch(authProviderSource, /localStorage/)
  assert.doesNotMatch(authorizationSource, /collection\(/)
  assert.doesNotMatch(authorizationSource, /getDocs\(/)
  assert.match(loginSource, /Continue with Google/)
  assert.match(loginSource, /Other sign-in options/)
  assert.match(loginSource, /Sign in with email/)
  assert.match(loginSource, /Checking your saved sign-in and private access/)
  assert.doesNotMatch(loginSource, /Sign in with your Couple Book email/)
  assert.doesNotMatch(loginSource, /Checking Firebase auth|route-guarded|static bypass|Theme-aware shell/)
  assert.equal(loginSource.indexOf('Continue with Google') < loginSource.indexOf('Other sign-in options'), true)
  assert.match(authProviderSource, /signInWithGoogleProvider\(\)/)
  assert.match(authProviderSource, /resolveApprovedUser\(result\.user\)/)
  assert.match(authProviderSource, /lastAuthorizedStateRef/)
  assert.match(authProviderSource, /shouldPreserveLastAuthorizedState/)
  assert.match(authProviderSource, /lastAuthorizedStateRef\.current = null/)
  assert.match(authServiceSource, /signInWithPopup/)
  assert.match(authServiceSource, /linkWithPopup/)
  assert.doesNotMatch(authServiceSource, /https:\/\/www\.googleapis\.com\/auth\/drive/)
})
