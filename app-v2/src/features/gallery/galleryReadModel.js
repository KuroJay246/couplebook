import { freezeClone } from '../../data/adapterUtils.js'
import { getMediaSyncArchitectureContract } from '../../services/syncService.js'
import { buildGalleryCollections, buildGalleryFilters, buildGallerySummary, buildMediaLibrary, selectMediaIndexGalleryItems } from './gallerySelectors.js'

const EMPTY_MEDIA_INDEX_SOURCE = Object.freeze({
  status: 'empty',
  source: 'firestore',
  data: null,
  warnings: [],
})

function deriveGalleryStatus(mediaIndexSource, items) {
  if (mediaIndexSource?.status === 'invalid') return 'invalid'
  if (items.length > 0 && mediaIndexSource?.status === 'ready') return 'ready'
  if (mediaIndexSource?.status === 'unavailable') return items.length > 0 ? 'partial' : 'unavailable'
  if (items.length === 0) return 'empty'
  return 'ready'
}

function buildSourceStatus(mediaIndexSource, indexedItems) {
  return freezeClone({
    mediaInventory: {
      status: mediaIndexSource?.status || 'empty',
      count: indexedItems.length,
      label: 'Firestore media index',
      warningCount: Array.isArray(mediaIndexSource?.warnings) ? mediaIndexSource.warnings.length : 0,
      warnings: Array.isArray(mediaIndexSource?.warnings) ? mediaIndexSource.warnings : [],
    },
    reconciliation: {
      activeAlbumItems: indexedItems.length,
      authoritativeIndexedCount: indexedItems.length,
      totalItems: indexedItems.length,
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
      : 'Album can browse indexed media, but shared Drive saving and background sync still need the trusted media service.',
  })
}

export function buildGalleryReadModel({ compatibilitySnapshot = null, mediaIndexSource = null } = {}) {
  return buildGalleryReadModelWithMediaIndex({ compatibilitySnapshot, mediaIndexSource })
}

export function buildGalleryReadModelWithMediaIndex({ compatibilitySnapshot = null, mediaIndexSource = null, coupleId = 'couple' } = {}) {
  const resolvedMediaIndexSource = mediaIndexSource || compatibilitySnapshot?.sources?.mediaIndex || EMPTY_MEDIA_INDEX_SOURCE
  const indexedItems = selectMediaIndexGalleryItems(resolvedMediaIndexSource?.data?.entries || [])
  const items = indexedItems
  const photos = items.filter((item) => item.media.kind === 'image')
  const videos = items.filter((item) => item.media.kind === 'video')
  const unavailableMedia = items.filter((item) => ['unavailable', 'invalid'].includes(item.media.status))
  const verifiedMedia = items.filter((item) => item.media.status === 'drive-indexed')

  return freezeClone({
    status: deriveGalleryStatus(resolvedMediaIndexSource, items),
    items,
    archiveReferenceItems: [],
    memoryItems: [],
    indexedItems,
    library: buildMediaLibrary(items),
    summary: buildGallerySummary(items),
    collections: buildGalleryCollections(items),
    photos,
    videos,
    verifiedMedia,
    unavailableMedia,
    filters: buildGalleryFilters(items),
    sourceStatus: buildSourceStatus(resolvedMediaIndexSource, indexedItems),
    mediaBackend: buildMediaBackendStatus(coupleId),
    warnings: Array.isArray(resolvedMediaIndexSource?.warnings) ? resolvedMediaIndexSource.warnings : [],
  })
}
