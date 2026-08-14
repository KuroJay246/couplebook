/* global console */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  buildConsolidationPlan,
  verifyCopy,
} from './lib/media-duplicate-audit.mjs'

const args = new Set(process.argv.slice(2))
const apply = args.has('--apply')
const repoRoot = path.resolve('..')
const documentsRoot = path.resolve(repoRoot, '..')
const manifestRoot = path.join(documentsRoot, 'Couple Book Media Recovery.manifests')
const libraryRoot = path.join(documentsRoot, 'Couple Book Private Media')
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

const inventoryPath = path.join(manifestRoot, 'media-inventory.json')
const duplicatesPath = path.join(manifestRoot, 'duplicate-groups.json')
if (!fs.existsSync(inventoryPath) || !fs.existsSync(duplicatesPath)) {
  throw new Error('Run media-duplicate-audit.mjs before consolidation.')
}

const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8')).inventory
const duplicateSummary = JSON.parse(fs.readFileSync(duplicatesPath, 'utf8'))
const plan = buildConsolidationPlan({ duplicateSummary, inventory, libraryRoot, timestamp })

const planSummary = {
  apply,
  libraryRoot,
  uniqueCanonicalCopies: plan.canonicalCopies.length,
  exactDuplicateCopiesToQuarantine: plan.quarantineMoves.length,
  quarantineBytes: plan.quarantineMoves.reduce((total, item) => total + item.sizeBytes, 0),
  sameNameDifferentFilesPreserved: plan.sameNameDifferentFiles.length,
}

if (!apply) {
  console.log(JSON.stringify(planSummary, null, 2))
  process.exit(0)
}

fs.mkdirSync(path.join(libraryRoot, 'manifests'), { recursive: true })
fs.mkdirSync(path.join(libraryRoot, 'logs'), { recursive: true })

const copied = []
for (const copy of plan.canonicalCopies) {
  fs.mkdirSync(path.dirname(copy.canonicalPath), { recursive: true })
  if (!fs.existsSync(copy.canonicalPath)) {
    fs.copyFileSync(copy.sourcePath, copy.canonicalPath, fs.constants.COPYFILE_EXCL)
  }
  verifyCopy(copy.sourcePath, copy.canonicalPath, copy.sha256, copy.sizeBytes)
  copied.push({
    sourceInventoryId: copy.sourceInventoryId,
    canonicalMediaId: copy.canonicalMediaId,
    sha256: copy.sha256,
    sizeBytes: copy.sizeBytes,
    canonicalPath: copy.canonicalPath,
  })
}

const moved = []
for (const move of plan.quarantineMoves) {
  fs.mkdirSync(path.dirname(move.quarantinePath), { recursive: true })
  const canonical = copied.find((copy) => copy.sha256 === move.sha256)
  if (!canonical) throw new Error(`No verified canonical copy for ${move.inventoryId}.`)
  verifyCopy(move.sourcePath, canonical.canonicalPath, move.sha256, move.sizeBytes)
  fs.renameSync(move.sourcePath, move.quarantinePath)
  verifyCopy(move.quarantinePath, canonical.canonicalPath, move.sha256, move.sizeBytes)
  moved.push({
    inventoryId: move.inventoryId,
    sha256: move.sha256,
    originalSourceLocation: move.sourcePath,
    quarantineLocation: move.quarantinePath,
    retainedCanonicalCopyId: canonical.canonicalMediaId,
    retainedCanonicalChecksum: canonical.sha256,
    moveTimestamp: timestamp,
    restorationProcedure: `Move quarantineLocation back to originalSourceLocation after verifying sha256 ${move.sha256}.`,
  })
}

const privateManifest = {
  generatedAt: new Date().toISOString(),
  mode: 'canonical-copy-and-exact-duplicate-quarantine',
  ...planSummary,
  copied,
  moved,
}

fs.writeFileSync(path.join(libraryRoot, 'manifests', `consolidation-${timestamp}.json`), JSON.stringify(privateManifest, null, 2))
fs.writeFileSync(path.join(manifestRoot, 'recovery-log.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  mode: 'canonical-copy-and-exact-duplicate-quarantine',
  movedFiles: moved.length,
  deletedFiles: 0,
  uniqueFilesDeleted: 0,
  quarantineRoot: plan.quarantineRoot,
}, null, 2))

console.log(JSON.stringify({
  ...planSummary,
  canonicalCopiesVerified: copied.length,
  exactDuplicateCopiesQuarantined: moved.length,
  deletedFiles: 0,
}, null, 2))
