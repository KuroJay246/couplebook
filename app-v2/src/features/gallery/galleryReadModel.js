import { freezeClone } from '../../data/adapterUtils.js'
import { normalizeTimelineMemories } from '../memories/memoryNormalizer.js'
import { buildGalleryCollections, buildGalleryFilters, buildGallerySummary, buildMediaLibrary, selectGalleryItems, selectMediaIndexGalleryItems } from './gallerySelectors.js'

const EMPTY_MEMORY_SOURCE = Object.freeze({
  status: 'empty',
  source: 'legacy-local-dev',
  data: null,
  warnings: [],
})

const EMPTY_MEDIA_INDEX_SOURCE = Object.freeze({
  status: 'empty',
  source: 'firestore',
  data: null,
  warnings: [],
})

function deriveGalleryStatus(memorySource, mediaIndexSource, items) {
  if (mediaIndexSource?.status === 'invalid') return 'invalid'
  if (memorySource?.status === 'invalid') return 'invalid'
  if (items.length > 0 && mediaIndexSource?.status === 'ready') return 'ready'
  if (memorySource?.status === 'unavailable') return items.length > 0 ? 'partial' : 'unavailable'
  if (memorySource?.status === 'empty') return items.length > 0 ? 'partial' : 'empty'
  if (items.length === 0) return 'empty'
  if (memorySource?.data?.hasBaseDataset !== true) return 'partial'
  return 'ready'
}

function buildSourceStatus(memorySource, mediaIndexSource, indexedItems) {
  const totalMemories = Array.isArray(memorySource?.data?.memories) ? memorySource.data.memories.length : 0
  const hasBaseDataset = memorySource?.data?.hasBaseDataset === true

  return freezeClone({
    memoryArchive: {
      status: hasBaseDataset ? 'ready' : memorySource?.status === 'unavailable' ? 'unavailable' : 'empty',
      count: totalMemories,
      label: 'Private story archive',
    },
    mediaInventory: {
      status: mediaIndexSource?.status || 'empty',
      count: indexedItems.length,
      label: 'Firestore media index',
      warningCount: Array.isArray(mediaIndexSource?.warnings) ? mediaIndexSource.warnings.length : 0,
      warnings: Array.isArray(mediaIndexSource?.warnings) ? mediaIndexSource.warnings : [],
    },
    bridge: {
      status: memorySource?.status || 'empty',
      warningCount: Array.isArray(memorySource?.warnings) ? memorySource.warnings.length : 0,
    },
  })
}

export function buildGalleryReadModel({ compatibilitySnapshot = null, memorySource = null } = {}) {
  return buildGalleryReadModelWithMediaIndex({ compatibilitySnapshot, memorySource })
}

export function buildGalleryReadModelWithMediaIndex({ compatibilitySnapshot = null, memorySource = null, mediaIndexSource = null } = {}) {
  const resolvedMemorySource = memorySource || compatibilitySnapshot?.sources?.memories || EMPTY_MEMORY_SOURCE
  const resolvedMediaIndexSource = mediaIndexSource || compatibilitySnapshot?.sources?.mediaIndex || EMPTY_MEDIA_INDEX_SOURCE
  const normalizedMemories = normalizeTimelineMemories(resolvedMemorySource?.data?.memories || [])
  const memoryItems = selectGalleryItems(normalizedMemories)
  const indexedItems = selectMediaIndexGalleryItems(resolvedMediaIndexSource?.data?.entries || [])
  const items = freezeClone([...indexedItems, ...memoryItems])
  const photos = items.filter((item) => item.media.kind === 'image')
  const videos = items.filter((item) => item.media.kind === 'video')
  const unavailableMedia = items.filter((item) =>
    ['private-legacy-reference', 'unavailable', 'invalid'].includes(item.media.status),
  )
  const verifiedMedia = items.filter((item) => ['storage-verified', 'drive-verified', 'drive-indexed'].includes(item.media.status))

  return freezeClone({
    status: deriveGalleryStatus(resolvedMemorySource, resolvedMediaIndexSource, items),
    items,
    memoryItems,
    indexedItems,
    library: buildMediaLibrary(items),
    summary: buildGallerySummary(items),
    collections: buildGalleryCollections(items),
    photos,
    videos,
    verifiedMedia,
    unavailableMedia,
    filters: buildGalleryFilters(items),
    sourceStatus: buildSourceStatus(resolvedMemorySource, resolvedMediaIndexSource, indexedItems),
    warnings: [
      ...(Array.isArray(resolvedMemorySource?.warnings) ? resolvedMemorySource.warnings : []),
      ...(Array.isArray(resolvedMediaIndexSource?.warnings) ? resolvedMediaIndexSource.warnings : []),
    ],
  })
}
