import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  classifyDuplicates,
  buildConsolidationPlan,
  findSearchRoots,
  inventoryDocumentsMedia,
  selectCanonical,
} from '../../scripts/lib/media-duplicate-audit.mjs'

function withTmp(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'couplebook-media-audit-'))
  try {
    return fn(tmp)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

test('expanded media audit finds relevant Documents media folders and skips app build folders', () => withTmp((tmp) => {
  const documentsRoot = path.join(tmp, 'Documents')
  const projectRoot = path.join(documentsRoot, 'couplebook')
  fs.mkdirSync(path.join(documentsRoot, 'Our Memories'), { recursive: true })
  fs.mkdirSync(path.join(projectRoot, 'app-v2', 'dist'), { recursive: true })
  fs.writeFileSync(path.join(documentsRoot, 'Our Memories', 'one.mp4'), Buffer.from([1, 2, 3]))
  fs.writeFileSync(path.join(projectRoot, 'app-v2', 'dist', 'generated.mp4'), Buffer.from([1, 2, 3]))

  const roots = findSearchRoots({ documentsRoot, projectRoot })
  const inventory = inventoryDocumentsMedia({ documentsRoot, projectRoot })

  assert.equal(roots.some((root) => root.endsWith(`Our Memories`)), true)
  assert.equal(inventory.length, 1)
  assert.equal(inventory[0].mediaCategory, 'video')
}))

test('duplicate audit groups exact checksum duplicates and preserves same-name different files', () => withTmp((tmp) => {
  const documentsRoot = path.join(tmp, 'Documents')
  const projectRoot = path.join(documentsRoot, 'couplebook')
  fs.mkdirSync(path.join(documentsRoot, 'Memories'), { recursive: true })
  fs.mkdirSync(path.join(documentsRoot, 'Videos'), { recursive: true })
  fs.writeFileSync(path.join(documentsRoot, 'Memories', 'clip.mp4'), Buffer.from([4, 5, 6]))
  fs.writeFileSync(path.join(documentsRoot, 'Videos', 'clip-copy.mp4'), Buffer.from([4, 5, 6]))
  fs.writeFileSync(path.join(documentsRoot, 'Videos', 'clip.mp4'), Buffer.from([9, 9, 9]))

  const inventory = inventoryDocumentsMedia({ documentsRoot, projectRoot })
  const duplicateSummary = classifyDuplicates(inventory)

  assert.equal(duplicateSummary.exactDuplicateGroups.length, 1)
  assert.equal(duplicateSummary.exactDuplicateGroups[0].copies, 2)
  assert.equal(duplicateSummary.sameNameDifferentFiles.length, 1)
}))

test('canonical selection prefers readable personal media over project-folder copies', () => {
  const personal = {
    inventoryId: 'personal',
    readResult: 'readable',
    folderCategory: 'memories',
    filename: 'clip.mp4',
    createdTime: '2026-07-22T00:00:00.000Z',
    sourcePath: 'C:/Users/Jaylan/Documents/Memories/clip.mp4',
  }
  const project = {
    inventoryId: 'project',
    readResult: 'readable',
    folderCategory: 'project',
    filename: 'clip.mp4',
    createdTime: '2026-07-22T00:00:00.000Z',
    sourcePath: 'C:/Users/Jaylan/Documents/couplebook/clip.mp4',
  }

  assert.equal(selectCanonical([project, personal]).inventoryId, 'personal')
})

test('consolidation plan copies one canonical per checksum and quarantines only redundant exact duplicates', () => {
  const inventory = [
    {
      inventoryId: 'personal',
      sourcePath: 'C:/Users/Jaylan/Documents/Memories/clip.mp4',
      sha256: 'a'.repeat(64),
      sizeBytes: 3,
      readResult: 'readable',
      corruptionResult: 'not-detected',
      folderCategory: 'memories',
      filename: 'clip.mp4',
      extension: '.mp4',
      mediaCategory: 'video',
      createdTime: '2026-07-22T00:00:00.000Z',
    },
    {
      inventoryId: 'project',
      sourcePath: 'C:/Users/Jaylan/Documents/couplebook/OUR MEMORIES/clip.mp4',
      sha256: 'a'.repeat(64),
      sizeBytes: 3,
      readResult: 'readable',
      corruptionResult: 'not-detected',
      folderCategory: 'project',
      filename: 'clip.mp4',
      extension: '.mp4',
      mediaCategory: 'video',
      createdTime: '2026-07-22T00:00:00.000Z',
    },
    {
      inventoryId: 'unique',
      sourcePath: 'C:/Users/Jaylan/Documents/Memories/photo.jpg',
      sha256: 'b'.repeat(64),
      sizeBytes: 4,
      readResult: 'readable',
      corruptionResult: 'not-detected',
      folderCategory: 'memories',
      filename: 'photo.jpg',
      extension: '.jpg',
      mediaCategory: 'image',
      createdTime: '2026-07-22T00:00:00.000Z',
    },
  ]
  const duplicateSummary = classifyDuplicates(inventory)
  const plan = buildConsolidationPlan({
    duplicateSummary,
    inventory,
    libraryRoot: 'C:/Users/Jaylan/Documents/Couple Book Private Media',
    timestamp: '2026-07-22T00-00-00-000Z',
  })

  assert.equal(plan.canonicalCopies.length, 2)
  assert.equal(plan.quarantineMoves.length, 1)
  assert.equal(plan.quarantineMoves[0].inventoryId, 'project')
})
