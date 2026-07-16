import { freezeClone } from '../../data/adapterUtils.js'
import {
  cloneAgreementSource,
  deriveContractStatus,
  selectAcceptanceSummary,
  selectAgreementDocument,
  selectContractEntries,
  selectContractHistory,
  selectContractOpeningNotes,
  selectContractPrivacy,
  selectContractSourceStatus,
  selectSignatureSummary,
} from './contractSelectors.js'

export function buildContractReadModel({ agreementSource = null, approvedUser = null, compatibilitySnapshot = null } = {}) {
  const snapshot = compatibilitySnapshot || {
    status: 'empty',
    sources: {},
    warnings: [],
  }

  const contractSource = snapshot.sources?.contract || null
  const profileSource = snapshot.sources?.profile || null
  const safeAgreementSource = cloneAgreementSource(agreementSource)
  const agreement = selectAgreementDocument({
    agreementSource: safeAgreementSource,
    contractSource,
  })
  const acceptance = selectAcceptanceSummary({
    approvedUser,
    contractSource,
    profileSource,
  })
  const signatures = selectSignatureSummary({
    approvedUser,
    contractSource,
    profileSource,
  })
  const history = selectContractHistory({
    approvedUser,
    contractSource,
    profileSource,
  })
  const sourceStatus = selectContractSourceStatus({
    agreement,
    contractSource,
    profileSource,
  })
  const privacy = selectContractPrivacy()
  const entries = selectContractEntries()

  return freezeClone({
    status: deriveContractStatus({
      agreement,
      contractSource,
      acceptance,
      signatures,
      history,
    }),
    agreement,
    acceptance,
    signatures,
    history,
    privacy,
    entries,
    sourceStatus,
    openingNotes: selectContractOpeningNotes({
      agreement,
      acceptance,
      signatures,
    }),
  })
}
