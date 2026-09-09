import { useMemorySource } from '../memories/useMemorySource.js'
import { buildGalleryReadModelWithMediaIndex } from './galleryReadModel.js'
import { toUserFacingError } from '../../services/userFacingError.js'
import { useMediaIndexSource } from './useMediaIndexSource.js'

function sourceItemCount(source) {
  const memories = Array.isArray(source?.data?.memories) ? source.data.memories.length : 0
  const entries = Array.isArray(source?.data?.entries) ? source.data.entries.length : 0
  return memories + entries
}

function resolveGalleryState(memoryState, mediaIndexState, memorySource, mediaIndexSource) {
  if (sourceItemCount(memorySource) + sourceItemCount(mediaIndexSource) > 0) return 'ready'
  if (memoryState === 'loading' && mediaIndexState === 'loading') return 'loading'
  if (memoryState === 'error' && mediaIndexState === 'error') return 'error'
  if (memoryState === 'empty' && mediaIndexState === 'empty') return 'empty'
  return 'ready'
}

export function useGalleryData() {
  const memory = useMemorySource()
  const mediaIndex = useMediaIndexSource()

  return {
    model: buildGalleryReadModelWithMediaIndex({
      memorySource: memory.source,
      mediaIndexSource: mediaIndex.source,
    }),
    compatibilityError: memory.error || mediaIndex.error
      ? toUserFacingError(memory.error || mediaIndex.error, 'We could not load your Album right now. Try again.')
      : null,
    compatibilityState: resolveGalleryState(memory.state, mediaIndex.state, memory.source, mediaIndex.source),
    refreshCompatibility: () => {
      memory.refresh()
      mediaIndex.refresh()
    },
  }
}
