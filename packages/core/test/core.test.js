import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_THEME_ID,
  findTheme,
  formatMonthDayLabel,
  isSupportedThemeInput,
  normalizeThemeId,
  PARTNER_BIRTHDAY_LABEL,
} from '../src/index.js'

test('core theme registry exposes supported shared Couple Book theme ids', () => {
  assert.equal(DEFAULT_THEME_ID, 'midnight-rose')
  assert.equal(normalizeThemeId('paper'), 'paper-hearts')
  assert.equal(isSupportedThemeInput('moonlit'), true)
  assert.equal(findTheme('olive').id, 'moonlit')
})

test('core birthday helpers preserve the September 16 fallback', () => {
  assert.equal(PARTNER_BIRTHDAY_LABEL, 'September 16')
  assert.equal(formatMonthDayLabel('2006-09-16'), 'September 16')
  assert.equal(formatMonthDayLabel('bad-date'), 'September 16')
})
