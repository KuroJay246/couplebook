import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('timeline route uses the read-only feature hook and story view', async () => {
  const timelinePageSource = await readSource('../pages/TimelinePage.jsx')
  const timelineHookSource = await readSource('../features/timeline/useTimelineData.js')
  const timelineViewSource = await readSource('../features/timeline/TimelineView.jsx')
  const storyPreviewHookSource = await readSource('../features/timeline/useTrustedStoryPreviews.js')

  assert.match(timelinePageSource, /useTimelineData/)
  assert.match(timelineHookSource, /useMemorySource/)
  assert.match(timelineHookSource, /useMediaIndexSource/)
  assert.doesNotMatch(timelineHookSource, /useCompatibilityData/)
  assert.match(timelineHookSource, /sourceWithWarning/)
  assert.match(timelineHookSource, /memorySource/)
  assert.match(timelineHookSource, /mediaIndexSource/)
  assert.match(timelinePageSource, /TimelineView/)
  assert.doesNotMatch(timelinePageSource, /PlaceholderPage/)
  assert.match(timelineViewSource, /useTrustedStoryPreviews/)
  assert.match(storyPreviewHookSource, /fetchMediaBlobViaTrustedBackend/)
  assert.match(storyPreviewHookSource, /createObjectUrlRegistry/)
  assert.match(storyPreviewHookSource, /objectUrlsRef\.current\.create/)
  assert.match(storyPreviewHookSource, /objectUrlsRef\.current\.revokeAll/)
  assert.match(storyPreviewHookSource, /mode: isVideo \? 'stream' : 'thumbnail'/)
  assert.match(storyPreviewHookSource, /Video playback is unavailable right now/)
  assert.match(timelineViewSource, /poster=\{posterUrl\}/)
  assert.match(timelineViewSource, /onLoadRequest=\{isVideo \? onLoadStream : undefined\}/)
  assert.match(timelineViewSource, /streamStatus/)
  assert.match(timelineViewSource, /Our Story/)
  assert.match(timelineViewSource, /Search and reopen the memories that still shape your story\./)
  assert.match(timelineViewSource, /PageHeader/)
  assert.match(timelineViewSource, /SegmentedControl/)
  assert.match(timelineViewSource, /ContextMenu/)
  assert.match(timelineViewSource, /View memory/)
  assert.match(timelineViewSource, /Browse by tag/)
  assert.match(timelineViewSource, /Search memories/)
  assert.match(timelineViewSource, /Clear filters/)
  assert.match(timelineViewSource, /Archived memories/)
  assert.match(timelineViewSource, /Restore memory/)
  assert.match(timelineViewSource, /Story needs a retry/)
})

test('timeline view avoids static route dependencies and direct Storage calls', async () => {
  const timelineViewSource = await readSource('../features/timeline/TimelineView.jsx')

  assert.doesNotMatch(timelineViewSource, /createObjectURL|fetch\(|getDownloadURL|uploadBytes|firebase\/storage/)
  assert.doesNotMatch(timelineViewSource, /pages\/timeline\.html|legacy\.html|pageUrl|mediaPath/)
  assert.doesNotMatch(timelineViewSource, /localStorage|memorybook_|legacyMemoryAdapter|internal warnings/)
  assert.doesNotMatch(timelineViewSource, /\bsetItem\s*\(|\bupdateDoc\s*\(|\baddDoc\s*\(|\bdeleteDoc\s*\(/)
})
