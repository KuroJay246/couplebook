import { useMemorySource } from '../memories/useMemorySource.js'
import { buildGalleryReadModel } from './galleryReadModel.js'
import { toUserFacingError } from '../../services/userFacingError.js'

export function useGalleryData() {
  const { error, refresh, source, state } = useMemorySource()

  return {
    model: buildGalleryReadModel({
      memorySource: source,
    }),
    compatibilityError: error ? toUserFacingError(error, 'We could not load your Album right now. Try again.') : null,
    compatibilityState: state,
    refreshCompatibility: refresh,
  }
}
