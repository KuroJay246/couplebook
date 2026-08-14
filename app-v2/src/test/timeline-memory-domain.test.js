import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeLegacyMemorySources } from '../features/timeline/memorySourceMerge.js'
import { legacySpecialMomentRoutes, normalizeTimelineMemories } from '../features/timeline/memoryNormalizer.js'
import {
  buildTimelineChapters,
  buildTimelineFilters,
  buildTimelineSummary,
  formatTimelineDate,
  selectTimelineDisplayDescription,
  selectTimelineDisplayMemories,
  selectTimelineDisplayTitle,
} from '../features/timeline/memorySelectors.js'

function createLegacyMemoryRecord(overrides = {}) {
  return {
    id: 'timeline-memory-001',
    title: 'Fictional Chapter',
    description: 'A fictional memory used only for read-model coverage.',
    dateLabel: '2026-02-14T10:30:00.000Z',
    tags: ['fictional', 'story'],
    mediaKind: 'image',
    mediaPath: '/assets/photos/fictional-chapter.jpg',
    isSpecialPage: false,
    pageUrl: null,
    source: 'static-json',
    unknownFields: {},
    ...overrides,
  }
}

test('memory source merge preserves verified legacy precedence, ignores missing overrides, and keeps inputs immutable', () => {
  const baseMemories = [
    createLegacyMemoryRecord({
      id: 'base-1',
      title: 'First fictional chapter',
      dateLabel: '2026-02-14T10:30:00.000Z',
    }),
    createLegacyMemoryRecord({
      id: 'base-2',
      title: 'Second fictional chapter',
      dateLabel: '2026-02-13T10:30:00.000Z',
    }),
  ]
  const customMemories = [
    createLegacyMemoryRecord({
      id: 'custom-1',
      title: 'Custom fictional chapter',
      dateLabel: '2026-02-15T10:30:00.000Z',
      source: 'local-custom',
    }),
    createLegacyMemoryRecord({
      id: 'base-1',
      title: 'Duplicate custom id',
      dateLabel: '2026-02-12T10:30:00.000Z',
      source: 'local-custom',
    }),
  ]
  const overrides = {
    'base-2': {
      title: 'Overridden fictional chapter',
      dateLabel: '2026-02-16T10:30:00.000Z',
    },
    missing: {
      title: 'Ignored override',
    },
  }
  const deletedIds = ['base-1']
  const before = JSON.stringify({ baseMemories, customMemories, overrides, deletedIds })

  const merged = mergeLegacyMemorySources({
    baseMemories,
    customMemories,
    deletedIds,
    overrides,
  })

  assert.deepEqual(
    merged.map((memory) => [memory.id, memory.title, memory.source]),
    [
      ['base-2', 'Overridden fictional chapter', 'local-override'],
      ['custom-1', 'Custom fictional chapter', 'local-custom'],
    ],
  )
  assert.equal(JSON.stringify({ baseMemories, customMemories, overrides, deletedIds }), before)
})

test('timeline normalization keeps title, description, tags, dates, media, and special routes deterministic', () => {
  const normalized = normalizeTimelineMemories([
    createLegacyMemoryRecord({
      id: 'generated-photo',
      title: 'Photo from 2026-02-14T10:30:00.000Z',
      description: 'A beautiful shared moment captured on February 14.',
      tags: [' Love ', 'love', 'Photo'],
      mediaPath: '/assets/photos/generated-photo.jpg',
      dateLabel: '2026-02-14T10:30:00.000Z',
    }),
    createLegacyMemoryRecord({
      id: 'generated-video',
      title: 'Video Clip 0214',
      description: '',
      tags: ['video', ' video '],
      mediaKind: 'video',
      mediaPath: '/assets/videos/generated-video.mp4',
      dateLabel: '2026-02-14',
    }),
    createLegacyMemoryRecord({
      id: 'special-memory',
      title: 'Fictional confession page',
      description: 'A fictional special-route entry.',
      mediaKind: 'unknown',
      mediaPath: '',
      isSpecialPage: true,
      pageUrl: 'confession/index.html',
    }),
    createLegacyMemoryRecord({
      id: 'invalid-path',
      title: 'Fictional private file path',
      description: 'A fictional path quarantine check.',
      mediaPath: 'C:\\Users\\Jaylan\\Pictures\\private-file.png',
    }),
    createLegacyMemoryRecord({
      id: 'invalid-date',
      title: 'Undated fictional note',
      description: 'A fictional invalid-date entry.',
      dateLabel: 'not-a-date',
      mediaPath: '',
    }),
  ])

  const generatedPhoto = normalized[0]
  const generatedVideo = normalized[1]
  const specialMemory = normalized[2]
  const invalidPath = normalized[3]
  const invalidDate = normalized[4]

  assert.equal(selectTimelineDisplayTitle(generatedPhoto), 'A photo from February 14, 2026')
  assert.equal(selectTimelineDisplayTitle(generatedVideo), 'A video memory from February 14, 2026')
  assert.equal(selectTimelineDisplayDescription(generatedPhoto), 'A moment preserved in the legacy book.')
  assert.deepEqual(
    generatedPhoto.tags.map((tag) => `${tag.key}:${tag.label}`),
    ['love:Love', 'photo:Photo'],
  )
  assert.equal(generatedVideo.date.precision, 'date-only')
  assert.equal(formatTimelineDate(generatedVideo.date), 'February 14, 2026')
  assert.equal(specialMemory.specialMoment.route, legacySpecialMomentRoutes['confession/index.html'])
  assert.equal(specialMemory.media.status, 'special-route-only')
  assert.equal(invalidPath.media.status, 'invalid-reference')
  assert.doesNotMatch(JSON.stringify(invalidPath), /C:\\Users\\Jaylan\\Pictures/i)
  assert.equal(invalidDate.date.status, 'invalid')
})

test('timeline normalization accepts Firestore memory records that provide date instead of dateLabel', () => {
  const [firestoreMemory] = normalizeTimelineMemories([
    createLegacyMemoryRecord({
      id: 'firestore-shaped-memory',
      dateLabel: '',
      date: '2026-07-23',
      mediaPath: '',
      tags: ['Acceptance'],
    }),
  ])

  assert.equal(firestoreMemory.date.status, 'valid')
  assert.equal(firestoreMemory.date.year, 2026)
  assert.equal(formatTimelineDate(firestoreMemory.date), 'July 23, 2026')
})

test('timeline normalization preserves Firestore private media references for gallery and timeline counts', () => {
  const normalized = normalizeTimelineMemories([
    createLegacyMemoryRecord({
      id: 'firestore-photo',
      title: 'Photo from 2026-07-21',
      dateLabel: '',
      date: '2026-07-21',
      mediaPath: '',
      mediaKind: '',
      mediaState: 'private-legacy-reference',
      isVideo: false,
    }),
    createLegacyMemoryRecord({
      id: 'firestore-video',
      title: 'Video Clip 0722',
      dateLabel: '',
      date: '2026-07-22',
      mediaPath: '',
      mediaKind: '',
      mediaState: 'private-legacy-reference',
    }),
  ])

  const summary = buildTimelineSummary(normalized)

  assert.equal(normalized[0].media.status, 'private-legacy-reference')
  assert.equal(normalized[0].media.kind, 'image')
  assert.equal(normalized[1].media.status, 'private-legacy-reference')
  assert.equal(normalized[1].media.kind, 'video')
  assert.equal(summary.photoMemories, 1)
  assert.equal(summary.videoMemories, 1)
  assert.equal(summary.unavailableMedia, 2)
})

test('timeline selectors build stable summary, filter metadata, and year/special chapter structure without emotional labels', () => {
  const normalized = normalizeTimelineMemories([
    createLegacyMemoryRecord({
      id: 'regular-newest',
      title: 'Fictional newest chapter',
      dateLabel: '2026-05-10T12:00:00.000Z',
      tags: ['Story', 'Quiet'],
    }),
    createLegacyMemoryRecord({
      id: 'regular-middle',
      title: 'Fictional middle chapter',
      dateLabel: '2026-04-02T12:00:00.000Z',
      tags: ['Quiet'],
      mediaPath: '',
    }),
    createLegacyMemoryRecord({
      id: 'special-2026',
      title: 'Fictional valentine chapter',
      dateLabel: '2026-02-14',
      isSpecialPage: true,
      pageUrl: 'valentine/index.html',
      mediaPath: '',
      tags: ['Special'],
    }),
    createLegacyMemoryRecord({
      id: 'regular-2025',
      title: 'Fictional prior year chapter',
      dateLabel: '2025-12-28',
      tags: ['Story'],
    }),
    createLegacyMemoryRecord({
      id: 'undated',
      title: 'Fictional undated chapter',
      dateLabel: 'not-a-date',
      mediaPath: '',
      tags: ['Quiet'],
    }),
  ])

  const summary = buildTimelineSummary(normalized)
  const filters = buildTimelineFilters(normalized)
  const chapters = buildTimelineChapters(normalized)
  const displayMemories = selectTimelineDisplayMemories(normalized)

  assert.equal(summary.totalMemories, 5)
  assert.equal(summary.datedMemories, 4)
  assert.equal(summary.undatedMemories, 1)
  assert.equal(summary.specialMoments, 1)
  assert.equal(summary.unavailableMedia, 2)
  assert.equal(summary.photoMemories, 2)
  assert.equal(summary.videoMemories, 0)
  assert.deepEqual(
    filters.availableTags.map((tag) => `${tag.key}:${tag.count}`),
    ['quiet:3', 'special:1', 'story:2'],
  )
  assert.deepEqual(
    filters.availableYears.map((year) => `${year.key}:${year.count}`),
    ['2026:3', '2025:1'],
  )
  assert.ok(filters.availableTypes.some((type) => type.key === 'special'))
  assert.equal(displayMemories[0].id, 'regular-newest')
  assert.equal(chapters[0].label, '2026')
  assert.equal(chapters[0].groups[0].label, 'Special moments')
  assert.equal(chapters[0].groups[1].label, 'Everyday memories')
  assert.equal(chapters[1].label, '2025')
  assert.equal(chapters[2].label, 'Undated memories')
  assert.doesNotMatch(JSON.stringify(chapters), /happiest|deeper|changed/i)
})

test('timeline selectors exclude archived memories from active story views', () => {
  const normalized = normalizeTimelineMemories([
    createLegacyMemoryRecord({
      id: 'active-memory',
      title: 'Fictional active chapter',
      dateLabel: '2026-05-10',
      tags: ['Story'],
      status: 'active',
    }),
    createLegacyMemoryRecord({
      id: 'archived-memory',
      title: 'Fictional archived chapter',
      dateLabel: '2026-05-11',
      tags: ['Hidden'],
      status: 'archived',
    }),
  ])

  const summary = buildTimelineSummary(normalized)
  const filters = buildTimelineFilters(normalized)
  const chapters = buildTimelineChapters(normalized)
  const displayMemories = selectTimelineDisplayMemories(normalized)

  assert.equal(normalized[1].status, 'archived')
  assert.equal(summary.totalMemories, 1)
  assert.deepEqual(displayMemories.map((memory) => memory.id), ['active-memory'])
  assert.deepEqual(filters.availableTags.map((tag) => tag.key), ['story'])
  assert.doesNotMatch(JSON.stringify(chapters), /archived-memory|Fictional archived chapter|Hidden/)
})
