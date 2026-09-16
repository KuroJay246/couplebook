import { useMemorySource } from '../memories/useMemorySource.js'
import { buildTimelineReadModel } from './timelineReadModel.js'
import { toUserFacingError } from '../../services/userFacingError.js'
import { useMediaIndexSource } from '../gallery/useMediaIndexSource.js'

function sourceItemCount(source) {
  const memories = Array.isArray(source?.data?.memories) ? source.data.memories.length : 0
  const entries = Array.isArray(source?.data?.entries) ? source.data.entries.length : 0
  return memories + entries
}

function resolveTimelineState(memoryState, mediaIndexState, memorySource, mediaIndexSource) {
  if (sourceItemCount(memorySource) + sourceItemCount(mediaIndexSource) > 0) return 'ready'
  if (memoryState === 'loading' && mediaIndexState === 'loading') return 'loading'
  if (memoryState === 'error' && mediaIndexState === 'error') return 'error'
  if (memoryState === 'empty' && mediaIndexState === 'empty') return 'empty'
  return memoryState === 'loading' ? 'loading' : 'ready'
}

export function useTimelineData() {
  const memory = useMemorySource()
  const mediaIndex = useMediaIndexSource()

  return {
    model: buildTimelineReadModel({
      memorySource: memory.source,
      mediaIndexSource: mediaIndex.source,
    }),
    compatibilityError: memory.error || mediaIndex.error
      ? toUserFacingError(memory.error || mediaIndex.error, 'We could not load your story right now. Try again.')
      : null,
    compatibilityState: resolveTimelineState(memory.state, mediaIndex.state, memory.source, mediaIndex.source),
    refreshCompatibility: () => {
      memory.refresh()
      mediaIndex.refresh()
    },
  }
}
