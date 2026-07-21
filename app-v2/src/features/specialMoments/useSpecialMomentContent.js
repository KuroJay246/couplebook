import { useEffect, useState } from 'react'
import { getLegacySpecialMoment } from '../../services/specialMomentService.js'
import { useCompatibilityData } from '../compatibility/useCompatibilityData.js'
import { buildSpecialMomentContentModel } from './specialMomentContentModel.js'

export function useSpecialMomentContent(momentKey) {
  const { refresh, snapshot, state } = useCompatibilityData()
  const fixtureSource = snapshot?.sources?.specialMoments?.[momentKey] || null
  const [contentState, setContentState] = useState({
    momentKey: '',
    state: 'loading',
    source: null,
    error: '',
  })

  useEffect(() => {
    if (fixtureSource) {
      return undefined
    }

    let active = true

    async function loadContent() {
      try {
        const source = await getLegacySpecialMoment(momentKey)
        if (!active) return

        setContentState({
          momentKey,
          state: source.status === 'ready' || source.status === 'partial' ? 'ready' : source.status || 'empty',
          source,
          error: '',
        })
      } catch (error) {
        if (!active) return

        setContentState({
          momentKey,
          state: 'error',
          source: null,
          error: error?.message || 'Special moment content could not be loaded safely.',
        })
      }
    }

    void loadContent()

    return () => {
      active = false
    }
  }, [fixtureSource, momentKey])

  return {
    refreshCompatibility: refresh,
    model: buildSpecialMomentContentModel({
      momentKey,
      contentSource: fixtureSource || contentState.source,
      contentState: fixtureSource
        ? fixtureSource.status === 'ready' || fixtureSource.status === 'partial'
          ? 'ready'
          : fixtureSource.status || 'empty'
        : state === 'loading' || contentState.momentKey !== momentKey
          ? 'loading'
          : contentState.state,
      contentError: contentState.error,
    }),
  }
}
