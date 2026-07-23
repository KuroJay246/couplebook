import { createCompatibilityResult, FIRESTORE_SOURCE, freezeClone, normalizePersonKey } from '../../data/adapterUtils.js'
import { getCoupleDocumentSnapshot, getCoupleMembership } from '../../services/coupleService.js'
import { getFirestoreContract } from '../../services/contractService.js'
import { getFirestoreFavoritesForCouple } from '../../services/favoritesService.js'
import { getFirestoreMemoriesForCouple } from '../../services/memoryService.js'
import { getFirestoreProfilesForCouple } from '../../services/profileService.js'
import { getFirestorePrivateSettings, getFirestoreSharedSettings } from '../../services/settingsService.js'
import { getFirestoreSpecialMoment } from '../../services/specialMomentService.js'

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

function profilesToCompatibility(result) {
  if (result.status !== 'ready' && result.status !== 'partial') return result
  const profilesByUsername = {}
  const participantOrder = []
  for (const entry of result.data?.entries || []) {
    const owner = normalizeOwnerLabel(entry, entry.uid)
    participantOrder.push(owner)
    profilesByUsername[owner] = {
      name: entry.name || owner,
      bio: entry.bio || '',
      avatar: '',
      anniversaryView: entry.anniversaryView || null,
      joinedDate: entry.joinedDate || null,
      birthday: entry.birthday || null,
      unknownFields: {},
    }
  }
  return createCompatibilityResult({
    status: participantOrder.length ? result.status : 'empty',
    source: FIRESTORE_SOURCE,
    data: { profilesByUsername, participantOrder, unknownTopLevelFields: {} },
    warnings: result.warnings,
  })
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

function settingsToCompatibility({ shared, privateResult, username }) {
  if (![shared.status, privateResult.status].some((status) => status === 'ready' || status === 'partial')) {
    return privateResult.status === 'invalid' ? privateResult : shared
  }
  const privateData = privateResult.data || {}
  const sharedData = shared.data || {}
  return createCompatibilityResult({
    status: 'ready',
    source: FIRESTORE_SOURCE,
    data: {
      username,
      theme: privateData.theme || sharedData.theme || null,
      usedGlobalThemeFallback: false,
      settings: {
        anniversaryConfig: privateData.anniversaryView || sharedData.anniversaryView || null,
        privacyToggles: {
          localOnlyMode: privateData.privacy?.localOnlyMode === true,
          reducedMotion: privateData.privacy?.reducedMotion === true,
          hideOfflineWarning: false,
          unknownFields: {},
        },
        unknownFields: {},
      },
    },
    warnings: [...(shared.warnings || []), ...(privateResult.warnings || [])],
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
    return {
      status: 'empty',
      sources: {
        favorites: unavailable('Firestore mode requires an approved user document with a coupleId.'),
        profile: unavailable('Firestore mode requires an approved user document with a coupleId.'),
        settings: unavailable('Firestore mode requires an approved user document with a coupleId.'),
        contract: unavailable('Firestore mode requires an approved user document with a coupleId.'),
        memories: unavailable('Firestore mode requires an approved user document with a coupleId.'),
        specialMoments: {
          birthday: unavailable('Firestore mode requires an approved user document with a coupleId.'),
          valentine: unavailable('Firestore mode requires an approved user document with a coupleId.'),
          confession: unavailable('Firestore mode requires an approved user document with a coupleId.'),
        },
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
    sharedSettings,
    privateSettings,
    contract,
    memories,
    birthday,
    valentine,
    confession,
  ] = await Promise.all([
    getCoupleDocumentSnapshot(coupleId, serviceOptions),
    getCoupleMembership(coupleId, uid, serviceOptions),
    getFirestoreProfilesForCouple(coupleId, serviceOptions),
    getFirestoreFavoritesForCouple(coupleId, serviceOptions),
    getFirestoreSharedSettings(coupleId, serviceOptions),
    getFirestorePrivateSettings(coupleId, uid, serviceOptions),
    getFirestoreContract(coupleId, serviceOptions),
    getFirestoreMemoriesForCouple(coupleId, serviceOptions),
    getFirestoreSpecialMoment(coupleId, 'birthday', serviceOptions),
    getFirestoreSpecialMoment(coupleId, 'valentine', serviceOptions),
    getFirestoreSpecialMoment(coupleId, 'confession', serviceOptions),
  ])

  const profile = profilesToCompatibility(profilesRaw)
  const favorites = favoritesToCompatibility(favoritesRaw, profilesRaw)
  const settings = settingsToCompatibility({ shared: sharedSettings, privateResult: privateSettings, username })
  const contractSource = contractToCompatibility(contract, username)
  const specialMoments = Object.freeze({ birthday, valentine, confession })
  const sources = { favorites, profile, settings, contract: contractSource, memories, specialMoments }
  const results = [couple, membership, ...Object.values(sources), birthday, valentine, confession]

  return Object.freeze({
    status: deriveStatus(results),
    sources,
    firestoreMeta: freezeClone({ couple, membership }),
    warnings: Object.freeze(collectWarnings(results)),
  })
}
