import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { Buffer } from 'node:buffer'

export const SUPPORTED_EXTENSIONS = Object.freeze(new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.bmp', '.tif', '.tiff',
  '.mp4', '.mov', '.m4v', '.avi', '.mkv', '.webm', '.3gp', '.wmv',
  '.mp3', '.m4a', '.wav', '.aac', '.ogg',
]))

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.bmp', '.tif', '.tiff'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.avi', '.mkv', '.webm', '.3gp', '.wmv'])
const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.wav', '.aac', '.ogg'])
const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.visual-audit',
  '.firebase',
  '.vite',
  'local-migration-packages',
  '.local-migration-packages',
  '.local-backups',
])

const TARGET_DIR_PATTERN = /^(our\s*)?(couple\s*)?(book\s*)?(memories?|videos?|media|photos|pictures|couplebook)$/i

export function normalizeName(value) {
  return path.basename(String(value || '')).toLowerCase().replace(/[^a-z0-9.]+/g, '')
}

export function mediaCategoryFor(extension) {
  const ext = extension.toLowerCase()
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (VIDEO_EXTENSIONS.has(ext)) return 'video'
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio'
  return 'unsupported'
}

export function sha256File(filePath) {
  const hash = crypto.createHash('sha256')
  const fd = fs.openSync(filePath, 'r')
  try {
    const buffer = Buffer.allocUnsafe(1024 * 1024)
    let bytesRead = 0
    do {
      bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead))
    } while (bytesRead > 0)
  } finally {
    fs.closeSync(fd)
  }
  return hash.digest('hex')
}

export function isExcludedDirectory(name) {
  return EXCLUDED_DIRS.has(name)
}

function isTargetDirectory(dirPath, documentsRoot, projectRoot) {
  const name = path.basename(dirPath)
  if (path.resolve(dirPath) === path.resolve(projectRoot)) return true
  if (!TARGET_DIR_PATTERN.test(name)) return false
  const relative = path.relative(documentsRoot, dirPath)
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}

export function findSearchRoots({ documentsRoot, projectRoot }) {
  const roots = new Set()
  const visit = (dirPath) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    if (isTargetDirectory(dirPath, documentsRoot, projectRoot)) roots.add(path.resolve(dirPath))
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (isExcludedDirectory(entry.name)) continue
      visit(path.join(dirPath, entry.name))
    }
  }
  visit(documentsRoot)
  roots.add(path.resolve(projectRoot))
  return [...roots].sort()
}

function walkCandidateFiles(root, files = []) {
  if (!fs.existsSync(root)) return files
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const filePath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      if (isExcludedDirectory(entry.name)) continue
      walkCandidateFiles(filePath, files)
      continue
    }
    if (!entry.isFile()) continue
    const extension = path.extname(entry.name).toLowerCase()
    if (SUPPORTED_EXTENSIONS.has(extension)) files.push(filePath)
  }
  return files
}

export function inventoryDocumentsMedia({ documentsRoot, projectRoot }) {
  const searchRoots = findSearchRoots({ documentsRoot, projectRoot })
  const seen = new Set()
  const files = []
  for (const root of searchRoots) {
    for (const filePath of walkCandidateFiles(root)) {
      const resolved = path.resolve(filePath)
      if (seen.has(resolved)) continue
      seen.add(resolved)
      files.push(resolved)
    }
  }
  return files.sort().map((filePath, index) => inspectMediaFile({ filePath, index, documentsRoot, projectRoot }))
}

export function inspectMediaFile({ filePath, index, documentsRoot, projectRoot }) {
  const extension = path.extname(filePath).toLowerCase()
  const inventoryId = `inv_${crypto.createHash('sha256').update(filePath).digest('hex').slice(0, 20)}`
  try {
    const stats = fs.statSync(filePath)
    const sha256 = stats.size > 0 ? sha256File(filePath) : ''
    const relativeToProject = path.relative(projectRoot, filePath)
    return {
      inventoryId,
      index,
      sourcePath: filePath,
      filename: path.basename(filePath),
      normalizedFilename: normalizeName(filePath),
      extension,
      mediaCategory: mediaCategoryFor(extension),
      sizeBytes: stats.size,
      sha256,
      modifiedTime: stats.mtime.toISOString(),
      createdTime: stats.birthtime.toISOString(),
      readResult: 'readable',
      corruptionResult: stats.size === 0 ? 'empty' : 'not-detected',
      folderCategory: classifyFolder({ filePath, documentsRoot, projectRoot }),
      insideProject: relativeToProject && !relativeToProject.startsWith('..') && !path.isAbsolute(relativeToProject),
    }
  } catch (error) {
    return {
      inventoryId,
      index,
      sourcePath: filePath,
      filename: path.basename(filePath),
      normalizedFilename: normalizeName(filePath),
      extension,
      mediaCategory: mediaCategoryFor(extension),
      sizeBytes: 0,
      sha256: '',
      modifiedTime: '',
      createdTime: '',
      readResult: 'error',
      corruptionResult: 'unreadable',
      folderCategory: classifyFolder({ filePath, documentsRoot, projectRoot }),
      insideProject: false,
      errorCode: error?.code || 'UNKNOWN',
    }
  }
}

function classifyFolder({ filePath, documentsRoot, projectRoot }) {
  const relativeProject = path.relative(projectRoot, filePath)
  if (relativeProject && !relativeProject.startsWith('..') && !path.isAbsolute(relativeProject)) return 'project'
  const relativeDocuments = path.relative(documentsRoot, filePath).toLowerCase()
  if (relativeDocuments.includes('our memories')) return 'our-memories'
  if (relativeDocuments.includes('memories')) return 'memories'
  if (relativeDocuments.includes('videos')) return 'videos'
  if (relativeDocuments.includes('photos') || relativeDocuments.includes('pictures')) return 'photos'
  if (relativeDocuments.includes('media')) return 'media'
  return 'documents'
}

export function classifyDuplicates(inventory) {
  const byChecksum = new Map()
  const byName = new Map()
  for (const item of inventory) {
    if (item.sha256) {
      const key = `${item.sha256}:${item.sizeBytes}`
      if (!byChecksum.has(key)) byChecksum.set(key, [])
      byChecksum.get(key).push(item)
    }
    if (item.normalizedFilename) {
      if (!byName.has(item.normalizedFilename)) byName.set(item.normalizedFilename, [])
      byName.get(item.normalizedFilename).push(item)
    }
  }

  const exactDuplicateGroups = [...byChecksum.values()]
    .filter((items) => items.length > 1 && items.every((item) => item.readResult === 'readable'))
    .map((items, groupIndex) => ({
      groupId: `dup_${String(groupIndex + 1).padStart(4, '0')}`,
      sha256: items[0].sha256,
      sizeBytes: items[0].sizeBytes,
      retainedInventoryId: selectCanonical(items).inventoryId,
      duplicateInventoryIds: items.map((item) => item.inventoryId),
      copies: items.length,
    }))

  const sameNameDifferentFiles = [...byName.values()]
    .filter((items) => new Set(items.map((item) => item.sha256 || item.inventoryId)).size > 1)
    .map((items, groupIndex) => ({
      groupId: `same_name_${String(groupIndex + 1).padStart(4, '0')}`,
      normalizedFilename: items[0].normalizedFilename,
      inventoryIds: items.map((item) => item.inventoryId),
      uniqueChecksums: new Set(items.map((item) => item.sha256 || item.inventoryId)).size,
    }))

  return {
    exactDuplicateGroups,
    sameNameDifferentFiles,
    corrupt: inventory.filter((item) => item.corruptionResult === 'unreadable').map((item) => item.inventoryId),
    empty: inventory.filter((item) => item.corruptionResult === 'empty').map((item) => item.inventoryId),
  }
}

export function selectCanonical(items) {
  return [...items].sort((a, b) => {
    const aScore = canonicalScore(a)
    const bScore = canonicalScore(b)
    if (bScore !== aScore) return bScore - aScore
    return a.sourcePath.localeCompare(b.sourcePath)
  })[0]
}

function canonicalScore(item) {
  let score = 0
  if (item.readResult === 'readable') score += 100
  if (item.folderCategory !== 'project') score += 20
  if (!/copy|duplicate|temp|cache/i.test(item.filename)) score += 10
  if (item.createdTime) score += 5
  return score
}

export function summarizeInventory(inventory, duplicateSummary) {
  return {
    filesScanned: inventory.length,
    totalBytes: inventory.reduce((total, item) => total + item.sizeBytes, 0),
    images: inventory.filter((item) => item.mediaCategory === 'image').length,
    videos: inventory.filter((item) => item.mediaCategory === 'video').length,
    audio: inventory.filter((item) => item.mediaCategory === 'audio').length,
    uniqueChecksumCount: new Set(inventory.filter((item) => item.sha256).map((item) => item.sha256)).size,
    exactDuplicateGroups: duplicateSummary.exactDuplicateGroups.length,
    exactDuplicateCopies: duplicateSummary.exactDuplicateGroups.reduce((total, group) => total + group.copies - 1, 0),
    sameNameDifferentFiles: duplicateSummary.sameNameDifferentFiles.length,
    corrupt: duplicateSummary.corrupt.length,
    empty: duplicateSummary.empty.length,
    projectMediaFiles: inventory.filter((item) => item.insideProject).length,
  }
}

export function csvEscape(value) {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function inventoryToCsv(inventory) {
  const headers = ['inventoryId', 'sourcePath', 'filename', 'extension', 'mediaCategory', 'sizeBytes', 'sha256', 'modifiedTime', 'createdTime', 'readResult', 'corruptionResult', 'folderCategory', 'insideProject']
  return [
    headers.join(','),
    ...inventory.map((item) => headers.map((header) => csvEscape(item[header])).join(',')),
  ].join('\n')
}

export function canonicalMediaId(item) {
  if (!item.sha256) throw new Error(`Cannot create canonical media id for ${item.inventoryId}.`)
  return `media_${item.sha256.slice(0, 24)}`
}

export function canonicalRelativePath(item) {
  const category = item.mediaCategory === 'image' ? 'images' : item.mediaCategory === 'video' ? 'videos' : item.mediaCategory === 'audio' ? 'audio' : 'unresolved'
  return path.join('originals', category, `${canonicalMediaId(item)}${item.extension}`)
}

export function buildConsolidationPlan({ duplicateSummary, inventory, libraryRoot, timestamp }) {
  const byInventoryId = new Map(inventory.map((item) => [item.inventoryId, item]))
  const byChecksum = new Map()
  for (const item of inventory) {
    if (!item.sha256 || item.readResult !== 'readable' || item.corruptionResult !== 'not-detected') continue
    if (!byChecksum.has(item.sha256)) byChecksum.set(item.sha256, [])
    byChecksum.get(item.sha256).push(item)
  }

  const canonicalCopies = [...byChecksum.values()].map((items) => {
    const selected = selectCanonical(items)
    return {
      sourceInventoryId: selected.inventoryId,
      sourcePath: selected.sourcePath,
      sha256: selected.sha256,
      sizeBytes: selected.sizeBytes,
      canonicalMediaId: canonicalMediaId(selected),
      canonicalPath: path.join(libraryRoot, canonicalRelativePath(selected)),
      mediaCategory: selected.mediaCategory,
    }
  })

  const quarantineRoot = path.join(libraryRoot, 'quarantine', 'exact-duplicates', timestamp)
  const quarantineMoves = duplicateSummary.exactDuplicateGroups.flatMap((group) => {
    const retained = group.retainedInventoryId
    return group.duplicateInventoryIds
      .filter((inventoryId) => inventoryId !== retained)
      .map((inventoryId) => {
        const item = byInventoryId.get(inventoryId)
        if (!item) throw new Error(`Missing inventory item ${inventoryId}.`)
        return {
          inventoryId,
          sourcePath: item.sourcePath,
          sha256: item.sha256,
          sizeBytes: item.sizeBytes,
          retainedInventoryId: retained,
          retainedCanonicalChecksum: group.sha256,
          quarantinePath: path.join(quarantineRoot, `${inventoryId}${item.extension}`),
        }
      })
  })

  return {
    libraryRoot,
    quarantineRoot,
    canonicalCopies,
    quarantineMoves,
    sameNameDifferentFiles: duplicateSummary.sameNameDifferentFiles,
  }
}

export function verifyCopy(sourcePath, destinationPath, expectedSha256, expectedSizeBytes) {
  const sourceStats = fs.statSync(sourcePath)
  const destinationStats = fs.statSync(destinationPath)
  if (sourceStats.size !== expectedSizeBytes) throw new Error('Source size changed during canonical copy.')
  if (destinationStats.size !== expectedSizeBytes) throw new Error('Canonical copy size mismatch.')
  if (sha256File(sourcePath) !== expectedSha256) throw new Error('Source checksum changed during canonical copy.')
  if (sha256File(destinationPath) !== expectedSha256) throw new Error('Canonical copy checksum mismatch.')
}
