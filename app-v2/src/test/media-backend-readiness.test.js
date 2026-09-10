import test from 'node:test'
import assert from 'node:assert/strict'

import {
  evaluateMediaBackendReadiness,
  summarizeRulesDrift,
} from '../../../scripts/check-media-backend-readiness.mjs'

test('media backend readiness reports stale deployed media-index rules without leaking env values', () => {
  const drift = summarizeRulesDrift(`
Firestore rules drift check for couplebook-97830
Release: projects/couplebook-97830/releases/cloud.firestore
Ruleset: projects/couplebook-97830/rulesets/ruleset-one
Ruleset created: 2026-08-14T00:33:00.492127Z
Local/deployed exact match: no
Deployed Firestore rules are missing required media-index coverage:
- mediaItems collection path
Owner approval is required before deploying updated Firestore rules.
`)

  const report = evaluateMediaBackendReadiness({
    appEnv: {
      VITE_FIREBASE_API_KEY: 'redacted',
      VITE_FIREBASE_AUTH_DOMAIN: 'couplebook-97830.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'couplebook-97830',
      VITE_FIREBASE_STORAGE_BUCKET: 'couplebook-97830.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: 'redacted',
      VITE_FIREBASE_APP_ID: 'redacted',
      VITE_GOOGLE_CLIENT_ID: 'redacted',
    },
    backendCapabilitiesImplemented: [
      'firebase-id-token-validation',
      'active-couple-membership-validation',
      'oauth-state-binding',
      'oauth-code-exchange-boundary',
      'indexed-media-authorization',
      'sync-reconciliation-planning',
      'sync-now-handler',
      'media-upload-finalization',
      'exact-duplicate-preflight',
      'orphan-recovery-recording',
      'media-removal-tombstone',
      'drive-original-delete-confirmation',
      'drive-change-cursor-planning',
      'drive-webhook-handler',
      'drive-watch-renewal',
      'drive-disconnect-cleanup',
      'privacy-minimal-audit-events',
      'credential-field-rejection',
    ],
    backendEndpointsImplemented: [
      '/api/drive/oauth/begin',
      '/api/drive/oauth/callback',
      '/api/drive/disconnect',
      '/api/drive/sync',
      '/api/drive/media/upload',
      '/api/drive/media/:mediaId',
      '/api/drive/webhook',
      '/api/drive/media/:mediaId/thumbnail',
      '/api/drive/media/:mediaId/stream',
    ],
    firebaseProject: { ok: true, errors: [] },
    rulesDrift: drift,
  })
  const serialized = JSON.stringify(report)

  assert.equal(report.status, 'blocked')
  assert.equal(report.rules.missingMediaCoverage, true)
  assert.ok(report.blockers.some((blocker) => /Deployed Firestore rules/.test(blocker)))
  assert.equal(report.backend.missingEndpoints.length, 0)
  assert.equal(report.backend.missingCapabilities.length, 0)
  assert.doesNotMatch(serialized, /redacted/)
})

test('media backend readiness stays blocked until trusted Drive endpoints exist', () => {
  const report = evaluateMediaBackendReadiness({
    appEnv: {
      VITE_FIREBASE_API_KEY: 'set',
      VITE_FIREBASE_AUTH_DOMAIN: 'couplebook-97830.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'couplebook-97830',
      VITE_FIREBASE_STORAGE_BUCKET: 'couplebook-97830.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: 'set',
      VITE_FIREBASE_APP_ID: 'set',
      VITE_GOOGLE_CLIENT_ID: 'set',
    },
    backendEndpointsImplemented: ['/api/drive/oauth/begin'],
    firebaseProject: { ok: true, errors: [] },
    rulesDrift: { exactMatch: true, missingMediaCoverage: false },
  })

  assert.equal(report.status, 'blocked')
  assert.equal(report.env.missingKeys.length, 0)
  assert.ok(report.backend.missingEndpoints.includes('/api/drive/media/upload'))
  assert.ok(report.backend.missingCapabilities.includes('drive-webhook-handler'))
  assert.match(report.backend.costBoundary, /Do not deploy trusted Drive backend hosting/)
})

test('media backend readiness reports local handler capabilities separately from deployment approval', () => {
  const capabilities = [
    'firebase-id-token-validation',
    'active-couple-membership-validation',
    'oauth-state-binding',
    'oauth-code-exchange-boundary',
    'indexed-media-authorization',
    'sync-reconciliation-planning',
    'sync-now-handler',
    'media-upload-finalization',
    'exact-duplicate-preflight',
    'orphan-recovery-recording',
    'media-removal-tombstone',
    'drive-original-delete-confirmation',
    'drive-change-cursor-planning',
    'drive-webhook-handler',
    'drive-watch-renewal',
    'drive-disconnect-cleanup',
    'privacy-minimal-audit-events',
    'credential-field-rejection',
  ]
  const endpoints = [
    '/api/drive/oauth/begin',
    '/api/drive/oauth/callback',
    '/api/drive/disconnect',
    '/api/drive/sync',
    '/api/drive/media/upload',
    '/api/drive/media/:mediaId',
    '/api/drive/webhook',
    '/api/drive/media/:mediaId/thumbnail',
    '/api/drive/media/:mediaId/stream',
  ]
  const report = evaluateMediaBackendReadiness({
    appEnv: {
      VITE_FIREBASE_API_KEY: 'set',
      VITE_FIREBASE_AUTH_DOMAIN: 'couplebook-97830.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'couplebook-97830',
      VITE_FIREBASE_STORAGE_BUCKET: 'couplebook-97830.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: 'set',
      VITE_FIREBASE_APP_ID: 'set',
      VITE_GOOGLE_CLIENT_ID: 'set',
    },
    backendCapabilitiesImplemented: capabilities,
    backendEndpointsImplemented: endpoints,
    firebaseProject: { ok: true, errors: [] },
    rulesDrift: { exactMatch: true, missingMediaCoverage: false },
  })

  assert.equal(report.status, 'blocked')
  assert.equal(report.backend.missingCapabilities.length, 0)
  assert.equal(report.backend.missingEndpoints.length, 0)
  assert.ok(report.blockers.some((blocker) => /approved trusted backend deployment plan/.test(blocker)))
})
