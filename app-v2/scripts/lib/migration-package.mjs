import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createMigrationPlan } from '../plan-firestore-migration.mjs'
import { readNormalizedSpecialMoments } from './legacy-special-content.mjs'
import { documentChecksum, sha256, stableStringify } from './checksum.mjs'
import { REQUIRED_PROJECT_ID } from './project-guard.mjs'

export const MIGRATION_ID = 'v1-0-admin-surprise'
export const SCHEMA_VERSION = 1

const repoRoot = path.resolve(process.cwd(), '..')
const memoryPath = path.join(repoRoot, 'core', 'memories.json')
const statePath = path.join(repoRoot, 'core', 'state.js')
const legacyRulesPath = path.join(repoRoot, 'firestore.rules')
const packageRoot = path.join(process.cwd(), 'local-migration-packages', REQUIRED_PROJECT_ID)

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(readText(filePath))
  } catch {
    return fallback
  }
}

function safeId(value, label) {
  const text = String(value || '').trim()
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(text)) throw new Error(`${label} is not a safe Firestore id.`)
  return text
}

function cleanText(value, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (/<[^>]+>|javascript:|on[a-z]+\s*=|script|iframe|object|embed/i.test(text)) {
    throw new Error('Unsafe text rejected during migration packaging.')
  }
  return text.slice(0, maxLength)
}

function extractLegacyApprovedUids() {
  const source = readText(legacyRulesPath)
  const uids = [...source.matchAll(/'([A-Za-z0-9]{20,40})'/g)].map((match) => match[1])
  return [...new Set(uids)].slice(0, 2)
}

function extractProfiles() {
  const source = readText(statePath)
  const profiles = {}
  for (const name of ['Jaylan', 'Omia']) {
    const block = source.match(new RegExp(`${name}:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, 'm'))?.[1] || ''
    profiles[name] = {
      name,
      bio: cleanText(block.match(/bio:\s*'([^']*)'/)?.[1] || '', 500),
      anniversaryView: cleanText(block.match(/anniversaryView:\s*'([^']*)'/)?.[1] || 'dual', 40),
      joinedDate: cleanText(block.match(/joinedDate:\s*'([^']*)'/)?.[1] || '', 10),
      birthday: cleanText(block.match(/birthday:\s*'([^']*)'/)?.[1] || '', 10),
    }
  }
  return profiles
}

function normalizeMemory(memory, ownerUid) {
  const id = safeId(String(memory.id || '').replace(/\s+/g, '_'), 'memory id')
  const specialMomentType = memory.isSpecialPage
    ? memory.pageUrl?.includes('birthday')
      ? 'birthday'
      : memory.pageUrl?.includes('valentine')
        ? 'valentine'
        : memory.pageUrl?.includes('confession')
          ? 'confession'
          : ''
    : ''
  const next = {
    schemaVersion: SCHEMA_VERSION,
    title: cleanText(memory.title, 180),
    description: cleanText(memory.description, 2000),
    date: cleanText(memory.date, 10),
    tags: Array.isArray(memory.tags) ? memory.tags.map((tag) => cleanText(tag, 60)).filter(Boolean).slice(0, 30) : [],
    mediaState: memory.media ? 'private-legacy-reference' : 'none',
    createdBy: ownerUid,
    updatedBy: ownerUid,
    status: 'active',
  }
  if (specialMomentType) next.specialMomentType = specialMomentType
  return { id, data: next }
}

function normalizeSpecialMomentDocument(momentKey, source) {
  const content = source?.data?.content
  if (!content || !['ready', 'partial'].includes(source.status)) return null
  return {
    schemaVersion: SCHEMA_VERSION,
    title: cleanText(content.title, 120) || `${momentKey} moment`,
    subtitle: cleanText(content.subtitle, 180),
    date: /^\d{4}-\d{2}-\d{2}$/.test(content.date || '') ? content.date : '',
    sections: (content.sections || []).slice(0, 8).map((section) => ({
      kind: ['paragraph', 'note', 'quote', 'list'].includes(section.kind) ? section.kind : 'paragraph',
      content: cleanText(section.content || section.heading || (section.items || []).join(', '), 1200),
    })).filter((section) => section.content),
  }
}

function addDocument(documents, pathValue, data, domain) {
  if (documents.some((document) => document.path === pathValue)) throw new Error(`Duplicate document path: ${pathValue}`)
  documents.push({ path: pathValue, domain, data, checksum: documentChecksum(data) })
}

function withoutPackageChecksums(value) {
  if (Array.isArray(value)) return value.map((entry) => withoutPackageChecksums(entry))
  if (value && typeof value === 'object') {
    const next = {}
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'packageChecksum' || key === 'checksum') continue
      next[key] = withoutPackageChecksums(entry)
    }
    return next
  }
  return value
}

function packageChecksumFor(migrationPackage) {
  return sha256(withoutPackageChecksums(migrationPackage))
}

export function createMigrationPackage({ generatedAt = new Date().toISOString() } = {}) {
  const memories = readJson(memoryPath, [])
  const plan = createMigrationPlan({ memories: Array.isArray(memories) ? memories : [], specialPayloads: readNormalizedSpecialMoments() })
  if (Object.keys(plan.blockers).length > 0) throw new Error('Migration plan has blockers.')

  const uids = extractLegacyApprovedUids()
  if (uids.length !== 2) throw new Error('Expected exactly two legacy approved UIDs.')

  const [ownerUid, partnerUid] = uids
  const coupleId = 'couplebook-v1'
  const profiles = extractProfiles()
  const documents = []

  addDocument(documents, `users/${ownerUid}`, {
    approved: true,
    accessStatus: 'active',
    coupleId,
    displayName: 'Jaylan',
    schemaVersion: SCHEMA_VERSION,
    username: 'Jaylan',
  }, 'users')
  addDocument(documents, `users/${partnerUid}`, {
    approved: true,
    accessStatus: 'pending',
    coupleId,
    displayName: 'Omia',
    schemaVersion: SCHEMA_VERSION,
    username: 'Omia',
  }, 'users')
  addDocument(documents, `couples/${coupleId}`, { schemaVersion: SCHEMA_VERSION, title: 'Couple Book', migrationVersion: 1 }, 'couples')
  addDocument(documents, `couples/${coupleId}/members/${ownerUid}`, { active: true, role: 'member', schemaVersion: SCHEMA_VERSION }, 'members')
  addDocument(documents, `couples/${coupleId}/members/${partnerUid}`, { active: true, role: 'member', schemaVersion: SCHEMA_VERSION }, 'members')
  addDocument(documents, `couples/${coupleId}/profiles/${ownerUid}`, { schemaVersion: SCHEMA_VERSION, ...profiles.Jaylan }, 'profiles')
  addDocument(documents, `couples/${coupleId}/profiles/${partnerUid}`, { schemaVersion: SCHEMA_VERSION, ...profiles.Omia }, 'profiles')
  for (const uid of [ownerUid, partnerUid]) {
    addDocument(documents, `couples/${coupleId}/favorites/${uid}`, {
      schemaVersion: SCHEMA_VERSION,
      food: [],
      songs: [],
      movies: [],
      places: [],
      memories: [],
      notes: [],
    }, 'favorites')
    addDocument(documents, `couples/${coupleId}/settings/${uid}`, {
      schemaVersion: SCHEMA_VERSION,
      theme: 'paper',
      anniversaryView: 'dual',
      privacy: { localOnlyMode: true, reducedMotion: false },
    }, 'settings')
  }
  addDocument(documents, `couples/${coupleId}/settings/shared`, { schemaVersion: SCHEMA_VERSION, theme: 'paper' }, 'settings')
  addDocument(documents, `couples/${coupleId}/contracts/current`, {
    schemaVersion: SCHEMA_VERSION,
    title: 'Couple Book agreement',
    bodyStatus: 'status-only',
    acceptedBy: [],
    signatureStatus: 'status-only',
  }, 'contract')

  for (const memory of memories.map((entry) => normalizeMemory(entry, ownerUid))) {
    addDocument(documents, `couples/${coupleId}/memories/${memory.id}`, memory.data, 'memories')
  }

  const specialMoments = readNormalizedSpecialMoments()
  const specialContentStatus = {}
  for (const momentKey of ['birthday', 'valentine', 'confession']) {
    const document = normalizeSpecialMomentDocument(momentKey, specialMoments[momentKey])
    specialContentStatus[momentKey] = document ? specialMoments[momentKey].status : 'unavailable'
    if (document) addDocument(documents, `couples/${coupleId}/specialMoments/${momentKey}`, document, 'specialMoments')
  }

  const counts = documents.reduce((accumulator, document) => {
    accumulator[document.domain] = (accumulator[document.domain] || 0) + 1
    return accumulator
  }, {})
  const sourceChecksum = sha256({
    memories: readText(memoryPath),
    state: readText(statePath),
    specialContentStatus,
  })
  const body = {
    migrationId: MIGRATION_ID,
    projectId: REQUIRED_PROJECT_ID,
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    sourceChecksum,
    counts,
    documents,
    manifest: {
      migrationId: MIGRATION_ID,
      schemaVersion: SCHEMA_VERSION,
      counts,
      status: 'completed',
      appRelease: '1.0-admin-surprise',
      privateMediaExcluded: true,
      specialContentStatus,
    },
  }
  body.packageChecksum = packageChecksumFor(body)
  body.manifest.packageChecksum = body.packageChecksum
  body.manifest.sourceChecksum = sourceChecksum
  addDocument(body.documents, `couples/${coupleId}/migrations/${MIGRATION_ID}`, body.manifest, 'migrations')
  body.counts.migrations = 1
  body.packageChecksum = packageChecksumFor(body)
  body.manifest.packageChecksum = body.packageChecksum
  body.documents[body.documents.length - 1].data.packageChecksum = body.packageChecksum
  body.documents[body.documents.length - 1].checksum = documentChecksum(body.documents[body.documents.length - 1].data)
  body.packageChecksum = packageChecksumFor(body)
  body.manifest.packageChecksum = body.packageChecksum
  body.documents[body.documents.length - 1].data.packageChecksum = body.packageChecksum
  return body
}

export function writeMigrationPackage(migrationPackage) {
  fs.mkdirSync(packageRoot, { recursive: true })
  const fileName = `${migrationPackage.generatedAt.replace(/[:.]/g, '-')}-${migrationPackage.migrationId}.json`
  const outputPath = path.join(packageRoot, fileName)
  fs.writeFileSync(outputPath, `${JSON.stringify(migrationPackage, null, 2)}\n`)
  fs.writeFileSync(path.join(packageRoot, 'latest.json'), `${JSON.stringify(migrationPackage, null, 2)}\n`)
  return outputPath
}

export function readLatestMigrationPackage() {
  return readJson(path.join(packageRoot, 'latest.json'), null)
}

export function validateMigrationPackage(migrationPackage) {
  const errors = []
  if (!migrationPackage || migrationPackage.projectId !== REQUIRED_PROJECT_ID) errors.push('project mismatch')
  if (migrationPackage?.schemaVersion !== SCHEMA_VERSION) errors.push('schema mismatch')
  if (migrationPackage?.migrationId !== MIGRATION_ID) errors.push('migration mismatch')
  const paths = new Set()
  for (const document of migrationPackage?.documents || []) {
    if (paths.has(document.path)) errors.push(`duplicate path ${document.path}`)
    paths.add(document.path)
    if (document.checksum !== documentChecksum(document.data)) errors.push(`checksum mismatch ${document.path}`)
    if (stableStringify(document.data).match(/[A-Z]:\\|file:\/\/|\\Users\\|\/Users\/|OUR MEMORIES/i)) {
      errors.push(`raw local path ${document.path}`)
    }
  }
  const expectedPackageChecksum = packageChecksumFor(migrationPackage)
  if (migrationPackage?.packageChecksum !== expectedPackageChecksum) errors.push('package checksum mismatch')
  return { ok: errors.length === 0, errors }
}
