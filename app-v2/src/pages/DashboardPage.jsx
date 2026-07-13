import { DashboardView } from '../features/dashboard/DashboardView'
import { useDashboardModel } from '../features/dashboard/useDashboardModel'

export function DashboardPage() {
  const { compatibilityError, compatibilityState, model, refreshCompatibility } = useDashboardModel()

  return (
    <DashboardView
      compatibilityError={compatibilityError}
      compatibilityState={compatibilityState}
      model={model}
      onRefresh={refreshCompatibility}
    />
  )
}
