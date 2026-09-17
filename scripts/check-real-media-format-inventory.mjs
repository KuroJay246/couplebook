import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const defaultManifestPath = path.resolve(repoRoot, '..', 'couplebook.private-import', 'real-media-manifest.json')
const manifestPath = process.env.COUPLEBOOK_REAL_MEDIA_MANIFEST || defaultManifestPath

const NATIVE_PREVIEW_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp'])
const NATIVE_VIDEO_EXTENSIONS = new Set(['.mp4', '.webm'])
const DRIVE_THUMBNAIL_IMAGE_EXTENSIONS = new Set(['.heic', '.heif', '.bmp', '.tif', '.tiff', '.avif'])

function readManifest() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Real media manifest is missing: ${manifestPath}`)
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
}

function increment(map, key) {
  const normalized = key || 'unknown'
  map.set(normalized, (map.get(normalized) || 0) + 1)
}

function handlingForItem(item) {
  const extension = String(item.extension || '').toLowerCase()
  const mimeType = String(item.mimeType || '').toLowerCase()
  if (NATIVE_PREVIEW_EXTENSIONS.has(extension)) return 'native image preview/viewer'
  if (NATIVE_VIDEO_EXTENSIONS.has(extension) && mimeType.startsWith('video/')) return 'native protected video stream with poster fallback'
  if (DRIVE_THUMBNAIL_IMAGE_EXTENSIONS.has(extension)) return 'Drive thumbnail/poster preview with original-download fallback'
  if (mimeType.startsWith('video/')) return 'Drive poster plus open/download original fallback'
  return 'intentional unsupported-original fallback'
}

function summarize(items) {
  const byExtension = new Map()
  const byMimeType = new Map()
  const byKind = new Map()
  const byHandling = new Map()
  const unsupported = []
  const corrupt = []

  for (const item of items) {
    const extension = String(item.extension || '').toLowerCase()
    const mimeType = String(item.mimeType || '').toLowerCase()
    const sizeBytes = Number(item.sizeBytes || 0)
    const kind = mimeType.startsWith('video/') ? 'video' : mimeType.startsWith('image/') ? 'image' : 'other'
    const handling = handlingForItem(item)

    increment(byExtension, extension)
    increment(byMimeType, mimeType)
    increment(byKind, kind)
    increment(byHandling, handling)

    if (handling === 'intentional unsupported-original fallback') unsupported.push({ extension, mimeType })
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) corrupt.push({ extension, mimeType })
  }

  return {
    byExtension: Object.fromEntries([...byExtension.entries()].sort()),
    byHandling: Object.fromEntries([...byHandling.entries()].sort()),
    byKind: Object.fromEntries([...byKind.entries()].sort()),
    byMimeType: Object.fromEntries([...byMimeType.entries()].sort()),
    corruptCount: corrupt.length,
    unsupportedCount: unsupported.length,
  }
}

const manifest = readManifest()
const items = Array.isArray(manifest.items) ? manifest.items : []
const summary = summarize(items)

if (items.length !== 110) {
  throw new Error(`Expected 110 inventoried media files, found ${items.length}.`)
}
if (summary.corruptCount !== 0) {
  throw new Error(`Expected 0 zero-byte/corrupt inventory files, found ${summary.corruptCount}.`)
}
if (summary.unsupportedCount !== 0) {
  throw new Error(`Expected every actual media format to have a deliberate handling state, found ${summary.unsupportedCount} unsupported.`)
}

console.log(JSON.stringify({
  generatedFrom: 'private-real-media-manifest',
  fileCount: items.length,
  summary,
}, null, 2))
