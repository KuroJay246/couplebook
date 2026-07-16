import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import test from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { protectedRouteMeta } from '../app/routeConfig.js'
import { buildContractReadModel } from '../features/contract/contractReadModel.js'
import { buildDashboardReadModel } from '../features/dashboard/dashboardReadModel.js'
import { buildFavoritesReadModel } from '../features/favorites/favoritesReadModel.js'
import { buildGalleryReadModel } from '../features/gallery/galleryReadModel.js'
import { loadFirestoreCompatibilitySnapshot } from '../features/compatibility/firestoreCompatibilityService.js'
import { buildProfileReadModel } from '../features/profile/profileReadModel.js'
import { buildSettingsReadModel } from '../features/settings/settingsReadModel.js'
import { buildSpecialMomentContentModel } from '../features/specialMoments/specialMomentContentModel.js'
import { buildTimelineReadModel } from '../features/timeline/timelineReadModel.js'

const projectId = 'demo-couplebook-app-v2'
const rules = readFileSync(path.resolve('../firestore.app-v2.rules'), 'utf8')
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST)

const ids = Object.freeze({
  memberOne: 'member_one',
  memberTwo: 'member_two',
  inactive: 'inactive_member',
  outsider: 'outsider_user',
  couple: 'couple_alpha',
  otherCouple: 'couple_beta',
  otherMember: 'other_member',
})

let env

test.before(async () => {
  if (!hasEmulator) return
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8085,
      rules,
    },
  })
})

test.after(async () => {
  if (!env) return
  await env.cleanup()
})

test.beforeEach(async () => {
  if (!hasEmulator) return
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'users', ids.memberOne), { approved: true, coupleId: ids.couple, displayName: 'Member One', schemaVersion: 1 })
    await setDoc(doc(db, 'users', ids.memberTwo), { approved: true, coupleId: ids.couple, displayName: 'Member Two', schemaVersion: 1 })
    await setDoc(doc(db, 'users', ids.inactive), { approved: true, coupleId: ids.couple, displayName: 'Inactive', schemaVersion: 1 })
    await setDoc(doc(db, 'users', ids.outsider), { approved: false, coupleId: ids.couple, displayName: 'Outsider', schemaVersion: 1 })
    await setDoc(doc(db, 'users', ids.otherMember), { approved: true, coupleId: ids.otherCouple, displayName: 'Other', schemaVersion: 1 })

    await setDoc(doc(db, 'couples', ids.couple), { title: 'Fictional Couple', migrationVersion: 1, schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.otherCouple), { title: 'Other Couple', migrationVersion: 1, schemaVersion: 1 })

    await setDoc(doc(db, 'couples', ids.couple, 'members', ids.memberOne), { active: true, role: 'member', schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.couple, 'members', ids.memberTwo), { active: true, role: 'member', schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.couple, 'members', ids.inactive), { active: false, role: 'member', schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.otherCouple, 'members', ids.otherMember), { active: true, role: 'member', schemaVersion: 1 })

    for (const uid of [ids.memberOne, ids.memberTwo]) {
      await setDoc(doc(db, 'couples', ids.couple, 'profiles', uid), { name: uid, bio: 'Fictional bio', schemaVersion: 1 })
      await setDoc(doc(db, 'couples', ids.couple, 'favorites', uid), { food: ['fictional cake'], places: [], hobbies: [], activities: [], schemaVersion: 1 })
    }
    await setDoc(doc(db, 'couples', ids.otherCouple, 'profiles', ids.otherMember), { name: 'Other', schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.couple, 'settings', 'shared'), { theme: 'paper', schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.couple, 'settings', ids.memberOne), { theme: 'paper', privacy: { localOnlyMode: true }, schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.couple, 'settings', ids.memberTwo), { theme: 'paper', privacy: { localOnlyMode: false }, schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.couple, 'contracts', 'current'), { title: 'Fictional contract', acceptedBy: [ids.memberOne], signatureStatus: 'status-only', schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.couple, 'memories', 'memory_one'), { title: 'Fictional memory', date: '2026-01-01', mediaState: 'none', schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.couple, 'specialMoments', 'birthday'), { title: 'Fictional birthday', sections: [{ kind: 'paragraph', content: 'Fictional text' }], schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.couple, 'specialMoments', 'valentine'), { title: 'Fictional valentine', sections: [{ kind: 'note', content: 'Fictional text' }], schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.couple, 'specialMoments', 'confession'), { title: 'Fictional confession', sections: [{ kind: 'quote', content: 'Fictional text' }], schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.couple, 'specialMoments', 'unapproved'), { title: 'Nope', schemaVersion: 1 })
  })
})

function authed(uid) {
  return env.authenticatedContext(uid).firestore()
}

function signedOut() {
  return env.unauthenticatedContext().firestore()
}

function domainRefs(db, coupleId = ids.couple, uid = ids.memberOne) {
  return [
    doc(db, 'users', uid),
    doc(db, 'couples', coupleId),
    doc(db, 'couples', coupleId, 'members', uid),
    doc(db, 'couples', coupleId, 'profiles', uid),
    doc(db, 'couples', coupleId, 'favorites', uid),
    doc(db, 'couples', coupleId, 'settings', 'shared'),
    doc(db, 'couples', coupleId, 'contracts', 'current'),
    doc(db, 'couples', coupleId, 'memories', 'memory_one'),
    doc(db, 'couples', coupleId, 'specialMoments', 'birthday'),
  ]
}

test('signed out cannot read or write candidate app-v2 data', { skip: !hasEmulator }, async () => {
  const db = signedOut()
  for (const reference of domainRefs(db)) {
    await assertFails(getDoc(reference))
    await assertFails(setDoc(reference, { unsafe: true }))
  }
})

test('active member one can read permitted targeted documents only', { skip: !hasEmulator }, async () => {
  const db = authed(ids.memberOne)
  await assertSucceeds(getDoc(doc(db, 'users', ids.memberOne)))
  await assertFails(getDoc(doc(db, 'users', ids.memberTwo)))
  await assertFails(getDocs(collection(db, 'users')))
  await assertSucceeds(getDoc(doc(db, 'couples', ids.couple)))
  await assertSucceeds(getDoc(doc(db, 'couples', ids.couple, 'members', ids.memberOne)))
  await assertFails(getDoc(doc(db, 'couples', ids.couple, 'members', ids.memberTwo)))
  await assertSucceeds(getDoc(doc(db, 'couples', ids.couple, 'profiles', ids.memberTwo)))
  await assertSucceeds(getDocs(collection(db, 'couples', ids.couple, 'profiles')))
  await assertSucceeds(getDoc(doc(db, 'couples', ids.couple, 'favorites', ids.memberTwo)))
  await assertSucceeds(getDoc(doc(db, 'couples', ids.couple, 'settings', 'shared')))
  await assertSucceeds(getDoc(doc(db, 'couples', ids.couple, 'settings', ids.memberOne)))
  await assertFails(getDoc(doc(db, 'couples', ids.couple, 'settings', ids.memberTwo)))
  await assertSucceeds(getDoc(doc(db, 'couples', ids.couple, 'contracts', 'current')))
  await assertSucceeds(getDocs(collection(db, 'couples', ids.couple, 'memories')))
  await assertSucceeds(getDoc(doc(db, 'couples', ids.couple, 'specialMoments', 'birthday')))
  await assertSucceeds(getDoc(doc(db, 'couples', ids.couple, 'specialMoments', 'valentine')))
  await assertSucceeds(getDoc(doc(db, 'couples', ids.couple, 'specialMoments', 'confession')))
  await assertFails(getDoc(doc(db, 'couples', ids.couple, 'specialMoments', 'unapproved')))
})

test('second active member receives same couple access but not private settings or other couples', { skip: !hasEmulator }, async () => {
  const db = authed(ids.memberTwo)
  await assertSucceeds(getDoc(doc(db, 'users', ids.memberTwo)))
  await assertSucceeds(getDoc(doc(db, 'couples', ids.couple)))
  await assertSucceeds(getDoc(doc(db, 'couples', ids.couple, 'profiles', ids.memberOne)))
  await assertSucceeds(getDoc(doc(db, 'couples', ids.couple, 'favorites', ids.memberOne)))
  await assertFails(getDoc(doc(db, 'couples', ids.couple, 'settings', ids.memberOne)))
  await assertFails(getDoc(doc(db, 'couples', ids.otherCouple)))
  await assertFails(getDocs(collection(db, 'couples', ids.otherCouple, 'profiles')))
})

test('unauthorized, inactive, and cross-couple users fail closed', { skip: !hasEmulator }, async () => {
  for (const uid of [ids.outsider, ids.inactive, ids.otherMember]) {
    const db = authed(uid)
    await assertFails(getDoc(doc(db, 'couples', ids.couple)))
    await assertFails(getDoc(doc(db, 'couples', ids.couple, 'members', uid)))
    await assertFails(getDoc(doc(db, 'couples', ids.couple, 'profiles', ids.memberOne)))
    await assertFails(getDoc(doc(db, 'couples', ids.couple, 'favorites', ids.memberOne)))
    await assertFails(getDoc(doc(db, 'couples', ids.couple, 'settings', 'shared')))
    await assertFails(getDoc(doc(db, 'couples', ids.couple, 'contracts', 'current')))
    await assertFails(getDoc(doc(db, 'couples', ids.couple, 'memories', 'memory_one')))
    await assertFails(getDoc(doc(db, 'couples', ids.couple, 'specialMoments', 'birthday')))
  }
})

test('unknown paths and all client writes are denied', { skip: !hasEmulator }, async () => {
  const db = authed(ids.memberOne)
  await assertFails(getDoc(doc(db, 'couples', ids.couple, 'unknown', 'doc')))
  await assertFails(setDoc(doc(db, 'couples', ids.couple, 'profiles', ids.memberOne), { name: 'Changed' }))
  await assertFails(updateDoc(doc(db, 'couples', ids.couple, 'profiles', ids.memberOne), { name: 'Changed' }))
  await assertFails(deleteDoc(doc(db, 'couples', ids.couple, 'profiles', ids.memberOne)))

  const batch = writeBatch(db)
  batch.set(doc(db, 'couples', ids.couple, 'profiles', 'new_profile'), { name: 'New' })
  await assertFails(batch.commit())

  await assertFails(
    runTransaction(db, async (transaction) => {
      transaction.update(doc(db, 'couples', ids.couple, 'contracts', 'current'), { title: 'Changed' })
    }),
  )
})

test('app-v2 Firestore source mode reads seeded fictional data through read models', { skip: !hasEmulator }, async () => {
  const db = authed(ids.memberOne)
  const approvedUser = { uid: ids.memberOne, username: 'Member One', displayName: 'Member One', coupleId: ids.couple }
  const snapshot = await loadFirestoreCompatibilitySnapshot({ approvedUser, firestore: db })

  const dashboard = buildDashboardReadModel({ approvedUser, compatibilitySnapshot: snapshot, routeMeta: protectedRouteMeta })
  const profile = buildProfileReadModel({ approvedUser, compatibilitySnapshot: snapshot })
  const favorites = buildFavoritesReadModel({ approvedUser, compatibilitySnapshot: snapshot })
  const settings = buildSettingsReadModel({ approvedUser, compatibilitySnapshot: snapshot })
  const contract = buildContractReadModel({ approvedUser, compatibilitySnapshot: snapshot })
  const timeline = buildTimelineReadModel({ compatibilitySnapshot: snapshot })
  const gallery = buildGalleryReadModel({ compatibilitySnapshot: snapshot })
  const birthday = buildSpecialMomentContentModel({
    momentKey: 'birthday',
    contentSource: snapshot.sources.specialMoments.birthday,
    contentState: snapshot.sources.specialMoments.birthday.status,
  })

  assert.equal(snapshot.status, 'ready')
  assert.ok(['ready', 'partial'].includes(profile.status))
  assert.ok(['ready', 'partial'].includes(favorites.status))
  assert.ok(['ready', 'partial'].includes(settings.status))
  assert.ok(['ready', 'partial'].includes(contract.status))
  assert.ok(['ready', 'partial'].includes(timeline.status))
  assert.ok(['ready', 'partial'].includes(gallery.status))
  assert.equal(birthday.status, 'ready')
  assert.equal(dashboard.recentMemories.totalCount, 1)
  assert.equal(snapshot.sources.memories.data.memories[0].mediaState, 'none')
})

test('rules source has no public reads, hardcoded real UIDs, email authority, or broad writes', () => {
  assert.doesNotMatch(rules, /allow\s+read\s*:\s*if\s+true/)
  assert.doesNotMatch(rules, /allow\s+(create|update|delete|write)\s*:\s*if\s+true/)
  assert.doesNotMatch(rules, /request\.auth\.token\.email/)
  assert.doesNotMatch(rules, /oauPl1OU|IvfHjC5/)
})
