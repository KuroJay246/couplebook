import { freezeClone } from '../../data/adapterUtils.js'
import { normalizeTimelineMemories } from '../timeline/memoryNormalizer.js'
import { buildGalleryCollections, buildGalleryFilters, buildGallerySummary, selectGalleryItems } from './gallerySelectors.js'

function createEmptySnapshot() {
  return {
    status: 'empty',
    sources: {},
    warnings: [],
  }
}

function deriveGalleryStatus(memorySource, items) {
  if (memorySource?.status === 'invalid') return 'invalid'
  if (memorySource?.status === 'unavailable') return items.length > 0 ? 'partial' : 'unavailable'
  if (memorySource?.status === 'empty') return items.length > 0 ? 'partial' : 'empty'
  if (items.length === 0) return 'empty'
  if (memorySource?.data?.hasBaseDataset !== true) return 'partial'
  return 'ready'
}

function buildSourceStatus(memorySource) {
  const totalMemories = Array.isArray(memorySource?.data?.memories) ? memorySource.data.memories.length : 0
  const hasBaseDataset = memorySource?.data?.hasBaseDataset === true

  return freezeClone({
    memoryArchive: {
      status: hasBaseDataset ? 'ready' : memorySource?.status === 'unavailable' ? 'unavailable' : 'empty',
      count: totalMemories,
      label: 'Private story archive',
    },
    mediaInventory: {
      status: 'deferred',
      count: 0,
      label: 'Private media inventory',
    },
    bridge: {
      status: memorySource?.status || 'empty',
      warningCount: Array.isArray(memorySource?.warnings) ? memorySource.warnings.length : 0,
    },
  })
}

export function buildGalleryReadModel({ compatibilitySnapshot = null } = {}) {
  const snapshot = compatibilitySnapshot || createEmptySnapshot()
  const memorySource = snapshot.sources?.memories || {
    status: 'empty',
    source: 'legacy-local-dev',
    data: null,
    warnings: [],
  }
  const normalizedMemories = normalizeTimelineMemories(memorySource?.data?.memories || [])
  const items = selectGalleryItems(normalizedMemories)
  const photos = items.filter((item) => item.media.kind === 'image')
  const videos = items.filter((item) => item.media.kind === 'video')
  const unavailableMedia = items.filter((item) =>
    ['private-legacy-reference', 'unavailable', 'invalid'].includes(item.media.status),
  )
  const verifiedMedia = items.filter((item) => item.media.status === 'storage-verified')

  return freezeClone({
    status: deriveGalleryStatus(memorySource, items),
    items,
    summary: buildGallerySummary(items),
    collections: buildGalleryCollections(items),
    photos,
    videos,
    verifiedMedia,
    unavailableMedia,
    filters: buildGalleryFilters(items),
    sourceStatus: buildSourceStatus(memorySource),
    warnings: Array.isArray(memorySource?.warnings) ? [...memorySource.warnings] : [],
  })
}
