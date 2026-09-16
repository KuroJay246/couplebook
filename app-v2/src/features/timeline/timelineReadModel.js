import { freezeClone } from '../../data/adapterUtils.js'
import { normalizeTimelineMemories } from '../memories/memoryNormalizer.js'
import {
  buildTimelineChapters,
  buildTimelineFilters,
  buildTimelineSummary,
  formatTimelineDate,
  selectTimelineDisplayDescription,
  selectTimelineDisplayTitle,
  selectTimelineTypeLabel,
} from '../memories/memorySelectors.js'
import { selectMediaIndexGalleryItems } from '../gallery/gallerySelectors.js'

function createEmptySnapshot() {
  return {
    status: 'empty',
    sources: {},
    warnings: [],
  }
}

function buildSourceStatus(memorySource, mediaIndexSource, linkedMediaCount) {
  const hasBaseDataset = memorySource?.data?.hasBaseDataset === true
  const totalMemories = Array.isArray(memorySource?.data?.memories) ? memorySource.data.memories.length : 0
  const customCount = memorySource?.data?.customMemoryCount || 0
  const overrideCount = memorySource?.data?.overriddenMemoryCount || 0
  const deletionCount = memorySource?.data?.deletedMemoryCount || 0
  const visibleBaseCount = hasBaseDataset ? Math.max(0, totalMemories - customCount) : 0

  return freezeClone({
    base: {
      status: hasBaseDataset ? 'ready' : memorySource?.status === 'unavailable' ? 'unavailable' : 'empty',
      count: visibleBaseCount,
      source: 'legacy local bridge dataset',
    },
    custom: {
      status: customCount > 0 ? 'ready' : 'empty',
      count: customCount,
      source: 'localStorage: memorybook_custom_memories',
    },
    overrides: {
      status: overrideCount > 0 ? 'ready' : 'empty',
      count: overrideCount,
      source: 'localStorage: memorybook_overridden_memories',
    },
    deletions: {
      status: deletionCount > 0 ? 'ready' : 'empty',
      count: deletionCount,
      source: 'localStorage: memorybook_deleted_memories',
    },
    bridge: {
      status: memorySource?.status || 'empty',
      hasBaseDataset,
      source: memorySource?.source || 'unknown',
      warningCount: Array.isArray(memorySource?.warnings) ? memorySource.warnings.length : 0,
    },
    mediaIndex: {
      status: mediaIndexSource?.status || 'empty',
      linkedCount: linkedMediaCount,
      source: mediaIndexSource?.source || 'unknown',
      warningCount: Array.isArray(mediaIndexSource?.warnings) ? mediaIndexSource.warnings.length : 0,
    },
    deferred: [
      {
        key: 'autoscan',
        status: 'deferred',
        source: 'local dev server: /api/scan-media',
        summary: 'Filename-derived autoscan entries remain outside the private story until a safer media inventory boundary exists.',
      },
      {
        key: 'fallback-seed',
        status: 'deferred',
        source: 'core/state.js fallback seed',
        summary: 'A saved memory is being kept out until it can be shown safely.',
      },
    ],
  })
}

function deriveTimelineStatus(memorySource, normalizedMemories) {
  if (memorySource?.status === 'invalid') return 'invalid'
  if (memorySource?.status === 'unavailable') {
    return normalizedMemories.length > 0 ? 'partial' : 'unavailable'
  }

  if (memorySource?.status === 'empty') {
    return normalizedMemories.length > 0 ? 'partial' : 'empty'
  }

  if (normalizedMemories.length === 0) return 'empty'

  if (memorySource?.data?.hasBaseDataset !== true) {
    return 'partial'
  }

  const hasQuarantinedRoutes = normalizedMemories.some((memory) => {
    return memory.specialMoment.isSpecial && memory.specialMoment.routeStatus !== 'verified'
  })

  return hasQuarantinedRoutes ? 'partial' : 'ready'
}

const EMPTY_MEMORY_SOURCE = Object.freeze({
  status: 'empty',
  source: 'memory-domain',
  data: null,
  warnings: [],
})

const EMPTY_MEDIA_INDEX_SOURCE = Object.freeze({
  status: 'empty',
  source: 'firestore',
  data: null,
  warnings: [],
})

function enrichMemoriesWithIndexedMedia(memories, indexedItems) {
  const byMemoryId = new Map()
  for (const item of indexedItems) {
    const memoryId = item?.memoryId || item?.media?.linkedMemoryId || ''
    if (memoryId && !byMemoryId.has(memoryId)) byMemoryId.set(memoryId, item)
  }

  let linkedMediaCount = 0
  const enrichedMemories = memories.map((memory) => {
    const indexedItem = byMemoryId.get(memory.id)
    if (!indexedItem?.media) return memory
    linkedMediaCount += 1
    return {
      ...memory,
      media: {
        ...memory.media,
        ...indexedItem.media,
        linkedMemoryId: indexedItem.memoryId || memory.id,
        status: 'drive-indexed',
      },
      mediaIndexId: indexedItem.mediaIndexId || indexedItem.media?.id || '',
    }
  })

  return { enrichedMemories, linkedMediaCount }
}

export function buildTimelineReadModel({ compatibilitySnapshot = null, memorySource = null, mediaIndexSource = null } = {}) {
  const snapshot = compatibilitySnapshot || createEmptySnapshot()
  const resolvedMemorySource = memorySource || snapshot.sources?.memories || EMPTY_MEMORY_SOURCE
  const resolvedMediaIndexSource = mediaIndexSource || snapshot.sources?.mediaIndex || EMPTY_MEDIA_INDEX_SOURCE
  const normalizedMemories = normalizeTimelineMemories(resolvedMemorySource?.data?.memories || [])
  const indexedItems = selectMediaIndexGalleryItems(resolvedMediaIndexSource?.data?.entries || [])
  const { enrichedMemories, linkedMediaCount } = enrichMemoriesWithIndexedMedia(normalizedMemories, indexedItems)
  const archivedMemories = normalizedMemories.flatMap((memory) => (memory.status === 'archived' ? [{
      id: memory.id,
      status: memory.status,
      revision: memory.revision,
      displayTitle: selectTimelineDisplayTitle(memory),
      displayDescription: selectTimelineDisplayDescription(memory),
      displayDate: formatTimelineDate(memory.date),
      typeLabel: selectTimelineTypeLabel(memory),
      media: memory.media,
      specialMoment: memory.specialMoment,
      tags: memory.tags,
      date: memory.date,
      sort: memory.sort,
    }] : []))

  return freezeClone({
    status: deriveTimelineStatus(resolvedMemorySource, normalizedMemories),
    summary: buildTimelineSummary(enrichedMemories),
    featured: null,
    chapters: buildTimelineChapters(enrichedMemories),
    archivedMemories,
    filters: buildTimelineFilters(enrichedMemories),
    sourceStatus: buildSourceStatus(resolvedMemorySource, resolvedMediaIndexSource, linkedMediaCount),
    warnings: [
      ...(Array.isArray(resolvedMemorySource?.warnings) ? resolvedMemorySource.warnings : []),
      ...(Array.isArray(resolvedMediaIndexSource?.warnings) ? resolvedMediaIndexSource.warnings : []),
    ],
  })
}
