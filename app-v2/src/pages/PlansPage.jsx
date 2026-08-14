import { PlansView } from '../features/plans/PlansView.jsx'
import { usePlansModel } from '../features/plans/usePlansModel.js'

export function PlansPage() {
  const { model, refresh, search, setSearch, setStatus, status } = usePlansModel()

  return (
    <PlansView
      model={model}
      onRefresh={refresh}
      search={search}
      setSearch={setSearch}
      setStatus={setStatus}
      status={status}
    />
  )
}
