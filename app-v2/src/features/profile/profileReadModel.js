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

export function buildProfileReadModel({ approvedUser = null, compatibilitySnapshot = null } = {}) {
  const snapshot = compatibilitySnapshot || {
    status: 'empty',
    sources: {},
    warnings: [],
  }

  const people = selectProfilePeople(snapshot.sources?.profile, approvedUser)
  const relationship = {
    title: selectRelationshipTitle(people),
    summary:
      people.length >= 2
        ? 'The relationship remains the subject of this shared space, with individual details nested inside one quieter spread.'
        : 'The shared relationship frame is ready, but the paired profile details still need their read-only bridge.',
    anniversaries: selectRelationshipAnniversaries(people),
    milestones: selectRelationshipMilestones(people, snapshot.sources?.contract),
  }
  const sharedHighlights = selectSharedHighlights(snapshot.sources?.favorites)
  const entries = {
    contract: selectContractEntry(snapshot.sources?.contract),
    favorites: selectFavoritesEntry(snapshot.sources?.favorites, sharedHighlights),
  }
  const sourceStatus = selectProfileSourceStatus(snapshot)
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
