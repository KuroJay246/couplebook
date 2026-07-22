/* global console */
import fs from 'node:fs'
import path from 'node:path'
import {
  contentTypeForExtension,
  inventoryLocalMedia,
  readLegacyMediaReferences,
} from './lib/media-mapping.mjs'
import {
  mediaCategoryFor,
  sha256File,
} from './lib/media-duplicate-audit.mjs'

const repoRoot = path.resolve('..')
const documentsRoot = path.resolve(repoRoot, '..')
const libraryRoot = path.join(documentsRoot, 'Couple Book Private Media')
const recoveryManifestPath = path.join(documentsRoot, 'Couple Book Media Recovery.manifests', 'media-inventory.json')
const originalsRoot = path.join(libraryRoot, 'originals')

function mediaIdFor(category, index) {
  if (category === 'image') return `CB_IMG_${String(index).padStart(4, '0')}`
  if (category === 'video') return `CB_VID_${String(index).padStart(4, '0')}`
  if (category === 'audio') return `CB_AUD_${String(index).padStart(4, '0')}`
  return `CB_MEDIA_${String(index).padStart(4, '0')}`
}

function candidateCanonicalFiles() {
  const fromOriginals = fs.existsSync(originalsRoot)
    ? inventoryLocalMedia({ repoRoot, roots: [originalsRoot] })
    : []
  if (fromOriginals.length > 0) return fromOriginals
  return inventoryLocalMedia({ repoRoot, rootOnly: true, roots: [libraryRoot] })
    .filter((file) => /^CB_(IMG|VID|AUD|MEDIA)_\d{4}/.test(path.basename(file.privatePath)))
}

function aliasesByChecksum() {
  if (!fs.existsSync(recoveryManifestPath)) return new Map()
  const inventory = JSON.parse(fs.readFileSync(recoveryManifestPath, 'utf8')).inventory || []
  const aliases = new Map()
  for (const item of inventory) {
    if (!item.sha256 || !item.normalizedFilename) continue
    if (!aliases.has(item.sha256)) aliases.set(item.sha256, new Set())
    aliases.get(item.sha256).add(item.normalizedFilename)
  }
  return aliases
}

function flattenCanonicalFiles() {
  const files = candidateCanonicalFiles()
    .filter((file) => file.corrupt === false)
    .sort((a, b) => a.type.localeCompare(b.type) || a.sha256.localeCompare(b.sha256))
  const counters = { image: 0, video: 0, audio: 0, unsupported: 0 }
  const flattened = []

  for (const file of files) {
    const category = mediaCategoryFor(file.extension)
    counters[category] = (counters[category] || 0) + 1
    const mediaId = mediaIdFor(category, counters[category])
    const destination = path.join(libraryRoot, `${mediaId}${file.extension}`)
    const beforeSha = sha256File(file.privatePath)
    const beforeSize = fs.statSync(file.privatePath).size

    if (path.resolve(file.privatePath) !== path.resolve(destination)) {
      if (fs.existsSync(destination)) {
        const existingSha = sha256File(destination)
        if (existingSha !== beforeSha) throw new Error(`Destination collision for ${mediaId}.`)
        throw new Error(`Destination already has identical checksum for ${mediaId}; refusing implicit duplicate removal.`)
      }
      fs.renameSync(file.privatePath, destination)
    }

    const afterSha = sha256File(destination)
    const afterSize = fs.statSync(destination).size
    if (afterSha !== beforeSha) throw new Error(`Checksum changed while flattening ${mediaId}.`)
    if (afterSize !== beforeSize) throw new Error(`Size changed while flattening ${mediaId}.`)

    flattened.push({
      mediaId,
      filename: path.basename(destination),
      sha256: afterSha,
      byteSize: afterSize,
      mediaType: category,
      mimeType: contentTypeForExtension(file.extension),
      extension: file.extension.replace(/^\./, ''),
      uploadStatus: 'pending',
      driveFileId: '',
    })
  }

  return flattened
}

function buildUploadManifest(files) {
  const aliases = aliasesByChecksum()
  const localByAlias = new Map()
  for (const file of files) {
    for (const alias of aliases.get(file.sha256) || []) localByAlias.set(alias, file)
  }

  const records = readLegacyMediaReferences({ repoRoot }).map((reference) => {
    const file = localByAlias.get(reference.normalizedFilename)
    if (!file) {
      return {
        mediaId: '',
        legacyReferenceId: reference.redactedReferenceId,
        canonicalFilename: '',
        sha256: '',
        byteSize: 0,
        mediaType: reference.expectedType,
        mimeType: '',
        extension: reference.extension.replace(/^\./, ''),
        memoryId: reference.memoryId,
        uploadStatus: 'missing',
        driveFileId: '',
        schemaVersion: 1,
      }
    }
    return {
      mediaId: file.mediaId,
      legacyReferenceId: reference.redactedReferenceId,
      canonicalFilename: file.filename,
      sha256: file.sha256,
      byteSize: file.byteSize,
      mediaType: file.mediaType,
      mimeType: file.mimeType,
      extension: file.extension,
      memoryId: reference.memoryId,
      uploadStatus: 'pending',
      driveFileId: '',
      schemaVersion: 1,
    }
  })

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceFolder: 'Couple Book Private Media',
    uploadProvider: 'google-drive',
    driveFolderName: 'Couple Book Private Media',
    files,
    records,
    summary: {
      uniqueFiles: files.length,
      images: files.filter((file) => file.mediaType === 'image').length,
      videos: files.filter((file) => file.mediaType === 'video').length,
      audio: files.filter((file) => file.mediaType === 'audio').length,
      totalBytes: files.reduce((total, file) => total + file.byteSize, 0),
      legacyReferences: records.length,
      exactMatches: records.filter((record) => record.uploadStatus === 'pending').length,
      missing: records.filter((record) => record.uploadStatus === 'missing').length,
      uploadStatus: 'not-uploaded',
    },
  }

  fs.writeFileSync(path.join(libraryRoot, 'CoupleBookUploadManifest.json'), JSON.stringify(manifest, null, 2))
  fs.writeFileSync(path.join(libraryRoot, 'UPLOAD SUMMARY.txt'), [
    'Couple Book Private Media Upload Summary',
    '',
    'This is the only local folder used for the Google Drive upload.',
    `Total unique files: ${manifest.summary.uniqueFiles}`,
    `Total size: ${manifest.summary.totalBytes} bytes`,
    `Images: ${manifest.summary.images}`,
    `Videos: ${manifest.summary.videos}`,
    `Audio: ${manifest.summary.audio}`,
    `Missing legacy references: ${manifest.summary.missing}`,
    `Upload status: ${manifest.summary.uploadStatus}`,
    `Drive folder name: ${manifest.driveFolderName}`,
    `Date verified: ${manifest.generatedAt}`,
    '',
  ].join('\n'))

  return manifest
}

const files = flattenCanonicalFiles()
const manifest = buildUploadManifest(files)
console.log(JSON.stringify({
  folder: libraryRoot,
  files: manifest.summary.uniqueFiles,
  images: manifest.summary.images,
  videos: manifest.summary.videos,
  audio: manifest.summary.audio,
  totalBytes: manifest.summary.totalBytes,
  missing: manifest.summary.missing,
}, null, 2))
