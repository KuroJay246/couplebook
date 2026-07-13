import { ProfileView } from '../features/profile/ProfileView'
import { useProfileData } from '../features/profile/useProfileData'

export function ProfilePage() {
  const { compatibilityError, compatibilityState, model, refreshCompatibility } = useProfileData()

  return (
    <ProfileView
      compatibilityError={compatibilityError}
      compatibilityState={compatibilityState}
      model={model}
      onRefresh={refreshCompatibility}
    />
  )
}
