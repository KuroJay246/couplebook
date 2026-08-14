import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import { getPlansForCouple } from '../../services/planService.js'
import { buildPlansReadModel } from './plansReadModel.js'

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
    const result = await getPlansForCouple(coupleId)
    setSource(result)
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
