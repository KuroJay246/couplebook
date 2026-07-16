import { useCompatibilityData } from '../compatibility/useCompatibilityData.js'
import { buildGalleryReadModel } from './galleryReadModel.js'

export function useGalleryData() {
  const { error, refresh, snapshot, state } = useCompatibilityData()

  return {
    model: buildGalleryReadModel({
      compatibilitySnapshot: snapshot,
    }),
    compatibilityError: error,
    compatibilityState: state,
    refreshCompatibility: refresh,
  }
}
