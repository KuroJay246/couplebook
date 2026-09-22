import { buildGalleryReadModelWithMediaIndex } from './galleryReadModel.js'
import { useMediaIndexSource } from './useMediaIndexSource.js'

function sourceItemCount(source) {
  const entries = Array.isArray(source?.data?.entries) ? source.data.entries.length : 0
  return entries
}

function resolveGalleryState(mediaIndexState, mediaIndexSource) {
  if (sourceItemCount(mediaIndexSource) > 0) return 'ready'
  if (mediaIndexState === 'loading') return 'loading'
  if (mediaIndexState === 'empty') return 'empty'
  return 'ready'
}

function sourceWithWarning(source, error) {
  if (!error) return source
  return {
    ...(source || {}),
    status: 'unavailable',
    warnings: [...new Set([...(Array.isArray(source?.warnings) ? source.warnings : []), error])],
  }
}

export function useGalleryData() {
  const mediaIndex = useMediaIndexSource()
  const mediaIndexSource = sourceWithWarning(mediaIndex.source, mediaIndex.error)

  return {
    model: buildGalleryReadModelWithMediaIndex({
      mediaIndexSource,
    }),
    compatibilityError: null,
    compatibilityState: resolveGalleryState(mediaIndex.state, mediaIndexSource),
    refreshCompatibility: () => {
      mediaIndex.refresh()
    },
  }
}
