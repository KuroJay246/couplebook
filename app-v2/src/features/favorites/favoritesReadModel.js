import { freezeClone } from '../../data/adapterUtils.js'
import {
  deriveFavoritesStatus,
  selectCategoryIndex,
  selectFavoritePeople,
  selectFavoritesEntries,
  selectFavoritesSourceStatus,
  selectSharedFavorites,
} from './favoritesSelectors.js'

export function buildFavoritesReadModel({
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
  const resolvedContractSource = contractSource || snapshot.sources?.contract
  const resolvedFavoritesSource = favoritesSource || snapshot.sources?.favorites
  const resolvedProfileSource = profileSource || snapshot.sources?.profile

  const people = selectFavoritePeople({
    approvedUser,
    favoritesSource: resolvedFavoritesSource,
    profileSource: resolvedProfileSource,
  })
  const shared = selectSharedFavorites(people)
  const categoryIndex = selectCategoryIndex(people)
  const entries = selectFavoritesEntries({
    contractSource: resolvedContractSource,
    profileSource: resolvedProfileSource,
    people,
  })
  const sourceStatus = selectFavoritesSourceStatus({
    ...snapshot,
    sources: {
      ...(snapshot.sources || {}),
      contract: resolvedContractSource,
      favorites: resolvedFavoritesSource,
      profile: resolvedProfileSource,
    },
  }, people, shared)

  return freezeClone({
    status: deriveFavoritesStatus({
      favoritesSource: resolvedFavoritesSource,
      people,
      profileSource: resolvedProfileSource,
    }),
    people,
    shared,
    categoryIndex,
    entries,
    sourceStatus,
  })
}
