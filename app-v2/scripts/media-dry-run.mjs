import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  assertProject,
  buildMediaManifest,
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

const localMedia = inventoryLocalMedia({
  repoRoot,
  roots: [repoRoot, path.join(repoRoot, 'OUR MEMORIES'), path.join(repoRoot, 'assets'), path.join(repoRoot, 'pages')],
})
const references = readLegacyMediaReferences({ repoRoot })
const manifest = buildMediaManifest({ coupleId, localMedia, references })

fs.writeFileSync(path.join(outDir, 'media-manifest-redacted.json'), JSON.stringify(manifest.publicManifest, null, 2))
fs.writeFileSync(path.join(outDir, 'media-manifest-private.ignored.json'), JSON.stringify(manifest.privateManifest, null, 2))

process.stdout.write(
  JSON.stringify(
    {
      projectLock: projectId === REQUIRED_PROJECT_ID ? 'PASS' : 'FAIL',
      apply: false,
      manifestChecksum: manifest.checksum,
      ...manifest.publicManifest.summary,
    },
    null,
    2,
  ),
)
process.stdout.write('\n')
