import { ContractView } from '../features/contract/ContractView'
import { useContractData } from '../features/contract/useContractData'

export function ContractPage() {
  const { compatibilityError, compatibilityState, model, refreshCompatibility } = useContractData()

  return (
    <ContractView
      compatibilityError={compatibilityError}
      compatibilityState={compatibilityState}
      model={model}
      onRefresh={refreshCompatibility}
    />
  )
}
