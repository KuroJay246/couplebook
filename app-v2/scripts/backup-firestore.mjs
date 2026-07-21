import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { initializeAdminFirestore } from './lib/admin-firestore.mjs'
import { assertProjectArg } from './lib/project-guard.mjs'
import { createMigrationPackage } from './lib/migration-package.mjs'
import { sha256 } from './lib/checksum.mjs'

/* global console */

const repoRoot = path.resolve(process.cwd(), '..')

async function readTargetDocuments(db, migrationPackage) {
  const documents = []
  for (const target of migrationPackage.documents) {
    const snapshot = await db.doc(target.path).get()
    documents.push({ path: target.path, exists: snapshot.exists, data: snapshot.exists ? snapshot.data() : null })
  }
  return documents
}

try {
  const args = process.argv.slice(2)
  const projectId = assertProjectArg(args)
  const { db } = await initializeAdminFirestore(args)
  const migrationPackage = createMigrationPackage()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(repoRoot, '.local-backups', projectId, timestamp)
  fs.mkdirSync(backupDir, { recursive: true })

  const documents = await readTargetDocuments(db, migrationPackage)
  const rules = fs.readFileSync(path.join(repoRoot, 'firestore.rules'), 'utf8')
  const appV2Rules = fs.readFileSync(path.join(repoRoot, 'firestore.app-v2.rules'), 'utf8')
  const metadata = {
    projectId,
    createdAt: new Date().toISOString(),
    documentCount: documents.length,
    existingDocumentCount: documents.filter((document) => document.exists).length,
    missingDocumentCount: documents.filter((document) => !document.exists).length,
    gitCommit: process.env.GIT_COMMIT || '',
  }
  const backup = { metadata, documents, rules, appV2Rules }
  const checksum = sha256(backup)
  backup.metadata.checksum = checksum

  const backupPath = path.join(backupDir, 'targeted-firestore-backup.json')
  fs.writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`)
  const parsed = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
  if (parsed.metadata.checksum !== checksum) throw new Error('Backup checksum verification failed.')

  console.log(JSON.stringify({
    backupCreated: true,
    projectId,
    documentCount: metadata.documentCount,
    existingDocumentCount: metadata.existingDocumentCount,
    missingDocumentCount: metadata.missingDocumentCount,
    checksum,
  }, null, 2))
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
