import { SettingsView } from '../features/settings/SettingsView'
import { useSettingsData } from '../features/settings/useSettingsData'

export function SettingsPage() {
  const { compatibilityError, compatibilityState, model, refreshCompatibility } = useSettingsData()

  return (
    <SettingsView
      compatibilityError={compatibilityError}
      compatibilityState={compatibilityState}
      model={model}
      onRefresh={refreshCompatibility}
    />
  )
}
