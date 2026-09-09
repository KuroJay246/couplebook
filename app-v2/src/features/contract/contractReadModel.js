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

export function buildContractReadModel({
  agreementSource = null,
  approvedUser = null,
  compatibilitySnapshot = null,
  contractSource = null,
  profileSource = null,
} = {}) {
  const snapshot = compatibilitySnapshot || {
    status: 'empty',
    sources: {},
    warnings: [],
  }

  const resolvedContractSource = contractSource || snapshot.sources?.contract || null
  const resolvedProfileSource = profileSource || snapshot.sources?.profile || null
  const safeAgreementSource = cloneAgreementSource(agreementSource)
  const agreement = selectAgreementDocument({
    agreementSource: safeAgreementSource,
    contractSource: resolvedContractSource,
  })
  const acceptance = selectAcceptanceSummary({
    approvedUser,
    contractSource: resolvedContractSource,
    profileSource: resolvedProfileSource,
  })
  const signatures = selectSignatureSummary({
    approvedUser,
    contractSource: resolvedContractSource,
    profileSource: resolvedProfileSource,
  })
  const history = selectContractHistory({
    approvedUser,
    contractSource: resolvedContractSource,
    profileSource: resolvedProfileSource,
  })
  const sourceStatus = selectContractSourceStatus({
    agreement,
    contractSource: resolvedContractSource,
    profileSource: resolvedProfileSource,
  })
  const privacy = selectContractPrivacy()
  const entries = selectContractEntries()

  return freezeClone({
    status: deriveContractStatus({
      agreement,
      contractSource: resolvedContractSource,
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
