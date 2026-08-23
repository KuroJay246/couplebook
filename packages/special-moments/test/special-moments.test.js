import test from 'node:test'
import assert from 'node:assert/strict'

import { isSpecialMomentKey, SPECIAL_MOMENT_KEYS, SPECIAL_MOMENT_ROUTES } from '../src/index.js'

test('special moment contracts expose approved keys and routes only', () => {
  assert.deepEqual(SPECIAL_MOMENT_KEYS, ['birthday', 'valentine', 'confession'])
  assert.equal(SPECIAL_MOMENT_ROUTES.birthday, '/birthday')
  assert.equal(isSpecialMomentKey('confession'), true)
  assert.equal(isSpecialMomentKey('anniversary'), false)
})
