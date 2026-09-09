import { buildSpecialMomentContentModel } from './specialMomentContentModel.js'
import { useSpecialMomentSource } from './useSpecialMomentSource.js'

export function useSpecialMomentContent(momentKey) {
  const { error, refresh, source, state } = useSpecialMomentSource(momentKey)

  return {
    refreshCompatibility: refresh,
    model: buildSpecialMomentContentModel({
      momentKey,
      contentSource: source,
      contentState: state,
      contentError: error,
    }),
  }
}
