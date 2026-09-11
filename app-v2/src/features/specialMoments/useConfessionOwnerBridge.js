import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import { getBrowserTestAuthState } from '../../lib/browserTestMode.js'
import {
  canUseConfessionOwnerBridge,
  getConfessionOwnerBridgeBaseUrl,
  loadConfessionOwnerState,
  resolveConfessionOwnerBridgeUrl,
  saveConfessionOwnerMapping,
} from '../../services/confessionOwnerBridgeService.js'

export function useConfessionOwnerBridge() {
  const { user } = useAuth()
  const [ownerState, setOwnerState] = useState(null)
  const [ownerStateStatus, setOwnerStateStatus] = useState('unavailable')
  const [ownerStateError, setOwnerStateError] = useState('')
  const [activeSlotAction, setActiveSlotAction] = useState('')
  const baseUrl = useMemo(() => getConfessionOwnerBridgeBaseUrl(), [])
  const browserTestAuth = useMemo(() => getBrowserTestAuthState(), [])
  const showOwnerTools = !browserTestAuth && canUseConfessionOwnerBridge({ baseUrl, user })

  const refreshOwnerState = useCallback(async () => {
    if (!showOwnerTools) return

    setOwnerStateStatus('loading')
    setOwnerStateError('')
    try {
      const payload = await loadConfessionOwnerState({ baseUrl })
      setOwnerState(payload)
      setOwnerStateStatus('ready')
    } catch (error) {
      setOwnerState(null)
      setOwnerStateStatus('error')
      setOwnerStateError(error?.message || 'Owner restoration state is unavailable.')
    }
  }, [baseUrl, showOwnerTools])

  useEffect(() => {
    let active = true

    async function loadInitialState() {
      if (!showOwnerTools) {
        queueMicrotask(() => {
          if (!active) return
          setOwnerState(null)
          setOwnerStateStatus('unavailable')
          setOwnerStateError('')
        })
        return
      }

      setOwnerStateStatus('loading')
      setOwnerStateError('')
      try {
        const payload = await loadConfessionOwnerState({ baseUrl })
        if (!active) return
        setOwnerState(payload)
        setOwnerStateStatus('ready')
      } catch (error) {
        if (!active) return
        setOwnerState(null)
        setOwnerStateStatus('error')
        setOwnerStateError(error?.message || 'Owner restoration state is unavailable.')
      }
    }

    void loadInitialState()

    return () => {
      active = false
    }
  }, [baseUrl, showOwnerTools])

  const updateOwnerMapping = useCallback(
    async (slotId, candidateId, clear = false) => {
      const requestId = `${slotId}:${clear ? 'clear' : candidateId}`
      setActiveSlotAction(requestId)
      setOwnerStateError('')

      try {
        const payload = await saveConfessionOwnerMapping({ baseUrl, slotId, candidateId, clear })
        setOwnerState(payload)
        setOwnerStateStatus('ready')
      } catch (error) {
        setOwnerStateStatus('error')
        setOwnerStateError(error?.message || 'Owner mapping update failed.')
      } finally {
        setActiveSlotAction('')
      }
    },
    [baseUrl],
  )

  const resolvePreviewUrl = useCallback((url) => resolveConfessionOwnerBridgeUrl(url, baseUrl), [baseUrl])

  return {
    activeSlotAction,
    ownerSlots: ownerState?.slots || [],
    ownerStateError,
    ownerStateStatus,
    refreshOwnerState,
    resolvePreviewUrl,
    showOwnerTools,
    updateOwnerMapping,
    user,
  }
}
