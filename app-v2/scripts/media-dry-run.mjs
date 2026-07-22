import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  assertProject,
  buildMediaManifest,
  inventoryDerivedPosters,
  inventoryLocalMedia,
  readLegacyMediaReferences,
  REQUIRED_PROJECT_ID,
} from './lib/media-mapping.mjs'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(appDir, '..')

function argValue(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : ''
}

if (process.argv.includes('--apply')) {
  throw new Error('Media apply is intentionally not implemented in this dry-run command.')
}

const projectId = argValue('--project')
assertProject(projectId)

const coupleId = argValue('--couple') || 'couple-main'
const outDir = path.join(repoRoot, '.visual-audit', 'media-truth-current')
fs.mkdirSync(outDir, { recursive: true })
const canonicalOriginalsRoot = path.join(repoRoot, '..', 'Couple Book Private Media', 'originals')
const useLegacySources = process.argv.includes('--legacy-sources')
const mediaRoots = !useLegacySources && fs.existsSync(canonicalOriginalsRoot)
  ? [canonicalOriginalsRoot]
  : [repoRoot, path.join(repoRoot, 'OUR MEMORIES'), path.join(repoRoot, 'assets'), path.join(repoRoot, 'pages')]
const sourceMode = mediaRoots.length === 1 && mediaRoots[0] === canonicalOriginalsRoot ? 'canonical-private-library' : 'legacy-local-sources'

function withCanonicalAliases(localMedia) {
  if (sourceMode !== 'canonical-private-library') return localMedia
  const inventoryPath = path.join(repoRoot, '..', 'Couple Book Media Recovery.manifests', 'media-inventory.json')
  if (!fs.existsSync(inventoryPath)) return localMedia
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8')).inventory || []
  const aliasesByChecksum = new Map()
  for (const item of inventory) {
    if (!item.sha256 || !item.normalizedFilename) continue
    if (!aliasesByChecksum.has(item.sha256)) aliasesByChecksum.set(item.sha256, new Set())
    aliasesByChecksum.get(item.sha256).add(item.normalizedFilename)
  }
  return localMedia.map((item) => {
    const aliases = [...(aliasesByChecksum.get(item.sha256) || [])]
    if (aliases.length === 0) return item
    return { ...item, filenameAliases: aliases }
  })
}

const localMedia = withCanonicalAliases(inventoryLocalMedia({
  repoRoot,
  roots: mediaRoots,
}))
const derivedPosters = inventoryDerivedPosters({
  repoRoot,
  rootDir: path.join(repoRoot, '.visual-audit', 'media-derived-current'),
})
const references = readLegacyMediaReferences({ repoRoot })
const manifest = buildMediaManifest({ coupleId, derivedPosters, localMedia, references })

fs.writeFileSync(path.join(outDir, 'media-manifest-redacted.json'), JSON.stringify(manifest.publicManifest, null, 2))
fs.writeFileSync(path.join(outDir, 'media-manifest-private.ignored.json'), JSON.stringify(manifest.privateManifest, null, 2))

process.stdout.write(
  JSON.stringify(
    {
      projectLock: projectId === REQUIRED_PROJECT_ID ? 'PASS' : 'FAIL',
      apply: false,
      sourceMode,
      manifestChecksum: manifest.checksum,
      ...manifest.publicManifest.summary,
    },
    null,
    2,
  ),
)
process.stdout.write('\n')
