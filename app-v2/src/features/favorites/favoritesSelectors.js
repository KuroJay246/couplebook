import { isPlainObject, normalizePersonKey, toTrimmedString } from '../../data/adapterUtils.js'

const FAVORITE_CATEGORY_ORDER = ['food', 'places', 'hobbies', 'activities']
const FAVORITE_CATEGORY_LABELS = Object.freeze({
  food: 'Food',
  places: 'Places',
  hobbies: 'Hobbies',
  activities: 'Activities',
})
const SOURCE_LABELS = Object.freeze({
  favorites: 'Favorites',
  profile: 'Profiles',
})

function uniqueValues(values) {
  return [...new Set((values || []).filter(Boolean))]
}

function normalizeDisplayText(value) {
  return toTrimmedString(value).replace(/\s+/g, ' ')
}

function normalizeComparableText(value) {
  return normalizeDisplayText(value).toLowerCase()
}

function slugify(value) {
  return normalizeComparableText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item'
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function summarizeSource(key, source) {
  const status = source?.status || 'empty'
  let summary = 'This supporting source is waiting for its first safe values.'

  if (key === 'favorites') {
    if (status === 'ready') summary = 'Preserved favorites are available for this shared collection.'
    if (status === 'empty') summary = 'This collection is ready, but no preserved favorites are stored here yet.'
    if (status === 'unavailable') summary = 'Saved favorites remain safely in the legacy book on this origin.'
    if (status === 'invalid') summary = 'Stored favorites need review before they can open safely here.'
  }

  if (key === 'profile') {
    if (status === 'ready') summary = 'Profile names and paired context are available for this collection.'
    if (status === 'empty') summary = 'Profile details remain quiet, so this page uses only preserved owner labels.'
    if (status === 'unavailable') summary = 'Profile names are still waiting on their read-only bridge here.'
    if (status === 'invalid') summary = 'Stored profile details need review before they can support this page.'
  }

  return {
    key,
    label: SOURCE_LABELS[key] || key,
    status,
    sourceLabel: source?.source || 'unknown',
    summary,
    warningCount: Array.isArray(source?.warnings) ? source.warnings.length : 0,
  }
}

function collectProfileIdentities(profileSource) {
  const data = profileSource?.data
  const order = Array.isArray(data?.participantOrder)
    ? data.participantOrder.map((entry) => normalizePersonKey(entry)).filter(Boolean)
    : Object.keys(data?.profilesByUsername || {}).map((entry) => normalizePersonKey(entry))

  const identities = new Map()

  for (const participantId of uniqueValues(order)) {
    const profile = data?.profilesByUsername?.[participantId] || {}
    const displayName = normalizeDisplayText(profile.name) || participantId

    identities.set(participantId, {
      id: participantId,
      displayName,
      shortName: displayName.split(/\s+/)[0] || displayName,
    })
  }

  return identities
}

function collectOwnerKeys(favoritesSource) {
  const data = favoritesSource?.data
  const order = Array.isArray(data?.participantOrder)
    ? data.participantOrder.map((entry) => normalizePersonKey(entry)).filter(Boolean)
    : Object.keys(data?.favoritesByOwner || {}).map((entry) => normalizePersonKey(entry))

  return uniqueValues(order)
}

function normalizeCategoryItems(ownerFavorites, categoryKey) {
  const rawItems = Array.isArray(ownerFavorites?.categories?.[categoryKey]) ? ownerFavorites.categories[categoryKey] : []
  const seen = new Set()
  const items = []

  for (const rawItem of rawItems) {
    const displayValue = normalizeDisplayText(rawItem)
    const comparableValue = normalizeComparableText(rawItem)

    if (!displayValue || seen.has(comparableValue)) continue

    seen.add(comparableValue)
    items.push(displayValue)
  }

  return items
}

export function selectFavoritePeople({ favoritesSource, profileSource } = {}) {
  const data = favoritesSource?.data
  const profileIdentities = collectProfileIdentities(profileSource)

  return collectOwnerKeys(favoritesSource)
    .map((ownerKey) => {
      const ownerFavorites = data?.favoritesByOwner?.[ownerKey]
      if (!ownerFavorites?.categories) return null

      const categories = FAVORITE_CATEGORY_ORDER.map((categoryKey) => {
        const items = normalizeCategoryItems(ownerFavorites, categoryKey)
        if (items.length === 0) return null

        return {
          key: categoryKey,
          label: FAVORITE_CATEGORY_LABELS[categoryKey] || categoryKey,
          items,
          itemCount: items.length,
        }
      }).filter(Boolean)

      const itemCount = categories.reduce((total, category) => total + category.itemCount, 0)
      if (itemCount === 0) return null

      const profileIdentity = profileIdentities.get(ownerKey)
      const unknownCategories = isPlainObject(ownerFavorites.unknownCategories) ? Object.keys(ownerFavorites.unknownCategories) : []
      const displayName = profileIdentity?.displayName || ownerKey

      return {
        id: ownerKey,
        displayName,
        shortName: displayName.split(/\s+/)[0] || displayName,
        displayNameSource: profileIdentity ? 'profile' : 'owner',
        categories,
        categoryCount: categories.length,
        itemCount,
        hiddenCategoryCount: unknownCategories.length,
      }
    })
    .filter(Boolean)
}

export function selectSharedFavorites(people) {
  const categories = []
  const exactMatches = []

  for (const categoryKey of FAVORITE_CATEGORY_ORDER) {
    const matchesByValue = new Map()

    for (const person of people) {
      const category = person.categories.find((entry) => entry.key === categoryKey)
      if (!category) continue

      for (const item of category.items) {
        const comparableValue = normalizeComparableText(item)
        if (!comparableValue) continue

        if (!matchesByValue.has(comparableValue)) {
          matchesByValue.set(comparableValue, {
            label: item,
            ownerIds: new Set(),
            ownerLabels: new Set(),
          })
        }

        const match = matchesByValue.get(comparableValue)
        match.ownerIds.add(person.id)
        match.ownerLabels.add(person.displayName)
      }
    }

    const categoryMatches = [...matchesByValue.entries()]
      .filter(([, match]) => match.ownerIds.size >= 2)
      .map(([comparableValue, match]) => ({
        id: `${categoryKey}-${slugify(comparableValue)}`,
        label: match.label,
        categoryKey,
        categoryLabel: FAVORITE_CATEGORY_LABELS[categoryKey] || categoryKey,
        ownerCount: match.ownerIds.size,
        owners: [...match.ownerLabels],
      }))

    if (categoryMatches.length === 0) continue

    categories.push({
      key: categoryKey,
      label: FAVORITE_CATEGORY_LABELS[categoryKey] || categoryKey,
      items: categoryMatches,
    })
    exactMatches.push(...categoryMatches)
  }

  return {
    state: exactMatches.length > 0 ? 'ready' : 'empty',
    exactMatches,
    categories,
  }
}

export function selectCategoryIndex(people) {
  return FAVORITE_CATEGORY_ORDER.map((categoryKey) => {
    const label = FAVORITE_CATEGORY_LABELS[categoryKey] || categoryKey
    const owners = people.filter((person) => person.categories.some((category) => category.key === categoryKey))
    const itemCount = owners.reduce((total, person) => {
      const category = person.categories.find((entry) => entry.key === categoryKey)
      return total + (category?.itemCount || 0)
    }, 0)

    if (itemCount === 0) return null

    return {
      key: categoryKey,
      label,
      ownerCount: owners.length,
      itemCount,
    }
  }).filter(Boolean)
}

function selectProfileEntry(profileSource, people) {
  const status = profileSource?.status || 'empty'
  let description = 'The paired profile spread stays nearby as part of the same read-only relationship space.'

  if (status === 'ready' && people.length > 0) {
    description = 'Profile keeps names, milestones, and shared context close to this favorites collection.'
  } else if (status === 'empty') {
    description = 'The profile route is ready even while some paired details remain quiet.'
  } else if (status === 'unavailable') {
    description = 'Profile details are still reconnecting on this routed origin.'
  } else if (status === 'invalid') {
    description = 'Stored profile details need review before they can support this collection.'
  }

  return {
    href: '/profile',
    title: 'Shared profile',
    status,
    description,
  }
}

function selectContractEntry(contractSource) {
  const signatures = contractSource?.data?.signaturesByUsername || {}
  const signatureCount = Object.keys(signatures).length
  const acceptedCount = Object.values(signatures).filter((signature) => signature?.accepted === true).length
  const status = contractSource?.status || 'empty'

  let description = 'The relationship contract stays protected, quiet, and one step down from this shared collection.'
  if (status === 'ready' && signatureCount > 0) {
    description = `${acceptedCount} of ${signatureCount} preserved signatures remain available from the contract surface.`
  } else if (status === 'ready' && contractSource?.data?.accepted) {
    description = 'The active approved account has already accepted the preserved contract.'
  } else if (status === 'unavailable') {
    description = 'The contract route remains protected even while its preserved details stay disconnected here.'
  } else if (status === 'invalid') {
    description = 'Stored contract details need review before they can be summarized here.'
  }

  return {
    href: '/contract',
    title: 'Relationship contract',
    status,
    description,
  }
}

export function selectFavoritesEntries({ contractSource, profileSource, people }) {
  return {
    profile: selectProfileEntry(profileSource, people),
    contract: selectContractEntry(contractSource),
  }
}

export function selectFavoritesSourceStatus(snapshot, people, shared) {
  const sources = snapshot?.sources || {}
  const favoritesItem = summarizeSource('favorites', sources.favorites)
  const profileItem = summarizeSource('profile', sources.profile)
  const hiddenCategoryCount = people.reduce((total, person) => total + person.hiddenCategoryCount, 0)

  const notes = []

  if (favoritesItem.status === 'unavailable') {
    notes.push('Your saved favorites remain safely in the legacy book until this route can read them here.')
  }

  if (favoritesItem.status === 'invalid') {
    notes.push('Stored favorites are being held back until they can be reviewed safely.')
  }

  if (favoritesItem.status === 'empty' || (favoritesItem.status === 'ready' && people.length === 0)) {
    notes.push('Favorites will gather here as the shared book grows.')
  }

  if (people.length === 1) {
    notes.push('One preserved collection is visible here already; the rest can reconnect later without rewriting the source.')
  }

  if (profileItem.status === 'unavailable' || profileItem.status === 'invalid') {
    notes.push('Names stay exactly as preserved until the paired profile details reconnect here safely.')
  }

  if (hiddenCategoryCount > 0) {
    notes.push(
      `Some preserved favorite ${hiddenCategoryCount === 1 ? 'field stays' : 'fields stay'} tucked away until their categories can be reviewed safely.`,
    )
  }

  if (shared.exactMatches.length === 0 && people.length >= 2 && favoritesItem.status === 'ready') {
    notes.push('Different favorites, one shared collection.')
  }

  const items = [favoritesItem, profileItem]
  const overall = items.some((item) => item.status === 'invalid')
    ? 'invalid'
    : items.some((item) => item.status === 'unavailable')
      ? 'partial'
      : items.some((item) => item.status === 'ready')
        ? 'ready'
        : 'empty'

  return {
    overall,
    items,
    notes: uniqueValues(notes),
  }
}

export function deriveFavoritesStatus({ favoritesSource, people, profileSource }) {
  const favoritesStatus = favoritesSource?.status || 'empty'
  const profileStatus = profileSource?.status || 'empty'

  if (favoritesStatus === 'invalid') return 'invalid'
  if (favoritesStatus === 'unavailable') return 'unavailable'
  if (people.length === 0) return favoritesStatus === 'ready' ? 'empty' : favoritesStatus
  if (people.length === 1) return 'partial'
  if (profileStatus === 'unavailable' || profileStatus === 'invalid') return 'partial'
  return 'ready'
}

export function describeFavoritesCounts(model) {
  const visiblePeople = pluralize(model.people.length, 'collection')
  const visibleCategories = pluralize(model.categoryIndex.length, 'category', 'categories')

  if (model.shared.exactMatches.length > 0) {
    return `${visiblePeople} visible, ${visibleCategories} preserved, and ${pluralize(model.shared.exactMatches.length, 'exact overlap')} ready.`
  }

  return `${visiblePeople} visible and ${visibleCategories} preserved.`
}
