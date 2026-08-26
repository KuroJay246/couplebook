import { useCompatibilityData } from '../compatibility/useCompatibilityData.js'
import { buildTimelineReadModel } from './timelineReadModel.js'
import { toUserFacingError } from '../../services/userFacingError.js'

export function useTimelineData() {
  const { error, refresh, snapshot, state } = useCompatibilityData()

  return {
    model: buildTimelineReadModel({
      compatibilitySnapshot: snapshot,
    }),
    compatibilityError: error ? toUserFacingError(error, 'We could not load your story right now. Try again.') : null,
    compatibilityState: state,
    refreshCompatibility: refresh,
  }
}
