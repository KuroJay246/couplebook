import assert from 'node:assert/strict'
import test from 'node:test'
import {
  acceptContract,
  archiveMemory,
  saveMemory,
  saveOwnFavorites,
  saveOwnProfile,
  saveOwnSettings,
  saveSpecialMomentText,
} from '../services/firestoreWrites.js'

function createFirestoreStub({ active = true } = {}) {
  const writes = []
  const docs = new Map()

  function seed(path, data) {
    docs.set(path, { ...data })
  }

  seed('couples/couple_alpha/profiles/member_one', { revision: 0 })
  seed('couples/couple_alpha/favorites/member_one', { revision: 0 })
  seed('couples/couple_alpha/settings/member_one', { revision: 0 })
  seed('couples/couple_alpha/memories/memory_one', { revision: 0 })
  seed('couples/couple_alpha/contracts/current', { acceptedBy: [], schemaVersion: 1 })
  seed('couples/couple_alpha/specialMoments/birthday', { revision: 0 })

  return {
    writes,
    createDoc: (_firestore, ...pathParts) => ({ path: pathParts.join('/') }),
    getDocument: async (reference) => ({
      exists: () => {
        if (reference.path?.includes('/members/')) return true
        return docs.has(reference.path)
      },
      data: () => {
        if (reference.path?.includes('/members/')) return { active, role: 'member' }
        return docs.get(reference.path) || {}
      },
    }),
    setDocument: async (reference, data, options) => {
      writes.push({ kind: 'set', path: reference.path, data, options })
      docs.set(reference.path, { ...(docs.get(reference.path) || {}), ...data })
    },
    updateDocument: async (reference, data) => {
      writes.push({ kind: 'update', path: reference.path, data })
      docs.set(reference.path, { ...(docs.get(reference.path) || {}), ...data })
    },
  }
}

const context = Object.freeze({
  approvedUser: { uid: 'member_one', coupleId: 'couple_alpha' },
  env: { MODE: 'development', VITE_WRITE_MODE: 'firestore-emulator-write' },
  user: { uid: 'member_one' },
})

test('write services reject production-disabled mode before writing', async () => {
  const firestore = createFirestoreStub()
  await assert.rejects(
    saveOwnProfile({ name: 'Member One' }, { ...context, env: { MODE: 'production', VITE_WRITE_MODE: 'firestore-emulator-write' }, firestore, ...firestore }),
    /disabled/,
  )
  assert.equal(firestore.writes.length, 0)
})

test('write services allow explicit production Firestore write mode with active membership', async () => {
  const firestore = createFirestoreStub()
  await saveOwnProfile(
    { name: 'Member One', bio: 'Production-safe bio' },
    { ...context, env: { MODE: 'production', VITE_WRITE_MODE: 'firestore-production-write' }, firestore, ...firestore },
  )

  assert.equal(firestore.writes.length, 1)
  assert.equal(firestore.writes[0].path, 'couples/couple_alpha/profiles/member_one')
})

test('write services reject inactive couple membership before writing', async () => {
  const firestore = createFirestoreStub({ active: false })
  await assert.rejects(saveOwnFavorites({ food: ['cake'] }, { ...context, firestore, ...firestore }), /membership/)
  assert.equal(firestore.writes.length, 0)
})

test('write services validate text, categories, settings, memories, contract, and special moments', async () => {
  const firestore = createFirestoreStub()

  await saveOwnProfile({ name: 'Member One', bio: 'Safe bio', joinedDate: '2026-01-01' }, { ...context, firestore, ...firestore })
  await saveOwnFavorites({ food: ['cake', 'cake'] }, { ...context, firestore, ...firestore })
  await saveOwnSettings({ theme: 'plum', localOnlyMode: true, reducedMotion: true }, { ...context, firestore, ...firestore })
  await saveMemory('memory_one', { title: 'A day', date: '2026-02-14', tags: ['walk'], specialMomentType: 'ordinary' }, { ...context, firestore, ...firestore })
  await archiveMemory('memory_one', 1, { ...context, firestore, ...firestore })
  await acceptContract({ ...context, firestore, ...firestore })
  await saveSpecialMomentText('birthday', { title: 'Birthday', sections: [{ kind: 'paragraph', content: 'Safe text' }] }, { ...context, firestore, ...firestore })

  assert.equal(firestore.writes.length, 7)
  assert.equal(firestore.writes[0].data.revision, 1)
  assert.deepEqual(firestore.writes[1].data.food, ['cake'])
  assert.equal(firestore.writes[1].data.revision, 1)
  assert.equal(firestore.writes[2].data.revision, 1)
  assert.equal(firestore.writes[3].data.mediaState, 'none')
  assert.equal(firestore.writes[3].data.revision, 1)
  assert.equal(firestore.writes[4].data.status, 'archived')
  assert.equal(firestore.writes[4].data.revision, 2)
  assert.equal(firestore.writes[5].data.signatureStatus, 'status-only')
  assert.equal(firestore.writes[6].data.revision, 1)
})

test('write services reject unsupported and unsafe payloads', async () => {
  const firestore = createFirestoreStub()
  await assert.rejects(saveOwnFavorites({ food: ['<script>bad</script>'] }, { ...context, firestore, ...firestore }), /unsafe/)
  await assert.rejects(saveOwnSettings({ theme: 'neon' }, { ...context, firestore, ...firestore }), /Theme/)
  await assert.rejects(saveMemory('memory_one', { title: 'A day', date: '2026-02-31' }, { ...context, firestore, ...firestore }), /calendar/)
  await assert.rejects(saveSpecialMomentText('birthday', { title: 'Birthday', sections: [{ kind: 'paragraph', content: '<img src=x>' }] }, { ...context, firestore, ...firestore }), /unsafe/)
})

test('write services reject stale revisions before overwriting newer data', async () => {
  const firestore = createFirestoreStub()

  await saveOwnProfile(
    { name: 'Member One', bio: 'Fresh profile', revision: 0 },
    { ...context, firestore, ...firestore },
  )

  await assert.rejects(
    saveOwnProfile(
      { name: 'Member One', bio: 'Stale overwrite attempt', revision: 0 },
      { ...context, firestore, ...firestore },
    ),
    /changed in another session/i,
  )

  await saveMemory(
    'memory_one',
    { title: 'A day', date: '2026-02-14', revision: 0, tags: ['walk'], specialMomentType: 'ordinary' },
    { ...context, firestore, ...firestore },
  )

  await assert.rejects(
    archiveMemory('memory_one', 0, { ...context, firestore, ...firestore }),
    /changed in another session/i,
  )
})
