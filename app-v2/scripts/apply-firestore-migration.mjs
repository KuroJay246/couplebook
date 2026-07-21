import { initializeAdminFirestore } from './lib/admin-firestore.mjs'
import process from 'node:process'
import { assertConfirmation, assertProjectArg, hasFlag } from './lib/project-guard.mjs'
import { readLatestMigrationPackage } from './lib/migration-package.mjs'
import { applyCreateOperations, planMigrationOperations } from './lib/migration-engine.mjs'

/* global console */

try {
  const args = process.argv.slice(2)
  const projectId = assertProjectArg(args)
  const migrationPackage = readLatestMigrationPackage()
  if (!migrationPackage) throw new Error('Migration package is missing. Run migration:package first.')
  const { db } = await initializeAdminFirestore(args)
  const plan = await planMigrationOperations(db, migrationPackage)
  const result = {
    projectId,
    migrationId: migrationPackage.migrationId,
    packageChecksum: migrationPackage.packageChecksum,
    dryRun: !hasFlag(args, '--apply'),
    ...plan.summary,
  }
  if (!plan.ok) {
    console.log(JSON.stringify(result, null, 2))
    throw new Error('Migration dry run has conflicts or invalid records.')
  }
  if (!hasFlag(args, '--apply')) {
    console.log(JSON.stringify(result, null, 2))
    process.exit(0)
  }
  assertConfirmation(args, 'MIGRATE_COUPLEBOOK_97830')
  const applyResult = await applyCreateOperations(db, plan.operations)
  result.created = applyResult.created
  result.mergedUserAccessFields = applyResult.mergedUserAccessFields
  result.dryRun = false
  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
