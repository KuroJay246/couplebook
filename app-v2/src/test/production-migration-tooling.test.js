import assert from 'node:assert/strict'
import test from 'node:test'

import { createMigrationPackage, validateMigrationPackage } from '../../scripts/lib/migration-package.mjs'
import { planMigrationOperations, verifyMigrationDocuments } from '../../scripts/lib/migration-engine.mjs'
import { assertProjectArg, REQUIRED_PROJECT_ID } from '../../scripts/lib/project-guard.mjs'

const TEST_APPROVED_UIDS = Object.freeze(['fictional_owner_uid', 'fictional_partner_uid'])

test('production project guard rejects missing and prohibited project targets', () => {
  assert.equal(assertProjectArg(['--project', REQUIRED_PROJECT_ID]), REQUIRED_PROJECT_ID)
  assert.throws(() => assertProjectArg([]), /project guard/i)
  assert.throws(() => assertProjectArg(['--project', 'gathervibeshub']), /prohibited/i)
})

test('migration package validates counts and excludes raw private paths', () => {
  const migrationPackage = createMigrationPackage({ approvedUids: TEST_APPROVED_UIDS, generatedAt: '2026-07-21T00:00:00.000Z' })
  const validation = validateMigrationPackage(migrationPackage)
  const serialized = JSON.stringify(migrationPackage)

  assert.equal(validation.ok, true)
  assert.equal(migrationPackage.counts.users, 2)
  assert.equal(migrationPackage.counts.couples, 1)
  assert.equal(migrationPackage.counts.members, 2)
  assert.equal(migrationPackage.counts.memories, 114)
  assert.equal(migrationPackage.counts.specialMoments, 3)
  assert.equal(migrationPackage.manifest.privateMediaExcluded, true)
  assert.doesNotMatch(serialized, /[A-Z]:\\|file:\/\/|\\Users\\|\/Users\/|OUR MEMORIES/i)
})

test('migration planner treats existing non-user differing documents as conflicts', async () => {
  const validPackage = createMigrationPackage({ approvedUids: TEST_APPROVED_UIDS, generatedAt: '2026-07-21T00:00:00.000Z' })
  const db = {
    doc(path) {
      return {
        async get() {
          if (path.startsWith('users/')) return { exists: true, data: () => ({ username: 'Existing account' }) }
          return { exists: true, data: () => ({ approved: false }) }
        },
      }
    },
  }
  const plan = await planMigrationOperations(db, validPackage)

  assert.equal(plan.summary.mergeUserAccessFields, 2)
  assert.equal(plan.summary.conflict, validPackage.documents.length - 2)
  assert.equal(plan.ok, false)
})

test('migration planner and verifier read package documents without serial network waits', async () => {
  const migrationPackage = createMigrationPackage({ approvedUids: TEST_APPROVED_UIDS, generatedAt: '2026-07-21T00:00:00.000Z' })
  const queuedReads = []
  const db = {
    doc(path) {
      return {
        get() {
          let resolveRead
          const promise = new Promise((resolve) => {
            resolveRead = () => resolve({ exists: false, data: () => ({}) })
          })
          queuedReads.push({ path, resolveRead })
          return promise
        },
      }
    },
  }

  const planPromise = planMigrationOperations(db, migrationPackage)
  await Promise.resolve()
  assert.deepEqual(queuedReads.map((read) => read.path), migrationPackage.documents.map((document) => document.path))
  queuedReads.forEach((read) => read.resolveRead())
  const plan = await planPromise

  assert.equal(plan.summary.create, migrationPackage.documents.length)

  queuedReads.length = 0
  const verifyPromise = verifyMigrationDocuments(db, migrationPackage)
  await Promise.resolve()
  assert.deepEqual(queuedReads.map((read) => read.path), migrationPackage.documents.map((document) => document.path))
  queuedReads.forEach((read) => read.resolveRead())
  const verify = await verifyPromise

  assert.equal(verify.ok, false)
  assert.equal(verify.failures.length, migrationPackage.documents.length)
})
