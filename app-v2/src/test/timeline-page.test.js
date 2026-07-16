import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('timeline route uses the read-only feature hook and story view', async () => {
  const timelinePageSource = await readSource('../pages/TimelinePage.jsx')
  const timelineViewSource = await readSource('../features/timeline/TimelineView.jsx')

  assert.match(timelinePageSource, /useTimelineData/)
  assert.match(timelinePageSource, /TimelineView/)
  assert.doesNotMatch(timelinePageSource, /PlaceholderPage/)
  assert.match(timelineViewSource, /Our story timeline/)
  assert.match(timelineViewSource, /Read the story by chapter\./)
  assert.match(timelineViewSource, /Special moments/)
  assert.match(timelineViewSource, /Show less/)
  assert.match(timelineViewSource, /The private story bridge is unavailable here\./)
})

test('timeline view keeps media private and avoids static route dependencies', async () => {
  const timelineViewSource = await readSource('../features/timeline/TimelineView.jsx')

  assert.doesNotMatch(timelineViewSource, /<img|<video|createObjectURL|fetch\(|getDownloadURL|uploadBytes|firebase\/storage/)
  assert.doesNotMatch(timelineViewSource, /pages\/timeline\.html|legacy\.html|pageUrl|mediaPath/)
  assert.doesNotMatch(timelineViewSource, /localStorage|memorybook_|legacyMemoryAdapter|internal warnings/)
  assert.doesNotMatch(timelineViewSource, /\bsetItem\s*\(|\bupdateDoc\s*\(|\baddDoc\s*\(|\bdeleteDoc\s*\(/)
})
