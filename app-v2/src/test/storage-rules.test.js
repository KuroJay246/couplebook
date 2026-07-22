import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc } from 'firebase/firestore'
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage'

const projectId = 'demo-couplebook-app-v2'
const bucket = `${projectId}.appspot.com`
const rules = readFileSync(path.resolve('../storage.app-v2.rules'), 'utf8')
const hasEmulator = Boolean(process.env.FIREBASE_STORAGE_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST)

const ids = Object.freeze({
  owner: 'member_one',
  partner: 'member_two',
  pendingPartner: 'pending_partner',
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
    },
    storage: {
      host: '127.0.0.1',
      port: 9199,
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
  await env.clearStorage()
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'users', ids.owner), { approved: true, accessStatus: 'active', coupleId: ids.couple, schemaVersion: 1 })
    await setDoc(doc(db, 'users', ids.partner), { approved: true, accessStatus: 'active', coupleId: ids.couple, schemaVersion: 1 })
    await setDoc(doc(db, 'users', ids.pendingPartner), { approved: true, accessStatus: 'pending', coupleId: ids.couple, schemaVersion: 1 })
    await setDoc(doc(db, 'users', ids.inactive), { approved: true, accessStatus: 'active', coupleId: ids.couple, schemaVersion: 1 })
    await setDoc(doc(db, 'users', ids.outsider), { approved: false, accessStatus: 'active', coupleId: ids.couple, schemaVersion: 1 })
    await setDoc(doc(db, 'users', ids.otherMember), { approved: true, accessStatus: 'active', coupleId: ids.otherCouple, schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.couple, 'members', ids.owner), { active: true, role: 'member', schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.couple, 'members', ids.partner), { active: true, role: 'member', schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.couple, 'members', ids.pendingPartner), { active: true, role: 'member', schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.couple, 'members', ids.inactive), { active: false, role: 'member', schemaVersion: 1 })
    await setDoc(doc(db, 'couples', ids.otherCouple, 'members', ids.otherMember), { active: true, role: 'member', schemaVersion: 1 })
  })
})

function storageFor(uid) {
  return uid ? env.authenticatedContext(uid).storage(bucket) : env.unauthenticatedContext().storage(bucket)
}

function mediaRef(storage, coupleId = ids.couple, mediaId = 'media_exact_001', variant = 'original') {
  return ref(storage, `couples/${coupleId}/media/${mediaId}/${variant}`)
}

function metadata(uid = ids.owner, overrides = {}) {
  return {
    contentType: 'video/mp4',
    customMetadata: {
      coupleId: ids.couple,
      mediaId: 'media_exact_001',
      ownerUid: uid,
      schemaVersion: '1',
      kind: 'video',
      extension: 'mp4',
      ...overrides,
    },
  }
}

async function seedObject() {
  await assertSucceeds(uploadBytes(mediaRef(storageFor(ids.owner)), new Uint8Array([1, 2, 3]), metadata()))
}

test('active owner can upload, read, and delete a valid private media object', { skip: !hasEmulator }, async () => {
  const ownerStorage = storageFor(ids.owner)
  const objectRef = mediaRef(ownerStorage)
  await assertSucceeds(uploadBytes(objectRef, new Uint8Array([1, 2, 3]), metadata()))
  await assertSucceeds(getBytes(objectRef))
  await assertSucceeds(deleteObject(objectRef))
})

test('active couple member can read but cannot delete another owner object', { skip: !hasEmulator }, async () => {
  await seedObject()
  await assertSucceeds(getBytes(mediaRef(storageFor(ids.partner))))
  await assertFails(deleteObject(mediaRef(storageFor(ids.partner))))
})

test('pending, signed-out, inactive, unauthorized, and cross-couple users are denied', { skip: !hasEmulator }, async () => {
  await seedObject()
  for (const uid of [null, ids.pendingPartner, ids.inactive, ids.outsider, ids.otherMember]) {
    const candidateStorage = storageFor(uid)
    await assertFails(getBytes(mediaRef(candidateStorage)))
    await assertFails(uploadBytes(mediaRef(candidateStorage), new Uint8Array([1]), metadata(uid || ids.owner)))
  }
})

test('invalid paths, MIME types, extensions, size, and metadata tampering are denied', { skip: !hasEmulator }, async () => {
  const ownerStorage = storageFor(ids.owner)
  await assertFails(uploadBytes(ref(ownerStorage, 'users/member_one/media/file'), new Uint8Array([1]), metadata()))
  await assertFails(uploadBytes(mediaRef(ownerStorage, ids.otherCouple), new Uint8Array([1]), metadata()))
  await assertFails(uploadBytes(mediaRef(ownerStorage), new Uint8Array([1]), metadata(ids.owner, { coupleId: ids.otherCouple })))
  await assertFails(uploadBytes(mediaRef(ownerStorage), new Uint8Array([1]), metadata(ids.partner)))
  await assertFails(uploadBytes(mediaRef(ownerStorage), new Uint8Array([1]), metadata(ids.owner, { kind: 'script', extension: 'js' })))
  await assertFails(uploadBytes(mediaRef(ownerStorage), new Uint8Array([1]), { ...metadata(), contentType: 'application/javascript' }))
  await assertFails(uploadBytes(
    mediaRef(ownerStorage, ids.couple, 'media_exact_001', 'thumbnail'),
    new Uint8Array(6 * 1024 * 1024),
    {
      contentType: 'image/jpeg',
      customMetadata: {
        coupleId: ids.couple,
        mediaId: 'media_exact_001',
        ownerUid: ids.owner,
        schemaVersion: '1',
        kind: 'image',
        extension: 'jpg',
      },
    },
  ))
})

test('thumbnail and poster variants require image derivative content', { skip: !hasEmulator }, async () => {
  const ownerStorage = storageFor(ids.owner)
  const derivativeMetadata = {
    contentType: 'image/jpeg',
    customMetadata: {
      coupleId: ids.couple,
      mediaId: 'media_exact_001',
      ownerUid: ids.owner,
      schemaVersion: '1',
      kind: 'video',
      extension: 'jpg',
    },
  }
  await assertSucceeds(uploadBytes(mediaRef(ownerStorage, ids.couple, 'media_exact_001', 'poster'), new Uint8Array([1]), derivativeMetadata))
  await assertSucceeds(uploadBytes(mediaRef(ownerStorage, ids.couple, 'media_exact_001', 'thumbnail'), new Uint8Array([1]), derivativeMetadata))
  await assertFails(uploadBytes(mediaRef(ownerStorage, ids.couple, 'media_exact_001', 'thumbnail'), new Uint8Array([1]), metadata()))
})

test('storage rules source has no public access or hardcoded real user ids', () => {
  assert.doesNotMatch(rules, /allow\s+read\s*:\s*if\s+true/)
  assert.doesNotMatch(rules, /allow\s+write\s*:\s*if\s+true/)
  assert.doesNotMatch(rules, /oauPl1OU|IvfHjC5/)
  assert.match(rules, /accessStatus.*'active'/s)
})
