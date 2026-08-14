/* global console */
import fs from 'node:fs'
import path from 'node:path'
import {
  classifyDuplicates,
  inventoryDocumentsMedia,
  inventoryToCsv,
  summarizeInventory,
} from './lib/media-duplicate-audit.mjs'

const repoRoot = path.resolve('..')
const documentsRoot = path.resolve(repoRoot, '..')
const projectRoot = repoRoot
const manifestRoot = path.join(documentsRoot, 'Couple Book Media Recovery.manifests')
const generatedAt = new Date().toISOString()

fs.mkdirSync(manifestRoot, { recursive: true })

const inventory = inventoryDocumentsMedia({ documentsRoot, projectRoot })
const duplicateSummary = classifyDuplicates(inventory)
const summary = summarizeInventory(inventory, duplicateSummary)
const folderSummary = Object.groupBy
  ? Object.groupBy(inventory, (item) => item.folderCategory)
  : inventory.reduce((groups, item) => {
      groups[item.folderCategory] ||= []
      groups[item.folderCategory].push(item)
      return groups
    }, {})

const recoveryLog = {
  generatedAt,
  mode: 'read-only-inventory',
  documentsRoot,
  projectRoot,
  manifestRoot,
  actions: ['inventory', 'checksum', 'duplicate-classification'],
  movedFiles: 0,
  deletedFiles: 0,
}

fs.writeFileSync(path.join(manifestRoot, 'media-inventory.json'), JSON.stringify({ generatedAt, inventory }, null, 2))
fs.writeFileSync(path.join(manifestRoot, 'media-inventory.csv'), inventoryToCsv(inventory))
fs.writeFileSync(path.join(manifestRoot, 'duplicate-groups.json'), JSON.stringify({ generatedAt, ...duplicateSummary }, null, 2))
fs.writeFileSync(path.join(manifestRoot, 'folder-summary.json'), JSON.stringify({ generatedAt, summary, folders: Object.fromEntries(Object.entries(folderSummary).map(([key, items]) => [key, { files: items.length, bytes: items.reduce((total, item) => total + item.sizeBytes, 0) }])) }, null, 2))
fs.writeFileSync(path.join(manifestRoot, 'recovery-log.json'), JSON.stringify(recoveryLog, null, 2))

console.log(JSON.stringify({
  manifestRoot,
  ...summary,
}, null, 2))
