import fs from 'node:fs'
import process from 'node:process'
import { initializeAdminFirestore } from './lib/admin-firestore.mjs'
import { assertConfirmation, assertProjectArg, getArgValue, hasFlag } from './lib/project-guard.mjs'

/* global console */

try {
  const args = process.argv.slice(2)
  const projectId = assertProjectArg(args)
  const backupPath = getArgValue(args, '--backup')
  if (!backupPath || !fs.existsSync(backupPath)) throw new Error('Rollback requires --backup pointing to a targeted backup file.')
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
  if (backup?.metadata?.projectId !== projectId) throw new Error('Backup project does not match rollback target.')
  const restoreCount = backup.documents.filter((document) => document.exists).length
  const missingCount = backup.documents.filter((document) => !document.exists).length
  if (!hasFlag(args, '--apply')) {
    console.log(JSON.stringify({ projectId, dryRun: true, restoreCount, missingCount }, null, 2))
    process.exit(0)
  }
  assertConfirmation(args, 'ROLLBACK_COUPLEBOOK_97830')
  const { db } = await initializeAdminFirestore(args)
  for (let index = 0; index < backup.documents.length; index += 400) {
    const batch = db.batch()
    for (const document of backup.documents.slice(index, index + 400)) {
      const reference = db.doc(document.path)
      if (document.exists) batch.set(reference, document.data)
    }
    await batch.commit()
  }
  console.log(JSON.stringify({ projectId, dryRun: false, restored: restoreCount, skippedMissing: missingCount }, null, 2))
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
