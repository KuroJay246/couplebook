import { deepClone, isPlainObject, normalizePersonKey, toTrimmedString } from '../../data/adapterUtils.js'

const SOURCE_LABELS = Object.freeze({
  'legacy-local-storage': 'Preserved legacy record',
  firestore: 'Authorized runtime record',
  unknown: 'Source pending review',
})

function formatDateLabel(value) {
  const normalizedValue = toTrimmedString(value)
  if (!normalizedValue) return ''

  const parsedDate = new Date(normalizedValue)
  if (Number.isNaN(parsedDate.getTime())) return ''

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate)
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function getSourceLabel(source) {
  return SOURCE_LABELS[source] || SOURCE_LABELS.unknown
}

function getProfileParticipants(profileSource) {
  const participantOrder = Array.isArray(profileSource?.data?.participantOrder) ? profileSource.data.participantOrder : []
  const profilesByUsername = isPlainObject(profileSource?.data?.profilesByUsername)
    ? Object.keys(profileSource.data.profilesByUsername)
    : []

  return unique([...participantOrder, ...profilesByUsername].map((entry) => normalizePersonKey(entry)))
}

function getSignatureParticipants(contractSource) {
  const signatures = isPlainObject(contractSource?.data?.signaturesByUsername) ? contractSource.data.signaturesByUsername : {}
  return unique(Object.keys(signatures).map((entry) => normalizePersonKey(entry)))
}

function getCurrentUsername(approvedUser) {
  return normalizePersonKey(approvedUser?.username || approvedUser?.displayName || '')
}

function findLatestVersion(contractSource, agreementSource) {
  const explicitVersion = toTrimmedString(agreementSource?.version)
  if (explicitVersion) return explicitVersion

  const activeSignatureVersion = toTrimmedString(contractSource?.data?.activeSignature?.version)
  if (activeSignatureVersion) return activeSignatureVersion

  const signatures = Object.values(contractSource?.data?.signaturesByUsername || {})
  for (const signature of signatures) {
    const version = toTrimmedString(signature?.version)
    if (version) return version

    const historyVersion = Array.isArray(signature?.history)
      ? signature.history.map((entry) => toTrimmedString(entry?.version)).find(Boolean)
      : ''
    if (historyVersion) return historyVersion
  }

  return ''
}

function normalizeAgreementSection(rawSection, index) {
  if (!isPlainObject(rawSection)) return null

  const heading = toTrimmedString(rawSection.heading || rawSection.title)
  const paragraphs = Array.isArray(rawSection.paragraphs)
    ? rawSection.paragraphs.map((entry) => toTrimmedString(entry)).filter(Boolean)
    : []
  const clauses = Array.isArray(rawSection.clauses)
    ? rawSection.clauses.map((entry) => toTrimmedString(entry)).filter(Boolean)
    : []

  if (!heading || (paragraphs.length === 0 && clauses.length === 0)) {
    return null
  }

  return {
    id: toTrimmedString(rawSection.id) || `agreement-section-${index + 1}`,
    heading,
    paragraphs,
    clauses,
  }
}

export function selectAgreementDocument({ agreementSource = null, contractSource = null } = {}) {
  const version = findLatestVersion(contractSource, agreementSource)
  const sections = Array.isArray(agreementSource?.sections)
    ? agreementSource.sections.map((entry, index) => normalizeAgreementSection(entry, index)).filter(Boolean)
    : []

  if (toTrimmedString(agreementSource?.status).toLowerCase() === 'ready' && sections.length > 0) {
    return {
      status: 'ready',
      title: toTrimmedString(agreementSource.title) || 'Our agreement',
      introduction:
        toTrimmedString(agreementSource.introduction) ||
        'Authorized agreement wording is available in this protected routed page.',
      sections,
      version: version || null,
      sourceStatus: toTrimmedString(agreementSource.sourceLabel) || 'Authorized runtime content',
      summary: 'Authorized agreement wording is available inside the protected shell.',
    }
  }

  return {
    status: 'unavailable',
    title: 'Agreement content unavailable in this migrated view.',
    introduction:
      'This routed Contract page can preserve status safely, but the agreement wording itself has not been reintroduced from an authorized runtime source yet.',
    sections: [],
    version: version || null,
    sourceStatus: 'Awaiting protected agreement source',
    summary:
      'Status can be preserved here without copying the old static contract wording into the routed JavaScript bundle.',
  }
}

function buildRecordIdentity({ approvedUser, profileSource, contractSource }) {
  const currentUsername = getCurrentUsername(approvedUser)
  const currentDisplayName = toTrimmedString(approvedUser?.displayName || approvedUser?.username) || 'Current approved account'
  const knownParticipants = unique([...getProfileParticipants(profileSource), ...getSignatureParticipants(contractSource)])

  const partnerKey = knownParticipants.find((entry) => entry && entry !== currentUsername) || ''
  const shouldShowPartner = Boolean(partnerKey)

  return {
    currentUser: {
      key: currentUsername || 'current-approved-account',
      title: 'Your record',
      displayName: currentDisplayName,
    },
    partner: shouldShowPartner
      ? {
          key: partnerKey,
          title: 'Partner record',
          displayName: partnerKey,
        }
      : null,
  }
}

function getSignatureRecord(contractSource, key) {
  if (!key) return null
  const signatures = contractSource?.data?.signaturesByUsername || {}
  return isPlainObject(signatures[key]) ? signatures[key] : null
}

function shouldShowPartnerRecord(signature) {
  return isPlainObject(signature)
}

function buildAcceptanceStatus({ contractSource, fallbackAccepted = false, recordIdentity, signature }) {
  const sourceStatus = toTrimmedString(contractSource?.status)

  if (sourceStatus === 'unavailable') {
    return {
      title: recordIdentity.title,
      displayName: recordIdentity.displayName,
      status: 'unavailable',
      label: 'Status unavailable',
      acceptedAtLabel: 'Not available',
      note: 'This protected source is not connected on this origin yet.',
    }
  }

  const accepted = fallbackAccepted || signature?.accepted === true
  const acceptedAtLabel = formatDateLabel(signature?.timestamp)

  if (accepted) {
    return {
      title: recordIdentity.title,
      displayName: recordIdentity.displayName,
      status: 'accepted',
      label: 'Accepted',
      acceptedAtLabel: acceptedAtLabel || 'Recorded without a readable date',
      note: signature?.version ? `Version ${signature.version}` : 'Preserved acceptance record',
    }
  }

  return {
    title: recordIdentity.title,
    displayName: recordIdentity.displayName,
    status: sourceStatus === 'invalid' ? 'unavailable' : 'not-recorded',
    label: sourceStatus === 'invalid' ? 'Status unavailable' : 'Not yet recorded',
    acceptedAtLabel: sourceStatus === 'invalid' ? 'Needs review' : 'No acceptance date recorded',
    note:
      sourceStatus === 'invalid'
        ? 'Stored contract details need review before they can be trusted here.'
        : 'A missing record is kept separate from rejection or refusal.',
  }
}

function buildSignatureStatus({ contractSource, fallbackAccepted = false, recordIdentity, signature }) {
  const sourceStatus = toTrimmedString(contractSource?.status)

  if (sourceStatus === 'unavailable') {
    return {
      title: recordIdentity.title,
      displayName: recordIdentity.displayName,
      status: 'unavailable',
      label: 'Signature status unavailable',
      signedAtLabel: 'Not available',
      note: 'This protected source is not connected on this origin yet.',
      rawSignaturesHidden: true,
    }
  }

  if (signature) {
    const signedAtLabel = formatDateLabel(signature.timestamp)
    const hasLegacyPayload = signature.hasLegacyPayload === true || (Array.isArray(signature.redactedFields) && signature.redactedFields.length > 0)
    const accepted = signature.accepted === true || fallbackAccepted

    return {
      title: recordIdentity.title,
      displayName: recordIdentity.displayName,
      status: accepted ? (hasLegacyPayload ? 'legacy' : 'recorded') : 'not-recorded',
      label: accepted
        ? hasLegacyPayload
          ? 'Signature preserved in legacy data'
          : 'Signature recorded'
        : 'No signature recorded',
      signedAtLabel: signedAtLabel || (accepted ? 'Recorded without a readable date' : 'No signature date recorded'),
      note: signature.version ? `Version ${signature.version}` : accepted ? 'Read-only signature status' : 'No raw signature is shown here.',
      rawSignaturesHidden: true,
    }
  }

  if (fallbackAccepted) {
    return {
      title: recordIdentity.title,
      displayName: recordIdentity.displayName,
      status: 'recorded',
      label: 'Accepted record preserved',
      signedAtLabel: 'Signature details are not available',
      note: 'The acceptance record is preserved without exposing raw signature content.',
      rawSignaturesHidden: true,
    }
  }

  return {
    title: recordIdentity.title,
    displayName: recordIdentity.displayName,
    status: sourceStatus === 'invalid' ? 'unavailable' : 'not-recorded',
    label: sourceStatus === 'invalid' ? 'Signature status unavailable' : 'No signature recorded',
    signedAtLabel: sourceStatus === 'invalid' ? 'Needs review' : 'No signature date recorded',
    note:
      sourceStatus === 'invalid'
        ? 'Stored signature details need review before they can be trusted here.'
        : 'Raw signature payloads stay hidden in this read-only page.',
    rawSignaturesHidden: true,
  }
}

export function selectAcceptanceSummary({ approvedUser = null, contractSource = null, profileSource = null } = {}) {
  const identities = buildRecordIdentity({ approvedUser, profileSource, contractSource })
  const currentSignature = getSignatureRecord(contractSource, identities.currentUser.key) || contractSource?.data?.activeSignature || null
  const partnerSignature = identities.partner ? getSignatureRecord(contractSource, identities.partner.key) : null

  return {
    currentUser: buildAcceptanceStatus({
      contractSource,
      fallbackAccepted: contractSource?.data?.accepted === true,
      recordIdentity: identities.currentUser,
      signature: currentSignature,
    }),
    partner: identities.partner && shouldShowPartnerRecord(partnerSignature)
      ? buildAcceptanceStatus({
          contractSource,
          fallbackAccepted: false,
          recordIdentity: identities.partner,
          signature: partnerSignature,
        })
      : null,
  }
}

export function selectSignatureSummary({ approvedUser = null, contractSource = null, profileSource = null } = {}) {
  const identities = buildRecordIdentity({ approvedUser, profileSource, contractSource })
  const currentSignature = getSignatureRecord(contractSource, identities.currentUser.key) || contractSource?.data?.activeSignature || null
  const partnerSignature = identities.partner ? getSignatureRecord(contractSource, identities.partner.key) : null

  return {
    currentUser: buildSignatureStatus({
      contractSource,
      fallbackAccepted: contractSource?.data?.accepted === true,
      recordIdentity: identities.currentUser,
      signature: currentSignature,
    }),
    partner: identities.partner && shouldShowPartnerRecord(partnerSignature)
      ? buildSignatureStatus({
          contractSource,
          fallbackAccepted: false,
          recordIdentity: identities.partner,
          signature: partnerSignature,
        })
      : null,
  }
}

function buildHistoryEvent({ actorTitle, actorDisplayName, index, entry, versionFallback = '' }) {
  const accepted = entry?.accepted === true
  const dateLabel = formatDateLabel(entry?.timestamp)
  const version = toTrimmedString(entry?.version || versionFallback)

  if (!accepted && !dateLabel && !version) {
    return null
  }

  return {
    id: `${actorDisplayName}-${dateLabel || version || index}`,
    actorTitle,
    actorDisplayName,
    title: accepted ? 'Acceptance recorded' : 'Preserved contract update',
    dateLabel: dateLabel || 'Recorded without a readable date',
    note: version ? `Version ${version}` : 'Read-only preserved event',
  }
}

function collectSignatureHistory({ actor, signature }) {
  if (!actor || !signature) return []

  const historyEntries = Array.isArray(signature.history) ? signature.history : []
  const normalizedEntries =
    historyEntries.length > 0
      ? historyEntries
      : [
          {
            accepted: signature.accepted,
            timestamp: signature.timestamp,
            version: signature.version,
          },
        ]

  return normalizedEntries
    .map((entry, index) =>
      buildHistoryEvent({
        actorTitle: actor.title,
        actorDisplayName: actor.displayName,
        entry,
        index,
        versionFallback: signature.version,
      }),
    )
    .filter(Boolean)
}

export function selectContractHistory({ approvedUser = null, contractSource = null, profileSource = null } = {}) {
  const identities = buildRecordIdentity({ approvedUser, profileSource, contractSource })
  const currentSignature = getSignatureRecord(contractSource, identities.currentUser.key) || contractSource?.data?.activeSignature || null
  const partnerSignature = identities.partner ? getSignatureRecord(contractSource, identities.partner.key) : null

  return unique([
    ...collectSignatureHistory({ actor: identities.currentUser, signature: currentSignature }).map((entry) => JSON.stringify(entry)),
    ...collectSignatureHistory({ actor: identities.partner, signature: partnerSignature }).map((entry) => JSON.stringify(entry)),
  ])
    .map((entry) => JSON.parse(entry))
    .sort((left, right) => {
      const leftDate = Date.parse(left.dateLabel)
      const rightDate = Date.parse(right.dateLabel)

      if (Number.isNaN(leftDate) && Number.isNaN(rightDate)) return 0
      if (Number.isNaN(leftDate)) return 1
      if (Number.isNaN(rightDate)) return -1
      return rightDate - leftDate
    })
}

export function selectContractEntries() {
  return {
    profile: {
      href: '/profile',
      title: 'Shared profile',
      status: 'ready',
      description: 'Shared identity and milestones stay close to the preserved agreement without turning this page into an account console.',
    },
    favorites: {
      href: '/favorites',
      title: 'Shared favorites',
      status: 'ready',
      description: 'The things you return to together remain one step away from this preserved document.',
    },
  }
}

function buildSourceStatusItem({ key, label, sourceLabel, status, summary, warningCount = 0 }) {
  return {
    key,
    label,
    sourceLabel,
    status,
    summary,
    warningCount,
  }
}

export function selectContractSourceStatus({ agreement, contractSource = null, profileSource = null } = {}) {
  const contractWarnings = Array.isArray(contractSource?.warnings) ? contractSource.warnings : []
  const profileWarnings = Array.isArray(profileSource?.warnings) ? profileSource.warnings : []
  const warnings = unique([...contractWarnings, ...profileWarnings])

  const items = [
    buildSourceStatusItem({
      key: 'agreement',
      label: 'Agreement document',
      sourceLabel: agreement.sourceStatus,
      status: agreement.status === 'ready' ? 'ready' : 'unavailable',
      summary: agreement.summary,
    }),
    buildSourceStatusItem({
      key: 'contract-status',
      label: 'Acceptance and signature status',
      sourceLabel: getSourceLabel(contractSource?.source),
      status: contractSource?.status || 'empty',
      summary:
        contractSource?.status === 'ready'
          ? 'Preserved contract status is available from the authorized compatibility source.'
          : contractSource?.status === 'empty'
            ? 'No preserved contract status is recorded for this approved account yet.'
            : contractSource?.status === 'invalid'
              ? 'Stored contract details need review before they can be shown safely.'
              : 'Protected contract status is not connected on this origin yet.',
      warningCount: contractWarnings.length,
    }),
    buildSourceStatusItem({
      key: 'profile-context',
      label: 'Partner context',
      sourceLabel: getSourceLabel(profileSource?.source),
      status: profileSource?.status || 'empty',
      summary:
        profileSource?.status === 'ready'
          ? 'Shared profile context can safely label the two-person archive around this document.'
          : profileSource?.status === 'invalid'
            ? 'Profile context needs review before it can support this document safely.'
            : 'Partner context stays limited until the shared profile source reconnects here.',
      warningCount: profileWarnings.length,
    }),
  ]

  return {
    items,
    notes: [
      'This page is read-only. Signing, editing, accepting, and exporting remain deferred.',
      'Raw signatures stay hidden from both the visible page and accessibility text.',
      agreement.status === 'ready'
        ? 'Agreement wording is available from a protected runtime source.'
        : 'Agreement wording will return only after a protected runtime source exists.',
    ],
    warnings,
  }
}

export function selectContractPrivacy() {
  return {
    readOnly: true,
    rawSignaturesHidden: true,
    items: [
      {
        label: 'Read-only route',
        description: 'This migrated Contract page preserves what can be read safely, without reintroducing signing or editing.',
      },
      {
        label: 'Raw signatures hidden',
        description: 'Signature payloads, data URLs, and image-like content stay outside the display model and the routed page.',
      },
      {
        label: 'Protected wording only',
        description: 'Agreement text returns here only when it comes from an authorized runtime source, not from the old static files.',
      },
    ],
  }
}

export function selectContractOpeningNotes({ agreement, acceptance, signatures }) {
  return [
    agreement.status === 'ready'
      ? 'Agreement wording restored from a protected source'
      : 'Agreement wording still awaiting protected migration',
    acceptance.currentUser.status === 'accepted' ? 'Your accepted record is preserved' : 'No accepted record is shown yet',
    signatures.currentUser.rawSignaturesHidden ? 'Raw signatures stay hidden' : 'Signature privacy needs review',
  ]
}

export function deriveContractStatus({ agreement, contractSource = null, acceptance, signatures, history }) {
  const sourceStatus = toTrimmedString(contractSource?.status).toLowerCase()
  const hasAgreement = agreement.status === 'ready' && agreement.sections.length > 0
  const hasRecordedAcceptance = acceptance.currentUser.status === 'accepted' || acceptance.partner?.status === 'accepted'
  const hasRecordedSignature =
    signatures.currentUser.status === 'recorded' ||
    signatures.currentUser.status === 'legacy' ||
    signatures.partner?.status === 'recorded' ||
    signatures.partner?.status === 'legacy'
  const hasHistory = Array.isArray(history) && history.length > 0
  const hasVersion = Boolean(agreement.version)

  if (sourceStatus === 'invalid') return 'invalid'
  if (hasAgreement) return 'ready'
  if (sourceStatus === 'unavailable') return 'unavailable'
  if (hasRecordedAcceptance || hasRecordedSignature || hasHistory || hasVersion || sourceStatus === 'ready') return 'partial'
  return 'empty'
}

export function cloneAgreementSource(source) {
  return source ? deepClone(source) : null
}
