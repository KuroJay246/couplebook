import assert from 'node:assert/strict'
import test from 'node:test'

import { validateFirebaseProject, REQUIRED_PROJECT_ID, PROHIBITED_PROJECT_ID } from './assert-firebase-project.mjs'

const validOptions = Object.freeze({
  expectedProjectId: REQUIRED_PROJECT_ID,
  commandProjectId: REQUIRED_PROJECT_ID,
  deploymentProjectId: REQUIRED_PROJECT_ID,
  migrationProjectId: REQUIRED_PROJECT_ID,
  firebaserc: { projects: { default: REQUIRED_PROJECT_ID } },
  firebaseJsonText: JSON.stringify({ hosting: { public: 'public' } }),
  firebaseAppV2JsonText: JSON.stringify({ firestore: { rules: 'firestore.app-v2.rules' } }),
  appEnv: {
    VITE_FIREBASE_PROJECT_ID: REQUIRED_PROJECT_ID,
    VITE_FIREBASE_AUTH_DOMAIN: `${REQUIRED_PROJECT_ID}.firebaseapp.com`,
    VITE_FIREBASE_STORAGE_BUCKET: `${REQUIRED_PROJECT_ID}.appspot.com`,
  },
})

test('correct project is accepted', () => {
  assert.equal(validateFirebaseProject(validOptions).ok, true)
})

test('missing project is rejected', () => {
  const result = validateFirebaseProject({ ...validOptions, commandProjectId: '' })
  assert.equal(result.ok, false)
  assert.match(result.errors.join('\n'), /explicit command project is missing/)
})

test('incorrect project is rejected', () => {
  const result = validateFirebaseProject({ ...validOptions, commandProjectId: 'wrong-project-123' })
  assert.equal(result.ok, false)
  assert.match(result.errors.join('\n'), /explicit command project must be/)
})

test('prohibited Gather project is rejected', () => {
  const result = validateFirebaseProject({ ...validOptions, commandProjectId: PROHIBITED_PROJECT_ID })
  assert.equal(result.ok, false)
  assert.match(result.errors.join('\n'), /prohibited project/)
})

test('malformed project is rejected', () => {
  const result = validateFirebaseProject({ ...validOptions, commandProjectId: 'Bad_Project!' })
  assert.equal(result.ok, false)
  assert.match(result.errors.join('\n'), /malformed/)
})
