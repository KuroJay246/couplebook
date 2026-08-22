import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  DEFAULT_THEME_ID,
  findTheme,
  isSupportedThemeInput,
  normalizeThemeId,
  THEME_REGISTRY,
  THEME_STORAGE_KEY,
} from '../theme/themeRegistry.js'

test('theme registry exposes the supported Couple Book themes and safe fallback behavior', () => {
  assert.equal(DEFAULT_THEME_ID, 'midnight-rose')
  assert.deepEqual(
    THEME_REGISTRY.map((theme) => theme.id),
    ['midnight-rose', 'paper-hearts', 'moonlit'],
  )
  assert.equal(normalizeThemeId('paper-hearts'), 'paper-hearts')
  assert.equal(normalizeThemeId('dark'), 'midnight-rose')
  assert.equal(normalizeThemeId('sunset'), 'moonlit')
  assert.equal(normalizeThemeId('unknown-theme'), 'midnight-rose')
  assert.equal(isSupportedThemeInput('moonlit'), true)
  assert.equal(isSupportedThemeInput('olive'), true)
  assert.equal(isSupportedThemeInput('neon'), false)
  assert.equal(findTheme('paper').name, 'Paper Hearts')
  assert.equal(findTheme('invalid-value').id, 'midnight-rose')
})

test('theme runtime sources keep personal scoped storage and root data-theme wiring explicit', async () => {
  const providerSource = await readFile(new URL('../theme/ThemeProvider.jsx', import.meta.url), 'utf8')
  const mainSource = await readFile(new URL('../main.jsx', import.meta.url), 'utf8')
  const htmlSource = await readFile(new URL('../../index.html', import.meta.url), 'utf8')

  assert.equal(THEME_STORAGE_KEY, 'couplebook:appearance-theme')
  assert.match(providerSource, /document\.documentElement\.dataset\.theme/)
  assert.match(providerSource, /getFirestorePrivateSettings/)
  assert.match(providerSource, /appearanceTheme/)
  assert.match(mainSource, /ThemeProvider/)
  assert.match(htmlSource, /couplebook:appearance-theme/)
  assert.match(htmlSource, /dataset\.theme/)
})
