import { freezeClone } from '../../data/adapterUtils.js'
import {
  deriveProfileStatus,
  selectContractEntry,
  selectFavoritesEntry,
  selectImportantDates,
  selectProfilePeople,
  selectProfileSourceStatus,
  selectRelationshipAnniversaries,
  selectRelationshipMilestones,
  selectRelationshipTitle,
  selectSharedHighlights,
} from './profileSelectors.js'

export function buildProfileReadModel({
  approvedUser = null,
  compatibilitySnapshot = null,
  contractSource = null,
  favoritesSource = null,
  profileSource = null,
} = {}) {
  const snapshot = compatibilitySnapshot || {
    status: 'empty',
    sources: {},
    warnings: [],
  }
  const resolvedSnapshot = {
    ...snapshot,
    sources: {
      ...(snapshot.sources || {}),
      contract: contractSource || snapshot.sources?.contract,
      favorites: favoritesSource || snapshot.sources?.favorites,
      profile: profileSource || snapshot.sources?.profile,
    },
  }

  const people = selectProfilePeople(resolvedSnapshot.sources?.profile, approvedUser)
  const importantDates = selectImportantDates(people, resolvedSnapshot.sources?.contract)
  const primaryAnniversary = importantDates.find((item) => item.type === 'relationship') || null
  const nextImportantDate = importantDates[0] || null
  const relationship = {
    title: selectRelationshipTitle(people),
    summary:
      people.length >= 2
        ? `${people.map((person) => person.shortName || person.displayName).join(' + ')}`
        : 'Add the second profile to complete this page.',
    anniversaries: selectRelationshipAnniversaries(people),
    importantDates,
    milestones: selectRelationshipMilestones(people, resolvedSnapshot.sources?.contract),
    nextImportantDate,
    primaryAnniversary,
  }
  const sharedHighlights = selectSharedHighlights(resolvedSnapshot.sources?.favorites)
  const entries = {
    contract: selectContractEntry(resolvedSnapshot.sources?.contract),
    favorites: selectFavoritesEntry(resolvedSnapshot.sources?.favorites, sharedHighlights),
  }
  const sourceStatus = selectProfileSourceStatus(resolvedSnapshot)
  const warnings = [...new Set(sourceStatus.warnings)]

  return freezeClone({
    status: deriveProfileStatus({
      people,
      relationship,
      sharedHighlights,
      sourceStatus,
    }),
    people,
    relationship,
    sharedHighlights,
    entries,
    sourceStatus,
    warnings,
  })
}
