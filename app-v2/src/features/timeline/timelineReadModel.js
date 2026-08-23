import { freezeClone } from '../../data/adapterUtils.js'
import { normalizeTimelineMemories } from './memoryNormalizer.js'
import {
  buildTimelineChapters,
  buildTimelineFilters,
  buildTimelineSummary,
  formatTimelineDate,
  selectTimelineDisplayDescription,
  selectTimelineDisplayTitle,
  selectTimelineTypeLabel,
} from './memorySelectors.js'

function createEmptySnapshot() {
  return {
    status: 'empty',
    sources: {},
    warnings: [],
  }
}

function buildSourceStatus(memorySource) {
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
    deferred: [
      {
        key: 'autoscan',
        status: 'deferred',
        source: 'local dev server: /api/scan-media',
        summary: 'Filename-derived autoscan entries remain outside app-v2 until a safer private media inventory boundary exists.',
      },
      {
        key: 'fallback-seed',
        status: 'deferred',
        source: 'core/state.js fallback seed',
        summary: 'The old seeded fallback memory stays excluded from the routed shell.',
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

export function buildTimelineReadModel({ compatibilitySnapshot = null } = {}) {
  const snapshot = compatibilitySnapshot || createEmptySnapshot()
  const memorySource = snapshot.sources?.memories || {
    status: 'empty',
    source: 'legacy-local-dev',
    data: null,
    warnings: [],
  }
  const normalizedMemories = normalizeTimelineMemories(memorySource?.data?.memories || [])
  const archivedMemories = normalizedMemories
    .filter((memory) => memory.status === 'archived')
    .map((memory) => ({
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
    }))

  return freezeClone({
    status: deriveTimelineStatus(memorySource, normalizedMemories),
    summary: buildTimelineSummary(normalizedMemories),
    featured: null,
    chapters: buildTimelineChapters(normalizedMemories),
    archivedMemories,
    filters: buildTimelineFilters(normalizedMemories),
    sourceStatus: buildSourceStatus(memorySource),
    warnings: Array.isArray(memorySource?.warnings) ? [...memorySource.warnings] : [],
  })
}
