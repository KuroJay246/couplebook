import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  normalizeSpecialMomentPayload,
  readLegacySpecialMoment,
} from '../data/legacySpecialMomentAdapter.js'
import { specialMomentConfig } from '../features/specialMoments/specialMomentConfig.js'
import { buildSpecialMomentContentModel } from '../features/specialMoments/specialMomentContentModel.js'

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
      { route: '/birthday', migrationState: 'runtime content', accent: 'gold' },
      { route: '/valentine', migrationState: 'runtime content', accent: 'rose' },
      { route: '/confession', migrationState: 'runtime content', accent: 'oxblood' },
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
  const hookSource = await readSource('../features/specialMoments/useSpecialMomentContent.js')
  const adapterSource = await readSource('../data/legacySpecialMomentAdapter.js')
  const styleSource = await readSource('../styles/faithful-react.css')

  for (const source of [birthdayPageSource, valentinePageSource, confessionPageSource]) {
    assert.match(source, /SpecialMomentFrame/)
    assert.doesNotMatch(source, /PlaceholderPage/)
  }

  assert.match(frameSource, /special-page-standalone/)
  assert.match(hookSource, /useCompatibilityData/)
  assert.match(adapterSource, /VITE_ENABLE_LEGACY_LOCAL_BRIDGE/)
  assert.match(adapterSource, /\/api\/special-moment\/\$\{momentKey\}/)
  assert.match(frameSource, /Return to Dashboard/)
  assert.match(frameSource, /Open Gallery/)
  assert.match(styleSource, /special-page-standalone\s*\{\s*min-height:\s*auto;/s)
  assert.match(styleSource, /place-items:\s*start center;/)
  assert.doesNotMatch(`${frameSource}\n${hookSource}\n${adapterSource}`, /<img|<video|<audio|dangerouslySetInnerHTML|autoplay|confetti|legacy\.html/)
  assert.doesNotMatch(`${frameSource}\n${hookSource}`, /pages\/confession|pages\/valentine|omnia-happy-birthday/)
  assert.doesNotMatch(`${frameSource}\n${hookSource}\n${adapterSource}`, /\bsetItem\s*\(|\bupdateDoc\s*\(|\baddDoc\s*\(|\bdeleteDoc\s*\(|collectionGroup\(|collection\([^)]*users/)
})

test('special moment content normalizes ready, partial, empty, unavailable, and invalid states safely', () => {
  const ready = normalizeSpecialMomentPayload('birthday', {
    moment: {
      type: 'birthday',
      title: 'Fictional birthday runtime chapter',
      subtitle: 'Sanitized runtime subtitle.',
      date: '2026-06-01',
      sections: [
        { id: 'opening', kind: 'paragraph', heading: 'Opening', content: 'Sanitized paragraph.' },
        { id: 'list', kind: 'list', heading: 'List', items: ['First sanitized item', 'Second sanitized item'] },
      ],
    },
    media: {
      status: 'private-legacy-reference',
      type: 'image',
      note: 'Companion media remains private.',
    },
  })
  assert.equal(ready.status, 'ready')
  assert.equal(ready.data.content.sections.length, 2)
  assert.equal(ready.data.privacy.privateContentBundled, false)

  const partial = normalizeSpecialMomentPayload('valentine', {
    moment: {
      type: 'valentine',
      title: 'Fictional Valentine runtime chapter',
      sections: [
        { id: 'safe', kind: 'quote', heading: 'Quote', content: 'Sanitized quote.' },
        { id: 'unsafe', kind: 'paragraph', content: '<script>alert(1)</script>' },
        { id: 'unknown', kind: 'component', heading: 'Unknown', content: 'Unknown component.' },
      ],
    },
  })
  assert.equal(partial.status, 'partial')
  assert.equal(partial.data.content.sections.length, 1)
  assert.equal(partial.warnings.length > 0, true)

  const empty = normalizeSpecialMomentPayload('confession', { moment: { type: 'confession', sections: [] } })
  assert.equal(empty.status, 'empty')
  assert.equal(empty.data.content, null)

  const unavailable = normalizeSpecialMomentPayload('birthday', null)
  assert.equal(unavailable.status, 'unavailable')

  const invalid = normalizeSpecialMomentPayload('unknown', { moment: { type: 'unknown' } })
  assert.equal(invalid.status, 'invalid')
})

test('special moment bridge rejects production, non-local, traversal, and unapproved keys', async () => {
  const production = await readLegacySpecialMoment('birthday', {
    env: { VITE_ENABLE_LEGACY_LOCAL_BRIDGE: 'true', VITE_LEGACY_LOCAL_BASE_URL: 'http://127.0.0.1:3000', MODE: 'production' },
    location: new URL('http://127.0.0.1:5173/birthday'),
  })
  assert.equal(production.status, 'unavailable')

  const nonLocalRuntime = await readLegacySpecialMoment('birthday', {
    env: { VITE_ENABLE_LEGACY_LOCAL_BRIDGE: 'true', VITE_LEGACY_LOCAL_BASE_URL: 'http://127.0.0.1:3000', MODE: 'development' },
    location: new URL('https://example.com/birthday'),
  })
  assert.equal(nonLocalRuntime.status, 'unavailable')

  const nonLocalBase = await readLegacySpecialMoment('birthday', {
    env: { VITE_ENABLE_LEGACY_LOCAL_BRIDGE: 'true', VITE_LEGACY_LOCAL_BASE_URL: 'https://example.com/../../private', MODE: 'development' },
    location: new URL('http://127.0.0.1:5173/birthday'),
  })
  assert.equal(nonLocalBase.status, 'unavailable')

  const unknown = await readLegacySpecialMoment('../confession', {
    env: { VITE_ENABLE_LEGACY_LOCAL_BRIDGE: 'true', VITE_LEGACY_LOCAL_BASE_URL: 'http://127.0.0.1:3000', MODE: 'development' },
    location: new URL('http://127.0.0.1:5173/confession'),
  })
  assert.equal(unknown.status, 'invalid')
})

test('special moment content model renders runtime and unavailable states without mutating inputs', () => {
  const source = normalizeSpecialMomentPayload('confession', {
    moment: {
      type: 'confession',
      title: 'Fictional confession runtime chapter',
      sections: [{ id: 'note', kind: 'note', heading: 'Note', content: 'Sanitized note.' }],
    },
  })
  const before = JSON.stringify(source)
  const readyModel = buildSpecialMomentContentModel({ momentKey: 'confession', contentSource: source, contentState: 'ready' })
  assert.equal(readyModel.status, 'ready')
  assert.equal(readyModel.moment.title, 'Fictional confession runtime chapter')
  assert.equal(JSON.stringify(source), before)

  const unavailableModel = buildSpecialMomentContentModel({ momentKey: 'birthday', contentSource: null, contentState: 'unavailable' })
  assert.equal(unavailableModel.status, 'unavailable')
  assert.equal(unavailableModel.moment, null)
  assert.match(unavailableModel.media.note, /private/i)
})
