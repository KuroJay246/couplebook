import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { createMigrationPlan } from './plan-firestore-migration.mjs'

/* global console */

const repoRoot = path.resolve(process.cwd(), '..')
const memoryPath = path.join(repoRoot, 'core', 'memories.json')
const packageDir = path.join(process.cwd(), 'local-migration-packages')

function safeReadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''))
  } catch {
    return fallback
  }
}

function hashId(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16)
}

function createRedactedPackage(memories, plan) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    destination: 'firestore-emulator-only',
    productionWrites: false,
    dryRunDefault: true,
    rollbackPlan: 'Discard emulator data or restore from owner-approved production backup before any future cutover.',
    idempotency: 'Document IDs derive from stable legacy IDs; this package stores only hashed IDs.',
    counts: plan.domains,
    blockers: plan.blockers,
    records: memories.map((memory) => ({
      idHash: hashId(memory?.id),
      hasTitle: typeof memory?.title === 'string' && memory.title.trim().length > 0,
      hasDate: typeof memory?.date === 'string' && memory.date.trim().length > 0,
      mediaState: memory?.media ? 'privateLegacyReference' : 'none',
    })),
  }
}

export function rehearseMigration({ memories = [], writePackage = false } = {}) {
  const plan = createMigrationPlan({ memories })
  const packageSummary = {
    created: false,
    path: '',
    recordCount: 0,
  }

  if (writePackage) {
    fs.mkdirSync(packageDir, { recursive: true })
    const packagePath = path.join(packageDir, 'latest-redacted-rehearsal.json')
    const redactedPackage = createRedactedPackage(memories, plan)
    fs.writeFileSync(packagePath, `${JSON.stringify(redactedPackage, null, 2)}\n`)
    packageSummary.created = true
    packageSummary.path = packagePath
    packageSummary.recordCount = redactedPackage.records.length
  }

  return {
    schemaVersion: 1,
    mode: 'dry-run',
    productionWrites: false,
    emulatorImportReady: Object.keys(plan.blockers).length === 0,
    sourceInventory: {
      memories: memories.length,
      profiles: plan.domains.users.proposedPathCount,
      members: plan.domains.members.proposedPathCount,
      couples: plan.domains.couples.proposedPathCount,
      specialMoments: Object.keys(plan.domains.specialMoments).length,
    },
    validation: {
      duplicateDetection: plan.blockers['duplicate-id'] || 0,
      invalidRecords: plan.domains.memories.invalidCount,
      unsafeMediaPaths: plan.blockers['unsafe-media-path'] || 0,
      privateMediaPolicy: 'metadata-only',
    },
    plan,
    package: packageSummary,
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const memories = safeReadJson(memoryPath, [])
  const report = rehearseMigration({
    memories: Array.isArray(memories) ? memories : [],
    writePackage: process.argv.includes('--package'),
  })
  console.log(JSON.stringify(report, null, 2))
  process.exit(report.emulatorImportReady ? 0 : 1)
}
