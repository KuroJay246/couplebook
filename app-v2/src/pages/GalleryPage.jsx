import { GalleryView } from '../features/gallery/GalleryView'
import { useGalleryData } from '../features/gallery/useGalleryData'

export function GalleryPage() {
  const { compatibilityError, compatibilityState, model, refreshCompatibility } = useGalleryData()

  return (
    <GalleryView
      compatibilityError={compatibilityError}
      compatibilityState={compatibilityState}
      model={model}
      onRefresh={refreshCompatibility}
    />
  )
}
