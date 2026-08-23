import test from 'node:test'
import assert from 'node:assert/strict'

import { MEDIA_KINDS, MEDIA_REFERENCE_STATUSES } from '../src/index.js'

test('media models keep approved kinds and shared reference states explicit', () => {
  assert.deepEqual(MEDIA_KINDS, ['image', 'video', 'audio'])
  assert.equal(MEDIA_REFERENCE_STATUSES.includes('mapped'), true)
  assert.equal(MEDIA_REFERENCE_STATUSES.includes('deleted'), false)
})
