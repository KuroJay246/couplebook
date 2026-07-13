import { FavoritesView } from '../features/favorites/FavoritesView'
import { useFavoritesData } from '../features/favorites/useFavoritesData'

export function FavoritesPage() {
  const { compatibilityError, compatibilityState, model, refreshCompatibility } = useFavoritesData()

  return (
    <FavoritesView
      compatibilityError={compatibilityError}
      compatibilityState={compatibilityState}
      model={model}
      onRefresh={refreshCompatibility}
    />
  )
}
