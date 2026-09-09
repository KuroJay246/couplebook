import { freezeClone } from '../../data/adapterUtils.js'
import {
  deriveProfileStatus,
  selectContractEntry,
  selectFavoritesEntry,
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
  const relationship = {
    title: selectRelationshipTitle(people),
    summary:
      people.length >= 2
        ? 'The relationship remains the subject of this shared space, with individual details nested inside one quieter spread.'
        : 'The shared relationship frame is ready, but the paired profile details still need their read-only bridge.',
    anniversaries: selectRelationshipAnniversaries(people),
    milestones: selectRelationshipMilestones(people, resolvedSnapshot.sources?.contract),
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
