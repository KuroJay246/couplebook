import { initializeAdminFirestore } from './lib/admin-firestore.mjs'
import process from 'node:process'
import { assertProjectArg } from './lib/project-guard.mjs'
import { readLatestMigrationPackage } from './lib/migration-package.mjs'
import { verifyMigrationDocuments } from './lib/migration-engine.mjs'

/* global console */

try {
  const args = process.argv.slice(2)
  const projectId = assertProjectArg(args)
  const migrationPackage = readLatestMigrationPackage()
  if (!migrationPackage) throw new Error('Migration package is missing. Run migration:package first.')
  const { db } = await initializeAdminFirestore(args)
  const verification = await verifyMigrationDocuments(db, migrationPackage)
  console.log(JSON.stringify({
    projectId,
    migrationId: migrationPackage.migrationId,
    packageChecksum: migrationPackage.packageChecksum,
    ok: verification.ok,
    counts: verification.counts,
    failureCount: verification.failures.length,
  }, null, 2))
  process.exit(verification.ok ? 0 : 1)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
