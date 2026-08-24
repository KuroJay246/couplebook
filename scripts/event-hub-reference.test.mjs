import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import {
  REQUIRED_REFERENCE_BRANCHES,
  REQUIRED_REFERENCE_FILES,
  loadEventHubReferenceConfig,
  readReferenceFileAtCommit,
  validateEventHubReference,
} from './lib/event-hub-reference.mjs'

const repoRoot = path.resolve(import.meta.dirname, '..')
const { config } = loadEventHubReferenceConfig(repoRoot)

test('configured Event Hub reference commit remains valid without matching active HEAD', () => {
  const validation = validateEventHubReference(config, { cwd: repoRoot })
  assert.equal(validation.errors.length, 0)
  assert.deepEqual(validation.reachableBranches, REQUIRED_REFERENCE_BRANCHES)
  assert.equal(validation.requiredFiles.every((file) => file.readable), true)
})

test('reference files can be read directly from the configured commit', () => {
  for (const referenceFile of REQUIRED_REFERENCE_FILES) {
    const source = readReferenceFileAtCommit(config.referenceRepo, config.lastInspectedCommit, referenceFile)
    assert.equal(typeof source, 'string')
    assert.notEqual(source.length, 0)
  }
})
