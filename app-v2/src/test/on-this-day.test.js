import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeTimelineMemories } from '../features/timeline/memoryNormalizer.js'
import { selectTimelineDisplayMemories } from '../features/timeline/memorySelectors.js'
import { selectOnThisDayMemory } from '../features/timeline/onThisDay.js'

function display(records) {
  return selectTimelineDisplayMemories(normalizeTimelineMemories(records))
}

test('On This Day selects active prior-year month and day matches only', () => {
  const selected = selectOnThisDayMemory(display([
    { id: 'current', title: 'Today now', date: '2026-08-14', status: 'active' },
    { id: 'archived', title: 'Archived today', date: '2024-08-14', status: 'archived' },
    { id: 'older', title: 'Older today', date: '2023-08-14', status: 'active' },
    { id: 'recent', title: 'Recent today', date: '2025-08-14', status: 'active' },
    { id: 'other', title: 'Other day', date: '2025-08-13', status: 'active' },
  ]), new Date(Date.UTC(2026, 7, 14)))

  assert.equal(selected.id, 'recent')
})

test('On This Day handles leap-day memories on February 28 in non-leap years', () => {
  const selected = selectOnThisDayMemory(display([
    { id: 'leap', title: 'Leap day', date: '2024-02-29', status: 'active' },
  ]), new Date(Date.UTC(2026, 1, 28)))

  assert.equal(selected.id, 'leap')
})

test('On This Day returns null without invented content', () => {
  const selected = selectOnThisDayMemory(display([
    { id: 'future', title: 'Future same day', date: '2027-08-14', status: 'active' },
  ]), new Date(Date.UTC(2026, 7, 14)))

  assert.equal(selected, null)
})
