import { useCompatibilityData } from '../compatibility/useCompatibilityData.js'
import { buildTimelineReadModel } from './timelineReadModel.js'

export function useTimelineData() {
  const { error, refresh, snapshot, state } = useCompatibilityData()

  return {
    model: buildTimelineReadModel({
      compatibilitySnapshot: snapshot,
    }),
    compatibilityError: error,
    compatibilityState: state,
    refreshCompatibility: refresh,
  }
}
