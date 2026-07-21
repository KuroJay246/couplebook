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
  return {
    writes,
    createDoc: (_firestore, ...pathParts) => ({ path: pathParts.join('/') }),
    getDocument: async (reference) => ({
      exists: () => true,
      data: () => {
        if (reference.path?.includes('/members/')) return { active, role: 'member' }
        if (reference.path?.includes('/contracts/')) return { acceptedBy: [] }
        return {}
      },
    }),
    setDocument: async (reference, data, options) => {
      writes.push({ kind: 'set', path: reference.path, data, options })
    },
    updateDocument: async (reference, data) => {
      writes.push({ kind: 'update', path: reference.path, data })
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
  await archiveMemory('memory_one', { ...context, firestore, ...firestore })
  await acceptContract({ ...context, firestore, ...firestore })
  await saveSpecialMomentText('birthday', { title: 'Birthday', sections: [{ kind: 'paragraph', content: 'Safe text' }] }, { ...context, firestore, ...firestore })

  assert.equal(firestore.writes.length, 7)
  assert.deepEqual(firestore.writes[1].data.food, ['cake'])
  assert.equal(firestore.writes[3].data.mediaState, 'none')
  assert.equal(firestore.writes[4].data.status, 'archived')
  assert.equal(firestore.writes[5].data.signatureStatus, 'status-only')
})

test('write services reject unsupported and unsafe payloads', async () => {
  const firestore = createFirestoreStub()
  await assert.rejects(saveOwnFavorites({ food: ['<script>bad</script>'] }, { ...context, firestore, ...firestore }), /unsafe/)
  await assert.rejects(saveOwnSettings({ theme: 'neon' }, { ...context, firestore, ...firestore }), /Theme/)
  await assert.rejects(saveMemory('memory_one', { title: 'A day', date: '2026-02-31' }, { ...context, firestore, ...firestore }), /calendar/)
  await assert.rejects(saveSpecialMomentText('birthday', { title: 'Birthday', sections: [{ kind: 'paragraph', content: '<img src=x>' }] }, { ...context, firestore, ...firestore }), /unsafe/)
})
