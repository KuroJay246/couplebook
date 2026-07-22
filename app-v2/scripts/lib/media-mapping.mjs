import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const REQUIRED_PROJECT_ID = 'couplebook-97830'
export const PROHIBITED_PROJECT_ID = 'gathervibeshub'

const MEDIA_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.mp4', '.mov', '.m4v', '.webm', '.avi', '.mp3', '.wav', '.m4a'])
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.avi'])
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a'])
const DEFAULT_EXCLUDED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.firebase', '.visual-audit'])

export function stripBom(text) {
  return text.replace(/^\uFEFF/, '')
}

export function parseJsonFile(filePath) {
  return JSON.parse(stripBom(fs.readFileSync(filePath, 'utf8')))
}

export function normalizeFilename(value) {
  return path.basename(String(value || '')).toLowerCase().replace(/[^a-z0-9.]+/g, '')
}

export function redactedId(value, length = 16) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, length)
}

export function deterministicMediaId(reference) {
  return `media_${redactedId(reference, 24)}`
}

export function mediaTypeForExtension(extension) {
  const ext = extension.toLowerCase()
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (VIDEO_EXTENSIONS.has(ext)) return 'video'
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio'
  return 'unsupported'
}

export function supportedUploadType(extension) {
  const ext = extension.toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return true
  if (['.mp4', '.mov', '.m4v', '.webm'].includes(ext)) return true
  return false
}

export function contentTypeForExtension(extension) {
  const ext = extension.toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.mp4' || ext === '.m4v') return 'video/mp4'
  if (ext === '.mov') return 'video/quicktime'
  if (ext === '.webm') return 'video/webm'
  return 'application/octet-stream'
}

export function sha256File(filePath) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

function walkMediaFiles(rootDir, repoRoot, acc = []) {
  if (!fs.existsSync(rootDir)) return acc
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const filePath = path.join(rootDir, entry.name)
    const relativePath = path.relative(repoRoot, filePath).replaceAll('\\', '/')
    if (entry.isDirectory()) {
      if (DEFAULT_EXCLUDED_DIRS.has(entry.name) || relativePath.startsWith('app-v2/local-migration-packages')) continue
      walkMediaFiles(filePath, repoRoot, acc)
      continue
    }

    if (MEDIA_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      acc.push(filePath)
    }
  }
  return acc
}

export function inventoryLocalMedia({ repoRoot, roots }) {
  const files = [...new Set(roots.flatMap((rootDir) => walkMediaFiles(rootDir, repoRoot)))]
  return files.map((filePath) => {
    const stats = fs.statSync(filePath)
    const extension = path.extname(filePath).toLowerCase()
    return {
      privatePath: filePath,
      redactedFileId: redactedId(path.relative(repoRoot, filePath)),
      normalizedFilename: normalizeFilename(filePath),
      extension,
      type: mediaTypeForExtension(extension),
      supportedUpload: supportedUploadType(extension),
      contentType: contentTypeForExtension(extension),
      sizeBytes: stats.size,
      mtimeMs: Math.round(stats.mtimeMs),
      sha256: sha256File(filePath),
      corrupt: stats.size === 0,
    }
  })
}

export function readLegacyMediaReferences({ repoRoot }) {
  const memoriesPath = path.join(repoRoot, 'core', 'memories.json')
  const records = fs.existsSync(memoriesPath) ? parseJsonFile(memoriesPath) : []
  return records
    .flatMap((record, index) => {
      const rawReference = record?.media || ''
      const extension = path.extname(rawReference).toLowerCase()
      if (!rawReference || !MEDIA_EXTENSIONS.has(extension)) return []
      return [{
        index,
        memoryId: record?.id || `memory-${String(index + 1).padStart(4, '0')}`,
        mediaId: deterministicMediaId(rawReference),
        redactedReferenceId: redactedId(rawReference),
        normalizedFilename: normalizeFilename(rawReference),
        expectedType: record?.isVideo === true ? 'video' : mediaTypeForExtension(extension),
        extension,
      }]
    })
}

export function buildMediaManifest({ coupleId, localMedia, references }) {
  const localByName = new Map()
  for (const file of localMedia) {
    if (!localByName.has(file.normalizedFilename)) localByName.set(file.normalizedFilename, [])
    localByName.get(file.normalizedFilename).push(file)
  }

  const records = references.map((reference) => {
    const candidates = localByName.get(reference.normalizedFilename) || []
    let classification = 'MISSING'
    if (candidates.length === 1) classification = 'EXACT'
    if (candidates.length > 1) classification = 'DUPLICATE'

    const candidate = classification === 'EXACT' ? candidates[0] : null
    const variant = reference.expectedType === 'video' ? 'original' : 'original'
    return {
      coupleId,
      mediaId: reference.mediaId,
      memoryId: reference.memoryId,
      redactedReferenceId: reference.redactedReferenceId,
      classification,
      expectedType: reference.expectedType,
      candidateCount: candidates.length,
      safeToUpload: classification === 'EXACT' && candidate?.supportedUpload === true && candidate.corrupt === false,
      original: candidate
        ? {
            redactedFileId: candidate.redactedFileId,
            storagePath: `couples/${coupleId}/media/${reference.mediaId}/${variant}`,
            extension: candidate.extension.replace(/^\./, ''),
            contentType: candidate.contentType,
            sizeBytes: candidate.sizeBytes,
            sha256: candidate.sha256,
          }
        : null,
      privatePath: candidate?.privatePath || null,
    }
  })

  const summary = {
    localFiles: localMedia.length,
    references: references.length,
    exactMatches: records.filter((record) => record.classification === 'EXACT').length,
    verifiedMatches: 0,
    probableMatches: 0,
    ambiguousMatches: records.filter((record) => record.classification === 'DUPLICATE').length,
    missing: records.filter((record) => record.classification === 'MISSING').length,
    duplicates: records.filter((record) => record.classification === 'DUPLICATE').length,
    corrupt: localMedia.filter((file) => file.corrupt).length,
    plannedOriginalUploads: records.filter((record) => record.safeToUpload).length,
    plannedThumbnails: 0,
    plannedPosterFrames: 0,
    alreadyCorrect: 0,
    conflicts: 0,
    invalid: records.filter((record) => record.classification === 'EXACT' && !record.safeToUpload).length,
    totalBytes: records.filter((record) => record.safeToUpload).reduce((total, record) => total + record.original.sizeBytes, 0),
  }

  const publicRecords = records.map((record) => {
    const safeRecord = { ...record }
    delete safeRecord.privatePath
    return safeRecord
  })
  const publicManifest = {
    schemaVersion: 1,
    coupleId,
    generatedAt: new Date().toISOString(),
    summary,
    records: publicRecords,
  }
  const privateManifest = {
    ...publicManifest,
    records,
  }
  const checksum = crypto.createHash('sha256').update(JSON.stringify(publicManifest)).digest('hex')
  return { checksum, privateManifest, publicManifest: { ...publicManifest, checksum } }
}

export function assertProject(projectId) {
  if (!projectId) throw new Error('Explicit --project is required.')
  if (projectId === PROHIBITED_PROJECT_ID || projectId.includes(PROHIBITED_PROJECT_ID)) {
    throw new Error('Refusing prohibited Firebase project.')
  }
  if (projectId !== REQUIRED_PROJECT_ID) {
    throw new Error(`Refusing Firebase project ${projectId}; expected ${REQUIRED_PROJECT_ID}.`)
  }
}
