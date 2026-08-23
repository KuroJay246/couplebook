import test from 'node:test'
import assert from 'node:assert/strict'

import { isOneOf, normalizeStringArray, toTrimmedString } from '../src/index.js'

test('validation helpers normalize strings and basic enum checks safely', () => {
  assert.equal(toTrimmedString('  hello  '), 'hello')
  assert.deepEqual(normalizeStringArray([' one ', '', 'two']), ['one', 'two'])
  assert.equal(isOneOf('Moonlit', ['moonlit', 'paper-hearts']), true)
})
