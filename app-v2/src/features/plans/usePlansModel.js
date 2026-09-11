import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import { getPlansForCouple } from '../../services/planService.js'
import { buildPlansReadModel } from './plansReadModel.js'

const PLANS_LOAD_TIMEOUT_MS = 6000

function resolveCoupleId(approvedUser) {
  return approvedUser?.coupleId || approvedUser?.raw?.coupleId || ''
}

export function usePlansModel() {
  const { approvedUser } = useAuth()
  const [source, setSource] = useState({ status: 'loading', data: { plans: [] }, warnings: [] })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const coupleId = resolveCoupleId(approvedUser)

  const refresh = useCallback(async () => {
    if (!coupleId) {
      setSource({ status: 'empty', data: { plans: [] }, warnings: ['Plans need an approved couple before loading.'] })
      return
    }
    setSource((current) => (current.status === 'ready' ? current : { status: 'loading', data: { plans: [] }, warnings: [] }))
    try {
      const result = await Promise.race([
        getPlansForCouple(coupleId),
        new Promise((resolve) => {
          window.setTimeout(() => {
            resolve({
              status: 'unavailable',
              data: { plans: [] },
              warnings: ['Plans took too long to load.'],
            })
          }, PLANS_LOAD_TIMEOUT_MS)
        }),
      ])
      setSource(result)
    } catch (error) {
      setSource({
        status: 'unavailable',
        data: { plans: [] },
        warnings: [error?.message || 'Plans could not be loaded.'],
      })
    }
  }, [coupleId])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(handle)
  }, [refresh])

  return {
    model: useMemo(() => buildPlansReadModel(source, { search, status }), [search, source, status]),
    refresh,
    search,
    setSearch,
    setStatus,
    status,
  }
}
