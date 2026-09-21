import { useMemorySource } from '../memories/useMemorySource.js'
import { buildTimelineReadModel } from './timelineReadModel.js'
import { useMediaIndexSource } from '../gallery/useMediaIndexSource.js'

function sourceItemCount(source) {
  const memories = Array.isArray(source?.data?.memories) ? source.data.memories.length : 0
  const entries = Array.isArray(source?.data?.entries) ? source.data.entries.length : 0
  return memories + entries
}

function resolveTimelineState(memoryState, mediaIndexState, memorySource, mediaIndexSource) {
  if (sourceItemCount(memorySource) + sourceItemCount(mediaIndexSource) > 0) return 'ready'
  if (memoryState === 'loading' && mediaIndexState === 'loading') return 'loading'
  if (memoryState === 'empty' && mediaIndexState === 'empty') return 'empty'
  return memoryState === 'loading' ? 'loading' : 'ready'
}

function sourceWithWarning(source, error) {
  if (!error) return source
  return {
    ...(source || {}),
    status: 'unavailable',
    warnings: [...new Set([...(Array.isArray(source?.warnings) ? source.warnings : []), error])],
  }
}

export function useTimelineData() {
  const memory = useMemorySource()
  const mediaIndex = useMediaIndexSource()
  const memorySource = sourceWithWarning(memory.source, memory.error)
  const mediaIndexSource = sourceWithWarning(mediaIndex.source, mediaIndex.error)

  return {
    model: buildTimelineReadModel({
      memorySource,
      mediaIndexSource,
    }),
    compatibilityError: null,
    compatibilityState: resolveTimelineState(memory.state, mediaIndex.state, memorySource, mediaIndexSource),
    refreshCompatibility: () => {
      memory.refresh()
      mediaIndex.refresh()
    },
  }
}
