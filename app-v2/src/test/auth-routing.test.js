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
import { resolveApprovedUser } from '../services/authorizationService.js'
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

test('authorization uses a targeted users uid lookup only', async () => {
  const calls = []
  const resolution = await resolveApprovedUser(
    { uid: 'uid-123', email: 'approved@example.com' },
    {
      readUserProfileByUid: async (uid) => {
        calls.push(uid)
        return { uid, username: 'Jaylan', profileName: 'Jaylan' }
      },
    },
  )

  assert.equal(buildUserDocumentPath('uid-123'), 'users/uid-123')
  assert.deepEqual(calls, ['uid-123'])
  assert.equal(resolution.status, 'authorized')
  assert.equal(resolution.approvedUser.displayName, 'Jaylan')
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
  assert.equal(sanitizeReturnPath('/timeline'), '/timeline')
  assert.equal(sanitizeReturnPath('/login'), DEFAULT_AUTHENTICATED_PATH)
  assert.equal(sanitizeReturnPath('https://evil.example'), DEFAULT_AUTHENTICATED_PATH)
  assert.equal(sanitizeReturnPath('//evil.example'), DEFAULT_AUTHENTICATED_PATH)
})

test('route source and auth shell source keep the protected migration contract explicit', async () => {
  const routesSource = await readFile(new URL('../app/routes.jsx', import.meta.url), 'utf8')
  const protectedRouteSource = await readFile(new URL('../auth/ProtectedRoute.jsx', import.meta.url), 'utf8')
  const authProviderSource = await readFile(new URL('../auth/AuthProvider.jsx', import.meta.url), 'utf8')
  const authorizationSource = await readFile(new URL('../services/authorizationService.js', import.meta.url), 'utf8')

  assert.match(routesSource, /path=\{DEFAULT_AUTHENTICATED_PATH\}/)
  assert.match(routesSource, /path="\/timeline"/)
  assert.match(routesSource, /path="\/gallery"/)
  assert.match(routesSource, /path="\/profile"/)
  assert.match(routesSource, /path="\/favorites"/)
  assert.match(routesSource, /path="\/settings"/)
  assert.match(routesSource, /path="\/contract"/)
  assert.match(routesSource, /path="\/birthday"/)
  assert.match(routesSource, /path="\/valentine"/)
  assert.match(routesSource, /path="\/confession"/)
  assert.match(routesSource, /path="\*"/)
  assert.match(routesSource, /<ProtectedRoute \/>/)
  assert.match(routesSource, /<AppShell \/>/)
  assert.equal(protectedRouteMeta.length, 10)
  assert.match(protectedRouteSource, /AuthorizationGate/)
  assert.doesNotMatch(protectedRouteSource, /localStorage/)
  assert.doesNotMatch(authProviderSource, /localStorage/)
  assert.doesNotMatch(authorizationSource, /collection\(/)
  assert.doesNotMatch(authorizationSource, /getDocs\(/)
})
