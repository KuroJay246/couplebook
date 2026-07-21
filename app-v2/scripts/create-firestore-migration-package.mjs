import { assertProjectArg } from './lib/project-guard.mjs'
import process from 'node:process'
import { createMigrationPackage, validateMigrationPackage, writeMigrationPackage } from './lib/migration-package.mjs'

/* global console */

try {
  assertProjectArg(process.argv.slice(2))
  const migrationPackage = createMigrationPackage()
  const validation = validateMigrationPackage(migrationPackage)
  if (!validation.ok) throw new Error(validation.errors.join('; '))
  writeMigrationPackage(migrationPackage)
  console.log(JSON.stringify({
    packageCreated: true,
    projectId: migrationPackage.projectId,
    migrationId: migrationPackage.migrationId,
    packageChecksum: migrationPackage.packageChecksum,
    counts: migrationPackage.counts,
    specialContentStatus: migrationPackage.manifest.specialContentStatus,
  }, null, 2))
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
