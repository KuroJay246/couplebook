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
  assert.match(timelineViewSource, /Our Story/)
  assert.match(timelineViewSource, /Search and reopen the memories that still shape your story\./)
  assert.match(timelineViewSource, /timeline-line/)
  assert.match(timelineViewSource, /timeline-card/)
  assert.match(timelineViewSource, /View memory/)
  assert.match(timelineViewSource, /Browse by tag/)
  assert.match(timelineViewSource, /Search memories/)
  assert.match(timelineViewSource, /Clear filters/)
})

test('timeline view avoids static route dependencies and direct Storage calls', async () => {
  const timelineViewSource = await readSource('../features/timeline/TimelineView.jsx')

  assert.doesNotMatch(timelineViewSource, /createObjectURL|fetch\(|getDownloadURL|uploadBytes|firebase\/storage/)
  assert.doesNotMatch(timelineViewSource, /pages\/timeline\.html|legacy\.html|pageUrl|mediaPath/)
  assert.doesNotMatch(timelineViewSource, /localStorage|memorybook_|legacyMemoryAdapter|internal warnings/)
  assert.doesNotMatch(timelineViewSource, /\bsetItem\s*\(|\bupdateDoc\s*\(|\baddDoc\s*\(|\bdeleteDoc\s*\(/)
})
