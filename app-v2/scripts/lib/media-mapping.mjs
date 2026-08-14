import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const REQUIRED_PROJECT_ID = 'couplebook-97830'
export const PROHIBITED_PROJECT_ID = 'gathervibeshub'

const MEDIA_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.mp4', '.mov', '.m4v', '.webm', '.avi', '.mp3', '.wav', '.m4a'])
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.avi'])
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a'])
const DEFAULT_EXCLUDED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.firebase', '.visual-audit', 'quarantine', 'manifests', 'logs', 'generated', 'thumbnails', 'video-posters'])

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
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp', '.tif', '.tiff'].includes(ext)) return true
  if (['.mp4', '.mov', '.m4v', '.webm', '.avi', '.mkv', '.3gp', '.wmv'].includes(ext)) return true
  if (['.mp3', '.wav', '.m4a', '.aac', '.ogg'].includes(ext)) return true
  return false
}

export function contentTypeForExtension(extension) {
  const ext = extension.toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.heic') return 'image/heic'
  if (ext === '.heif') return 'image/heif'
  if (ext === '.bmp') return 'image/bmp'
  if (ext === '.tif' || ext === '.tiff') return 'image/tiff'
  if (ext === '.mp4' || ext === '.m4v') return 'video/mp4'
  if (ext === '.mov') return 'video/quicktime'
  if (ext === '.webm') return 'video/webm'
  if (ext === '.avi') return 'video/x-msvideo'
  if (ext === '.mkv') return 'video/x-matroska'
  if (ext === '.3gp') return 'video/3gpp'
  if (ext === '.wmv') return 'video/x-ms-wmv'
  if (ext === '.mp3') return 'audio/mpeg'
  if (ext === '.wav') return 'audio/wav'
  if (ext === '.m4a') return 'audio/mp4'
  if (ext === '.aac') return 'audio/aac'
  if (ext === '.ogg') return 'audio/ogg'
  return 'application/octet-stream'
}

export function sha256File(filePath) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

function walkMediaFiles(rootDir, repoRoot, acc = [], options = {}) {
  if (!fs.existsSync(rootDir)) return acc
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const filePath = path.join(rootDir, entry.name)
    const relativePath = path.relative(repoRoot, filePath).replaceAll('\\', '/')
    if (entry.isDirectory()) {
      if (options.rootOnly) continue
      if (DEFAULT_EXCLUDED_DIRS.has(entry.name) || relativePath.startsWith('app-v2/local-migration-packages')) continue
      walkMediaFiles(filePath, repoRoot, acc, options)
      continue
    }

    if (MEDIA_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      acc.push(filePath)
    }
  }
  return acc
}

export function inventoryLocalMedia({ repoRoot, rootOnly = false, roots }) {
  const files = [...new Set(roots.flatMap((rootDir) => walkMediaFiles(rootDir, repoRoot, [], { rootOnly })))]
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

export function inventoryDerivedPosters({ repoRoot, rootDir }) {
  if (!fs.existsSync(rootDir)) return new Map()
  const posters = new Map()
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const mediaId = entry.name
    const posterPath = path.join(rootDir, mediaId, 'poster.jpg')
    if (!fs.existsSync(posterPath)) continue
    const stats = fs.statSync(posterPath)
    if (stats.size === 0) continue
    posters.set(mediaId, {
      contentType: 'image/jpeg',
      extension: 'jpg',
      privatePath: posterPath,
      redactedFileId: redactedId(path.relative(repoRoot, posterPath)),
      sha256: sha256File(posterPath),
      sizeBytes: stats.size,
    })
  }
  return posters
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

export function buildMediaManifest({ coupleId, derivedPosters = new Map(), localMedia, references }) {
  const localByName = new Map()
  for (const file of localMedia) {
    const names = [file.normalizedFilename, ...(Array.isArray(file.filenameAliases) ? file.filenameAliases : [])].filter(Boolean)
    for (const name of new Set(names)) {
      if (!localByName.has(name)) localByName.set(name, [])
      localByName.get(name).push(file)
    }
  }

  const records = references.map((reference) => {
    const candidates = localByName.get(reference.normalizedFilename) || []
    let classification = 'MISSING'
    if (candidates.length === 1) classification = 'EXACT'
    if (candidates.length > 1) classification = 'DUPLICATE'

    const candidate = classification === 'EXACT' ? candidates[0] : null
    const poster = reference.expectedType === 'video' ? derivedPosters.get(reference.mediaId) || null : null
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
            storageMetadata: {
              coupleId,
              mediaId: reference.mediaId,
              ownerUid: '',
              schemaVersion: '1',
              kind: reference.expectedType,
              extension: candidate.extension.replace(/^\./, ''),
              sha256: candidate.sha256,
            },
            extension: candidate.extension.replace(/^\./, ''),
            contentType: candidate.contentType,
            sizeBytes: candidate.sizeBytes,
            sha256: candidate.sha256,
          }
        : null,
      poster: candidate && poster
        ? {
            redactedFileId: poster.redactedFileId,
            storagePath: `couples/${coupleId}/media/${reference.mediaId}/poster`,
            storageMetadata: {
              coupleId,
              mediaId: reference.mediaId,
              ownerUid: '',
              schemaVersion: '1',
              kind: 'poster',
              extension: poster.extension,
              sha256: poster.sha256,
            },
            extension: poster.extension,
            contentType: poster.contentType,
            sizeBytes: poster.sizeBytes,
            sha256: poster.sha256,
          }
        : null,
      privatePath: candidate?.privatePath || null,
      posterPrivatePath: poster?.privatePath || null,
    }
  })

  const uploadCandidatesByChecksum = new Map()
  for (const file of localMedia) {
    if (file.supportedUpload !== true || file.corrupt !== false || !file.sha256) continue
    if (!uploadCandidatesByChecksum.has(file.sha256)) uploadCandidatesByChecksum.set(file.sha256, file)
  }
  const safeMatchedChecksums = new Set(records.filter((record) => record.safeToUpload).map((record) => record.original.sha256))
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
    plannedOriginalUploads: uploadCandidatesByChecksum.size,
    plannedThumbnails: 0,
    plannedPosterFrames: records.filter((record) => record.safeToUpload && record.poster).length,
    alreadyCorrect: 0,
    conflicts: 0,
    invalid: records.filter((record) => record.classification === 'EXACT' && !record.safeToUpload).length,
    duplicateUploadAttemptsPrevented: Math.max(0, records.filter((record) => record.safeToUpload).length - safeMatchedChecksums.size),
    totalBytes: [...uploadCandidatesByChecksum.values()].reduce((total, file) => total + file.sizeBytes, 0),
  }

  const publicRecords = records.map((record) => {
    const safeRecord = { ...record }
    delete safeRecord.privatePath
    delete safeRecord.posterPrivatePath
    return safeRecord
  })
  const publicManifest = {
    schemaVersion: 1,
    coupleId,
    generatedAt: new Date().toISOString(),
    summary,
    records: publicRecords,
  }
  const checksum = crypto.createHash('sha256').update(JSON.stringify(publicManifest)).digest('hex')
  return {
    checksum,
    privateManifest: { ...publicManifest, checksum, records },
    publicManifest: { ...publicManifest, checksum },
  }
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
