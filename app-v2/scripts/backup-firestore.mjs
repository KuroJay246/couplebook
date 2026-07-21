import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { initializeAdminFirestore } from './lib/admin-firestore.mjs'
import { assertProjectArg } from './lib/project-guard.mjs'
import { createMigrationPackage } from './lib/migration-package.mjs'
import { sha256, withoutKeys } from './lib/checksum.mjs'

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

function getGitCommit(repoRoot) {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim()
}

function getHostingReleaseMetadata(projectId, repoRoot) {
  try {
    const output = process.platform === 'win32'
      ? execFileSync(
        process.env.ComSpec || 'cmd.exe',
        ['/d', '/s', '/c', `npx -y firebase-tools@14.19.0 hosting:channel:list --project ${projectId} --json`],
        { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      )
      : execFileSync(
        'npx',
        ['-y', 'firebase-tools@14.19.0', 'hosting:channel:list', '--project', projectId, '--json'],
        { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      )
    const parsed = JSON.parse(output)
    const liveChannel = parsed?.result?.channels?.find((channel) => channel.name?.endsWith('/channels/live'))
    const release = liveChannel?.release
    return {
      captured: Boolean(release),
      channel: liveChannel?.name ?? null,
      url: liveChannel?.url ?? null,
      releaseName: release?.name ?? null,
      versionName: release?.version?.name ?? null,
      versionStatus: release?.version?.status ?? null,
      fileCount: release?.version?.fileCount ?? null,
      versionBytes: release?.version?.versionBytes ?? null,
      status: release?.status ?? null,
      type: release?.type ?? null,
      releaseTime: release?.releaseTime ?? null,
    }
  } catch (error) {
    return {
      captured: false,
      error: error.message,
    }
  }
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
    staticProductionCommit: getGitCommit(repoRoot),
    hostingRelease: getHostingReleaseMetadata(projectId, repoRoot),
  }
  const backup = { metadata, documents, rules, appV2Rules }
  const checksum = sha256(withoutKeys(backup, new Set(['checksum'])))
  backup.metadata.checksum = checksum

  const backupPath = path.join(backupDir, 'targeted-firestore-backup.json')
  fs.writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`)
  const parsed = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
  const parsedChecksum = sha256(withoutKeys(parsed, new Set(['checksum'])))
  if (parsed.metadata.checksum !== checksum || parsedChecksum !== checksum) throw new Error('Backup checksum verification failed.')

  console.log(JSON.stringify({
    backupCreated: true,
    projectId,
    documentCount: metadata.documentCount,
    existingDocumentCount: metadata.existingDocumentCount,
    missingDocumentCount: metadata.missingDocumentCount,
    hostingReleaseCaptured: metadata.hostingRelease.captured,
    staticProductionCommit: metadata.staticProductionCommit,
    checksum,
  }, null, 2))
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
