import assert from 'node:assert/strict'
import test from 'node:test'

import { createMigrationPackage, validateMigrationPackage } from '../../scripts/lib/migration-package.mjs'
import { planMigrationOperations } from '../../scripts/lib/migration-engine.mjs'
import { assertProjectArg, REQUIRED_PROJECT_ID } from '../../scripts/lib/project-guard.mjs'

test('production project guard rejects missing and prohibited project targets', () => {
  assert.equal(assertProjectArg(['--project', REQUIRED_PROJECT_ID]), REQUIRED_PROJECT_ID)
  assert.throws(() => assertProjectArg([]), /project guard/i)
  assert.throws(() => assertProjectArg(['--project', 'gathervibeshub']), /prohibited/i)
})

test('migration package validates counts and excludes raw private paths', () => {
  const migrationPackage = createMigrationPackage({ generatedAt: '2026-07-21T00:00:00.000Z' })
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

test('migration planner treats existing differing documents as conflicts', async () => {
  const validPackage = createMigrationPackage({ generatedAt: '2026-07-21T00:00:00.000Z' })
  const db = {
    doc() {
      return {
        async get() {
          return { exists: true, data: () => ({ approved: false }) }
        },
      }
    },
  }
  const plan = await planMigrationOperations(db, validPackage)

  assert.equal(plan.summary.conflict, validPackage.documents.length)
  assert.equal(plan.ok, false)
})
