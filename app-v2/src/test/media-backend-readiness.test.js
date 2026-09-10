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
    firebaseProject: { ok: true, errors: [] },
    rulesDrift: drift,
  })
  const serialized = JSON.stringify(report)

  assert.equal(report.status, 'blocked')
  assert.equal(report.rules.missingMediaCoverage, true)
  assert.ok(report.blockers.some((blocker) => /Deployed Firestore rules/.test(blocker)))
  assert.ok(report.blockers.some((blocker) => /Trusted Drive backend endpoints/.test(blocker)))
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
  assert.match(report.backend.costBoundary, /Do not deploy trusted Drive backend hosting/)
})
