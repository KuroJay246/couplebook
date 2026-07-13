import { freezeClone } from '../../data/adapterUtils.js'
import {
  deriveFavoritesStatus,
  selectCategoryIndex,
  selectFavoritePeople,
  selectFavoritesEntries,
  selectFavoritesSourceStatus,
  selectSharedFavorites,
} from './favoritesSelectors.js'

export function buildFavoritesReadModel({ approvedUser = null, compatibilitySnapshot = null } = {}) {
  const snapshot = compatibilitySnapshot || {
    status: 'empty',
    sources: {},
    warnings: [],
  }

  const people = selectFavoritePeople({
    approvedUser,
    favoritesSource: snapshot.sources?.favorites,
    profileSource: snapshot.sources?.profile,
  })
  const shared = selectSharedFavorites(people)
  const categoryIndex = selectCategoryIndex(people)
  const entries = selectFavoritesEntries({
    contractSource: snapshot.sources?.contract,
    profileSource: snapshot.sources?.profile,
    people,
  })
  const sourceStatus = selectFavoritesSourceStatus(snapshot, people, shared)

  return freezeClone({
    status: deriveFavoritesStatus({
      favoritesSource: snapshot.sources?.favorites,
      people,
      profileSource: snapshot.sources?.profile,
    }),
    people,
    shared,
    categoryIndex,
    entries,
    sourceStatus,
  })
}
