import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { specialMomentConfig } from '../features/specialMoments/specialMomentConfig.js'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('special moment config stays non-sensitive and pending', () => {
  assert.deepEqual(
    Object.values(specialMomentConfig).map((entry) => ({
      route: entry.route,
      migrationState: entry.migrationState,
      accent: entry.accent,
    })),
    [
      { route: '/birthday', migrationState: 'pending', accent: 'gold' },
      { route: '/valentine', migrationState: 'pending', accent: 'rose' },
      { route: '/confession', migrationState: 'pending', accent: 'oxblood' },
    ],
  )

  const serialized = JSON.stringify(specialMomentConfig)
  assert.doesNotMatch(serialized, /jaylan|omia|spencer|private message|real letter|birthday content|confession content|\.html|assets\/|OUR MEMORIES/i)
})

test('special routes use the shared protected frame instead of placeholders', async () => {
  const birthdayPageSource = await readSource('../pages/BirthdayPage.jsx')
  const valentinePageSource = await readSource('../pages/ValentinePage.jsx')
  const confessionPageSource = await readSource('../pages/ConfessionPage.jsx')
  const frameSource = await readSource('../features/specialMoments/SpecialMomentFrame.jsx')

  for (const source of [birthdayPageSource, valentinePageSource, confessionPageSource]) {
    assert.match(source, /SpecialMomentFrame/)
    assert.doesNotMatch(source, /PlaceholderPage/)
  }

  assert.match(frameSource, /Content migration pending/)
  assert.match(frameSource, /Open timeline/)
  assert.match(frameSource, /Open gallery/)
  assert.match(frameSource, /Return to the shared book/)
  assert.doesNotMatch(frameSource, /<img|<video|<audio|autoplay|confetti|heart|legacy\.html|pages\/confession|pages\/valentine|omnia-happy-birthday/)
  assert.doesNotMatch(frameSource, /\bsetItem\s*\(|\bupdateDoc\s*\(|\baddDoc\s*\(|\bdeleteDoc\s*\(/)
})
