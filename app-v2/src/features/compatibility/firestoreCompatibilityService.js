import { createCompatibilityResult, FIRESTORE_SOURCE, freezeClone, normalizePersonKey } from '../../data/adapterUtils.js'
import { getCoupleDocumentSnapshot, getCoupleMembership } from '../../services/coupleService.js'
import { getFirestoreContract } from '../../services/contractService.js'
import { getFirestoreFavoritesForCouple } from '../../services/favoritesService.js'
import { getFirestoreProfilesForCouple } from '../../services/profileService.js'

function unavailable(message) {
  return createCompatibilityResult({
    status: 'unavailable',
    source: FIRESTORE_SOURCE,
    warnings: [message],
  })
}

function normalizeOwnerLabel(entry, fallback) {
  return normalizePersonKey(entry?.name || entry?.displayName || fallback)
}

function favoritesToCompatibility(result, profiles) {
  if (result.status !== 'ready' && result.status !== 'partial') return result
  const profileEntries = profiles?.data?.entries || []
  const labelByUid = new Map(profileEntries.map((entry) => [entry.uid, normalizeOwnerLabel(entry, entry.uid)]))
  const favoritesByOwner = {}
  const participantOrder = []
  for (const entry of result.data?.entries || []) {
    const owner = labelByUid.get(entry.uid) || normalizePersonKey(entry.uid)
    participantOrder.push(owner)
    favoritesByOwner[owner] = {
      revision: Number.isInteger(entry.revision) && entry.revision > 0 ? entry.revision : 0,
      categories: {
        food: entry.favorites?.food || [],
        places: entry.favorites?.places || [],
        hobbies: entry.favorites?.hobbies || [],
        activities: entry.favorites?.activities || [],
      },
      unknownCategories: {},
    }
  }
  return createCompatibilityResult({
    status: participantOrder.length ? result.status : 'empty',
    source: FIRESTORE_SOURCE,
    data: { favoritesByOwner, participantOrder, unknownTopLevelFields: {} },
    warnings: result.warnings,
  })
}

function contractToCompatibility(result, username) {
  if (result.status !== 'ready' && result.status !== 'partial') return result
  return createCompatibilityResult({
    status: result.status,
    source: FIRESTORE_SOURCE,
    data: {
      username,
      accepted: Array.isArray(result.data?.acceptedBy) && result.data.acceptedBy.length > 0,
      activeSignature: null,
      signaturesByUsername: {},
      firestoreContract: freezeClone(result.data),
    },
    warnings: result.warnings,
  })
}

function collectWarnings(results) {
  return results.flatMap((result) => result?.warnings || [])
}

function deriveStatus(results) {
  if (results.some((result) => result?.status === 'invalid')) return 'ready'
  if (results.some((result) => result?.status === 'ready' || result?.status === 'partial')) return 'ready'
  if (results.some((result) => result?.status === 'unavailable')) return 'empty'
  return 'empty'
}

export async function loadFirestoreCompatibilitySnapshot(options = {}) {
  const approvedUser = options.approvedUser || null
  const uid = approvedUser?.uid
  const coupleId = approvedUser?.coupleId || approvedUser?.raw?.coupleId
  const username = approvedUser?.username || approvedUser?.displayName || uid

  if (!uid || !coupleId) {
    const missingUserSource = unavailable('Firestore mode requires an approved user document with a coupleId.')
    return {
      status: 'empty',
      sources: {
        favorites: missingUserSource,
        contract: missingUserSource,
      },
      warnings: ['Firestore mode requires targeted users/{uid}.coupleId before domain reads.'],
    }
  }

  const serviceOptions = { firestore: options.firestore }
  const [
    couple,
    membership,
    profilesRaw,
    favoritesRaw,
    contract,
  ] = await Promise.all([
    getCoupleDocumentSnapshot(coupleId, serviceOptions),
    getCoupleMembership(coupleId, uid, serviceOptions),
    getFirestoreProfilesForCouple(coupleId, serviceOptions),
    getFirestoreFavoritesForCouple(coupleId, serviceOptions),
    getFirestoreContract(coupleId, serviceOptions),
  ])

  const favorites = favoritesToCompatibility(favoritesRaw, profilesRaw)
  const contractSource = contractToCompatibility(contract, username)
  const sources = { favorites, contract: contractSource }
  const results = [couple, membership, profilesRaw, ...Object.values(sources)]

  return Object.freeze({
    status: deriveStatus(results),
    sources,
    firestoreMeta: freezeClone({ couple, membership }),
    warnings: Object.freeze(collectWarnings(results)),
  })
}
