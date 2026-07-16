import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { normalizeSpecialMomentPayload } from '../src/data/legacySpecialMomentAdapter.js'

/* global console */

const repoRoot = path.resolve(process.cwd(), '..')
const memoryPath = path.join(repoRoot, 'core', 'memories.json')
const supportedSpecialTypes = new Set(['birthday', 'valentine', 'confession'])

function safeReadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''))
  } catch {
    return fallback
  }
}

function isUnsafeMediaPath(value) {
  return typeof value === 'string' && /[A-Z]:\\|file:\/\/|\\Users\\|\/Users\/|OUR MEMORIES/i.test(value)
}

function classifyMemory(memory, seenIds) {
  const blockers = []
  const id = typeof memory?.id === 'string' ? memory.id.trim() : ''
  if (!id) blockers.push('missing-id')
  if (id && seenIds.has(id)) blockers.push('duplicate-id')
  if (id) seenIds.add(id)
  if (!memory?.title || typeof memory.title !== 'string') blockers.push('missing-title')
  if (memory?.date && Number.isNaN(new Date(memory.date).getTime())) blockers.push('invalid-date')
  if (isUnsafeMediaPath(memory?.media)) blockers.push('unsafe-media-path')
  return blockers
}

export function createMigrationPlan({ memories = [], specialPayloads = {} } = {}) {
  const seenIds = new Set()
  const blockerCounts = {}
  const mediaStates = { none: 0, privateLegacyReference: 0 }
  let validMemories = 0

  for (const memory of memories) {
    const blockers = classifyMemory(memory, seenIds)
    for (const blocker of blockers) {
      blockerCounts[blocker] = (blockerCounts[blocker] || 0) + 1
    }
    if (blockers.length === 0) validMemories += 1
    if (memory?.media) mediaStates.privateLegacyReference += 1
    else mediaStates.none += 1
  }

  const specialMoments = {}
  for (const momentType of supportedSpecialTypes) {
    const payload = specialPayloads[momentType] || null
    const normalized = normalizeSpecialMomentPayload(momentType, payload)
    specialMoments[momentType] = {
      status: payload ? normalized.status : 'missing',
      warnings: normalized.warnings.length,
    }
  }

  for (const momentType of Object.keys(specialPayloads)) {
    if (!supportedSpecialTypes.has(momentType)) {
      blockerCounts['unsupported-special-type'] = (blockerCounts['unsupported-special-type'] || 0) + 1
    }
  }

  return {
    schemaVersion: 1,
    domains: {
      users: { proposedPathCount: 2, writeReady: false },
      couples: { proposedPathCount: 1, writeReady: false },
      members: { proposedPathCount: 2, writeReady: false },
      memories: {
        sourceCount: memories.length,
        validCount: validMemories,
        invalidCount: memories.length - validMemories,
        proposedPathCount: memories.length,
        mediaStates,
      },
      specialMoments,
    },
    blockers: blockerCounts,
    writesPlanned: 0,
    outputPolicy: 'counts-only-redacted',
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const memories = safeReadJson(memoryPath, [])
  const plan = createMigrationPlan({ memories: Array.isArray(memories) ? memories : [] })
  console.log(JSON.stringify(plan, null, 2))
  process.exit(Object.keys(plan.blockers).length > 0 ? 1 : 0)
}
