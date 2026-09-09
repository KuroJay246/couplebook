import { useMemorySource } from '../memories/useMemorySource.js'
import { buildTimelineReadModel } from './timelineReadModel.js'
import { toUserFacingError } from '../../services/userFacingError.js'

export function useTimelineData() {
  const { error, refresh, source, state } = useMemorySource()

  return {
    model: buildTimelineReadModel({
      memorySource: source,
    }),
    compatibilityError: error ? toUserFacingError(error, 'We could not load your story right now. Try again.') : null,
    compatibilityState: state,
    refreshCompatibility: refresh,
  }
}
