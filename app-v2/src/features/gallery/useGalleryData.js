import { useCompatibilityData } from '../compatibility/useCompatibilityData.js'
import { buildGalleryReadModel } from './galleryReadModel.js'
import { toUserFacingError } from '../../services/userFacingError.js'

export function useGalleryData() {
  const { error, refresh, snapshot, state } = useCompatibilityData()

  return {
    model: buildGalleryReadModel({
      compatibilitySnapshot: snapshot,
    }),
    compatibilityError: error ? toUserFacingError(error, 'We could not load your Album right now. Try again.') : null,
    compatibilityState: state,
    refreshCompatibility: refresh,
  }
}
