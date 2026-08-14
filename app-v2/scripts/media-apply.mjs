import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { initializeAdminMediaServices } from './lib/admin-firestore.mjs'
import { assertProject, parseJsonFile } from './lib/media-mapping.mjs'
import {
  applyMediaManifest,
  captureMediaBackup,
  publicManifestChecksum,
  validateManifestForApply,
  validatePrivateManifest,
} from './lib/media-upload.mjs'
import { getArgValue, hasFlag } from './lib/project-guard.mjs'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(appDir, '..')

function requireArg(args, name) {
  const value = getArgValue(args, name)
  if (!value) throw new Error(`${name} is required.`)
  return value
}

const args = process.argv.slice(2)
const projectId = requireArg(args, '--project')
assertProject(projectId)
if (!hasFlag(args, '--apply')) throw new Error('Media apply requires --apply.')

const manifestPath = path.resolve(repoRoot, requireArg(args, '--manifest'))
const checksum = requireArg(args, '--manifest-checksum')
const confirm = requireArg(args, '--confirm')
const ownerUid = requireArg(args, '--owner-uid')
const concurrency = Number.parseInt(getArgValue(args, '--concurrency') || '3', 10)
const manifest = parseJsonFile(manifestPath)

validateManifestForApply(manifest, { checksum, confirm, ownerUid })
if (publicManifestChecksum(manifest) !== checksum) throw new Error('Manifest file checksum verification failed.')
const eligibleCount = validatePrivateManifest(manifest)

const { bucket, db } = await initializeAdminMediaServices(args)
const backup = await captureMediaBackup({ bucket, db, manifest })
const backupDir = path.join(repoRoot, '.visual-audit', 'media-apply-backups')
fs.mkdirSync(backupDir, { recursive: true })
const backupPath = path.join(backupDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-rollback-redacted.json`)
fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))

const result = await applyMediaManifest({ bucket, concurrency, db, manifest, ownerUid })
process.stdout.write(JSON.stringify({
  backup: 'PASS',
  backupPath,
  eligibleCount,
  projectLock: 'PASS',
  ...result,
}, null, 2))
process.stdout.write('\n')
