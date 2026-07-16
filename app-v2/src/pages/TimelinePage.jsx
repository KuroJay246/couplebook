import { TimelineView } from '../features/timeline/TimelineView'
import { useTimelineData } from '../features/timeline/useTimelineData'

export function TimelinePage() {
  const { compatibilityError, compatibilityState, model, refreshCompatibility } = useTimelineData()

  return (
    <TimelineView
      compatibilityError={compatibilityError}
      compatibilityState={compatibilityState}
      model={model}
      onRefresh={refreshCompatibility}
    />
  )
}
