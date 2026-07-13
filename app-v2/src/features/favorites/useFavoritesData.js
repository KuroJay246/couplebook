import { useAuth } from '../../auth/useAuth.js'
import { useCompatibilityData } from '../compatibility/useCompatibilityData.js'
import { buildFavoritesReadModel } from './favoritesReadModel.js'

export function useFavoritesData() {
  const { approvedUser } = useAuth()
  const { error, refresh, snapshot, state } = useCompatibilityData()

  return {
    model: buildFavoritesReadModel({
      approvedUser,
      compatibilitySnapshot: snapshot,
    }),
    compatibilityError: error,
    compatibilityState: state,
    refreshCompatibility: refresh,
  }
}
