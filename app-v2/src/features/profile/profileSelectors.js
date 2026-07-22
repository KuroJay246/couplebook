const FAVORITE_CATEGORY_ORDER = ['food', 'places', 'hobbies', 'activities']
const SOURCE_LABELS = {
  profile: 'Profiles',
  favorites: 'Favorites',
  contract: 'Contract',
}

function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function createDateAtNoon(dateLike) {
  if (!dateLike) return null

  const date = new Date(dateLike)
  if (Number.isNaN(date.getTime())) return null

  date.setHours(12, 0, 0, 0)
  return date
}

function formatDateLabel(dateLike) {
  const date = createDateAtNoon(dateLike)
  if (!date) return null

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function normalizeAnniversaryView(value) {
  const normalized = toTrimmedString(value).toLowerCase()
  if (!normalized) return null
  if (normalized === 'dual') return 'Dual view'
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}'s perspective`
}

function summarizeSource(key, source) {
  const status = source?.status || 'empty'

  let summary = 'No legacy value is currently stored for this surface.'
  if (status === 'ready') summary = 'Read-only compatibility data is available for this surface.'
  if (status === 'unavailable') summary = 'This source remains intentionally disconnected until its read path is approved.'
  if (status === 'invalid') summary = 'The routed shell refused malformed legacy data for this surface.'

  return {
    key,
    label: SOURCE_LABELS[key] || key,
    status,
    sourceLabel: source?.source || 'unknown',
    summary,
    warningCount: Array.isArray(source?.warnings) ? source.warnings.length : 0,
  }
}

export function selectProfilePeople(profileSource) {
  const data = profileSource?.data
  const order = Array.isArray(data?.participantOrder)
    ? data.participantOrder.flatMap((entry) => (entry ? [entry] : []))
    : Object.keys(data?.profilesByUsername || {})

  return order
    .flatMap((participantId) => {
      const profile = data?.profilesByUsername?.[participantId]
      if (!profile) return []

      const displayName = toTrimmedString(profile.name) || participantId
      const bio = toTrimmedString(profile.bio)
      const avatar = toTrimmedString(profile.avatar) || null
      const anniversaryView = toTrimmedString(profile.anniversaryView) || null
      const joinedDate = toTrimmedString(profile.joinedDate) || null
      const birthday = toTrimmedString(profile.birthday) || null

      return [{
        id: participantId,
        displayName,
        shortName: displayName.split(/\s+/)[0] || displayName,
        bio,
        bioStatus: bio ? 'ready' : 'empty',
        avatar,
        avatarStatus: avatar ? 'provided' : 'missing',
        anniversaryView,
        anniversaryViewLabel: normalizeAnniversaryView(anniversaryView),
        joinedDate,
        joinedDateLabel: formatDateLabel(joinedDate),
        birthday,
        birthdayLabel: formatDateLabel(birthday),
        details: [
          {
            key: 'anniversary-view',
            label: 'Anniversary view',
            value: normalizeAnniversaryView(anniversaryView),
            status: anniversaryView ? 'ready' : 'empty',
          },
          {
            key: 'joined-date',
            label: 'Joined',
            value: formatDateLabel(joinedDate),
            status: joinedDate ? 'ready' : 'empty',
          },
          {
            key: 'birthday',
            label: 'Birthday',
            value: formatDateLabel(birthday),
            status: birthday ? 'ready' : 'empty',
          },
        ],
      }]
    })
}

export function selectRelationshipTitle(people) {
  if (people.length >= 2) {
    return `${people[0].displayName} and ${people[1].displayName}`
  }

  if (people.length === 1) {
    return `${people[0].displayName}'s shared profile`
  }

  return 'Shared profile'
}

export function selectRelationshipAnniversaries(people) {
  return people
    .flatMap((person) => {
      if (!person.joinedDate) return []

      return [{
      id: `${person.id}-anniversary`,
      kind: 'anniversary',
      label: `${person.shortName}'s view`,
      date: person.joinedDate,
      dateLabel: person.joinedDateLabel,
      summary: person.anniversaryViewLabel || 'Shared relationship marker',
      status: 'ready',
      }]
    })
}

export function selectRelationshipMilestones(people, contractSource) {
  const milestones = people
    .flatMap((person) => {
      if (!person.birthday) return []

      return [{
      id: `${person.id}-birthday`,
      kind: 'birthday',
      label: `${person.shortName}'s birthday`,
      value: person.birthdayLabel,
      status: 'ready',
      }]
    })

  const signatures = contractSource?.data?.signaturesByUsername || {}
  const signatureList = Object.entries(signatures)
  const acceptedCount = signatureList.filter(([, signature]) => signature?.accepted === true).length

  if (signatureList.length > 0 || contractSource?.status === 'ready') {
    milestones.push({
      id: 'relationship-contract',
      kind: 'contract',
      label: 'Contract signatures',
      value:
        signatureList.length > 0
          ? `${acceptedCount} of ${signatureList.length} signatures preserved`
          : contractSource?.data?.accepted
            ? 'Accepted by the active approved account'
            : 'Awaiting signatures',
      status: acceptedCount > 0 || contractSource?.data?.accepted ? 'ready' : 'empty',
    })
  }

  return milestones
}

export function selectSharedHighlights(favoritesSource) {
  const data = favoritesSource?.data
  const order = Array.isArray(data?.participantOrder) ? data.participantOrder : Object.keys(data?.favoritesByOwner || {})
  const highlights = []

  for (const owner of order) {
    const ownerFavorites = data?.favoritesByOwner?.[owner]
    if (!ownerFavorites?.categories) continue

    for (const category of FAVORITE_CATEGORY_ORDER) {
      const values = Array.isArray(ownerFavorites.categories[category])
        ? ownerFavorites.categories[category].flatMap((value) => (value ? [value] : []))
        : []
      if (values.length === 0) continue

      highlights.push({
        id: `${owner}-${category}`,
        owner,
        category,
        label: values[0],
        count: values.length,
      })
    }
  }

  return highlights.slice(0, 6)
}

export function selectContractEntry(contractSource) {
  const signatures = contractSource?.data?.signaturesByUsername || {}
  const signatureCount = Object.keys(signatures).length
  const acceptedCount = Object.values(signatures).filter((signature) => signature?.accepted === true).length
  const status = contractSource?.status || 'empty'

  let description = 'The migrated Contract page keeps the preserved agreement quiet, read-only, and one step down from this shared profile.'
  if (status === 'ready' && signatureCount > 0) {
    description = `${acceptedCount} of ${signatureCount} preserved signatures are already visible from the migrated Contract page.`
  } else if (status === 'ready' && contractSource?.data?.accepted) {
    description = 'The active approved account already has a preserved acceptance record on the migrated Contract page.'
  } else if (status === 'empty') {
    description = 'The Contract page is live, even while no preserved contract signatures are visible from this profile view yet.'
  } else if (status === 'invalid') {
    description = 'Stored contract data needs review before it can be shown here.'
  } else if (status === 'unavailable') {
    description = 'The Contract page remains protected while its preserved details stay disconnected on this origin.'
  }

  return {
    href: '/contract',
    title: 'Relationship contract',
    status,
    description,
  }
}

export function selectFavoritesEntry(favoritesSource, sharedHighlights) {
  const status = favoritesSource?.status || 'empty'
  const count = sharedHighlights.length

  let description = 'The migrated Favorites page now keeps preserved tastes inside one read-only shared collection.'
  if (status === 'ready' && count > 0) {
    description = `${count} favorite highlights are visible here already, and the full shared collection now lives on the migrated Favorites page.`
  } else if (status === 'ready') {
    description = 'The migrated Favorites page is ready even while preserved highlights stay quiet.'
  } else if (status === 'empty') {
    description = 'The Favorites page is ready, but no preserved favorites are visible for this profile view yet.'
  } else if (status === 'invalid') {
    description = 'Stored favorites data needs review before it can be shown here.'
  }

  return {
    href: '/favorites',
    title: 'Shared favorites',
    status,
    description,
  }
}

export function selectProfileSourceStatus(snapshot) {
  const sources = snapshot?.sources || {}
  const items = ['profile', 'favorites', 'contract'].map((key) => summarizeSource(key, sources[key]))
  const warnings = [
    ...(Array.isArray(snapshot?.warnings) ? snapshot.warnings : []),
    ...['profile', 'favorites', 'contract'].flatMap((key) =>
      Array.isArray(sources[key]?.warnings) ? sources[key].warnings : [],
    ),
  ]
  const uniqueWarnings = [...new Set(warnings.filter(Boolean))]
  const overall =
    items.some((item) => item.status === 'invalid' || item.status === 'unavailable')
      ? 'partial'
      : items.some((item) => item.status === 'ready')
        ? 'ready'
        : 'empty'

  return {
    overall,
    items,
    warnings: uniqueWarnings,
  }
}

export function deriveProfileStatus({ people, relationship, sharedHighlights, sourceStatus }) {
  const hasPrimaryContent =
    people.length > 0 ||
    relationship.anniversaries.length > 0 ||
    relationship.milestones.length > 0 ||
    sharedHighlights.length > 0

  if (people.length >= 2 && sourceStatus.items.every((item) => item.status === 'ready' || item.status === 'empty')) {
    return 'ready'
  }

  if (hasPrimaryContent) {
    return 'partial'
  }

  if (sourceStatus.items.some((item) => item.status === 'unavailable' || item.status === 'invalid')) {
    return 'unavailable'
  }

  return 'empty'
}
