import { freezeClone } from '../../data/adapterUtils.js'
import { getMediaSyncArchitectureContract } from '../../services/syncService.js'
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

function buildPhysicalMediaKey(item) {
  const media = item?.media || {}
  if (media.driveFileId) return `drive:${media.driveFileId}`
  if (media.providerFileId && media.provider === 'google-drive') return `drive:${media.providerFileId}`
  if (media.storagePath) return `storage:${media.storagePath}`
  if (media.id && media.provider) return `${media.provider}:${media.id}`
  if (media.id && ['drive-indexed', 'drive-verified', 'storage-verified'].includes(media.status)) return `media:${media.id}`
  return ''
}

function reconcileGalleryItems(indexedItems, memoryItems) {
  const authoritativeKeys = new Set()
  const duplicates = []
  const items = []

  for (const item of indexedItems) {
    const key = buildPhysicalMediaKey(item)
    if (key) authoritativeKeys.add(key)
    items.push(item)
  }

  for (const item of memoryItems) {
    const key = buildPhysicalMediaKey(item)
    if (key && authoritativeKeys.has(key)) {
      duplicates.push(item)
      continue
    }
    items.push(item)
  }

  return freezeClone({
    duplicateHistoricalItems: duplicates.length,
    items,
  })
}

function buildSourceStatus(memorySource, mediaIndexSource, indexedItems, memoryItems, reconciliation) {
  const totalMemories = Array.isArray(memorySource?.data?.memories) ? memorySource.data.memories.length : 0
  const hasBaseDataset = memorySource?.data?.hasBaseDataset === true
  const memoryVisualItems = Array.isArray(memoryItems)
    ? memoryItems.filter((item) => item.media?.kind === 'image' || item.media?.kind === 'video').length
    : 0

  return freezeClone({
    memoryArchive: {
      status: hasBaseDataset ? 'ready' : memorySource?.status === 'unavailable' ? 'unavailable' : 'empty',
      count: totalMemories,
      visualCount: memoryVisualItems,
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
    reconciliation: {
      authoritativeIndexedCount: indexedItems.length,
      historicalMemoryCount: memoryItems.length,
      duplicateHistoricalItems: reconciliation.duplicateHistoricalItems,
      totalItems: reconciliation.items.length,
    },
  })
}

function buildMediaBackendStatus(coupleId = 'couple') {
  const contract = getMediaSyncArchitectureContract(coupleId)
  const capabilities = Array.isArray(contract.localHandlerCapabilities) ? contract.localHandlerCapabilities : []
  const requiredCapabilityCount = Number.isSafeInteger(contract.localHandlerCapabilityCount)
    ? contract.localHandlerCapabilityCount
    : capabilities.length
  const localHandlersReady = requiredCapabilityCount > 0 && capabilities.length === requiredCapabilityCount

  return freezeClone({
    provider: contract.provider,
    localHandlersReady,
    implementedCapabilities: capabilities.length,
    requiredCapabilities: requiredCapabilityCount,
    statusLabel: localHandlersReady ? 'Media service ready' : 'Media service pending',
    deploymentLabel: contract.deploymentStatus === 'cloudflare-worker-deployed' ? 'Trusted service live' : 'Trusted service pending',
    uploadLabel: localHandlersReady ? 'Drive saving ready' : 'Media saving is pending',
    description: localHandlersReady
      ? 'Album can sync, upload, preview, stream, and remove private media through the trusted Drive service without exposing Google credentials in the browser.'
      : 'Album can browse available memories, but shared Drive saving and background sync still need the trusted media service.',
  })
}

export function buildGalleryReadModel({ compatibilitySnapshot = null, memorySource = null } = {}) {
  return buildGalleryReadModelWithMediaIndex({ compatibilitySnapshot, memorySource })
}

export function buildGalleryReadModelWithMediaIndex({ compatibilitySnapshot = null, memorySource = null, mediaIndexSource = null, coupleId = 'couple' } = {}) {
  const resolvedMemorySource = memorySource || compatibilitySnapshot?.sources?.memories || EMPTY_MEMORY_SOURCE
  const resolvedMediaIndexSource = mediaIndexSource || compatibilitySnapshot?.sources?.mediaIndex || EMPTY_MEDIA_INDEX_SOURCE
  const normalizedMemories = normalizeTimelineMemories(resolvedMemorySource?.data?.memories || [])
  const memoryItems = selectGalleryItems(normalizedMemories)
  const indexedItems = selectMediaIndexGalleryItems(resolvedMediaIndexSource?.data?.entries || [])
  const reconciliation = reconcileGalleryItems(indexedItems, memoryItems)
  const items = reconciliation.items
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
    sourceStatus: buildSourceStatus(resolvedMemorySource, resolvedMediaIndexSource, indexedItems, memoryItems, reconciliation),
    mediaBackend: buildMediaBackendStatus(coupleId),
    warnings: [
      ...(Array.isArray(resolvedMemorySource?.warnings) ? resolvedMemorySource.warnings : []),
      ...(Array.isArray(resolvedMediaIndexSource?.warnings) ? resolvedMediaIndexSource.warnings : []),
    ],
  })
}
