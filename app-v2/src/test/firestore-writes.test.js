import assert from 'node:assert/strict'
import test from 'node:test'
import {
  acceptContract,
  archiveMemory,
  convertPlanToMemory,
  restoreMemory,
  saveMemory,
  saveMemoryWithVerifiedMedia,
  saveOwnFavorites,
  saveOwnProfile,
  saveOwnSettings,
  savePlan,
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
  seed('couples/couple_alpha/memories/memory_one', { revision: 0, status: 'active' })
  seed('couples/couple_alpha/plans/plan_one', { revision: 0 })
  seed('couples/couple_alpha/contracts/current', { acceptedBy: [], schemaVersion: 1 })
  seed('couples/couple_alpha/specialMoments/birthday', { revision: 0 })

  return {
    seed,
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
      docs.set(reference.path, options?.merge ? { ...(docs.get(reference.path) || {}), ...data } : { ...data })
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
  await saveOwnSettings({ appearanceTheme: 'moonlit', localOnlyMode: true, reducedMotion: true }, { ...context, firestore, ...firestore })
  await saveMemory('memory_one', { title: 'A day', date: '2026-02-14', tags: ['walk'], specialMomentType: 'ordinary' }, { ...context, firestore, ...firestore })
  await archiveMemory('memory_one', 1, { ...context, firestore, ...firestore })
  await restoreMemory('memory_one', 2, { ...context, firestore, ...firestore })
  await savePlan('plan_one', { title: 'Try a new restaurant', category: 'Restaurant', status: 'idea', targetDate: '2026-08-20' }, { ...context, firestore, ...firestore })
  await acceptContract({ ...context, firestore, ...firestore })
  await saveSpecialMomentText('birthday', { title: 'Birthday', sections: [{ kind: 'paragraph', content: 'Safe text' }] }, { ...context, firestore, ...firestore })

  assert.equal(firestore.writes.length, 9)
  assert.equal(firestore.writes[0].data.revision, 1)
  assert.deepEqual(firestore.writes[1].data.food, ['cake'])
  assert.equal(firestore.writes[1].data.revision, 1)
  assert.equal(firestore.writes[2].data.revision, 1)
  assert.equal(firestore.writes[2].data.appearanceTheme, 'moonlit')
  assert.equal(firestore.writes[3].data.mediaState, 'none')
  assert.equal(firestore.writes[3].data.revision, 1)
  assert.equal(firestore.writes[4].data.status, 'archived')
  assert.equal(firestore.writes[4].data.revision, 2)
  assert.equal(firestore.writes[5].data.status, 'active')
  assert.equal(firestore.writes[5].data.revision, 3)
  assert.equal(firestore.writes[6].data.category, 'Restaurant')
  assert.equal(firestore.writes[7].data.signatureStatus, 'status-only')
  assert.equal(firestore.writes[8].data.revision, 1)
})

test('verified media memory writes preserve private storage metadata without local paths', async () => {
  const firestore = createFirestoreStub()

  await saveMemoryWithVerifiedMedia(
    'memory_one',
    { title: 'Photo memory', date: '2026-02-14', kindLabel: 'Photo Memory', tags: ['album'] },
    {
      id: 'media_001',
      kind: 'image',
      storagePath: 'couples/couple_alpha/media/media_001/original',
      thumbnailPath: '',
      posterPath: '',
      contentType: 'image/jpeg',
      sizeBytes: 1024,
      checksum: 'a'.repeat(64),
    },
    { ...context, firestore, ...firestore },
  )

  assert.equal(firestore.writes[0].data.mediaState, 'storage-verified')
  assert.equal(firestore.writes[0].data.media.storagePath, 'couples/couple_alpha/media/media_001/original')
  assert.equal(firestore.writes[0].data.media.checksum, 'a'.repeat(64))
  assert.equal(JSON.stringify(firestore.writes[0].data).includes('C:\\Users'), false)
})

test('verified Drive media writes preserve stable IDs without temporary URLs', async () => {
  const firestore = createFirestoreStub()
  await saveMemoryWithVerifiedMedia(
    'memory_drive',
    { title: 'Drive photo', date: '2026-02-15', kindLabel: 'Photo Memory' },
    {
      provider: 'google-drive',
      id: 'media_drive_001',
      kind: 'image',
      driveFileId: 'drive-file-001',
      driveFolderId: 'drive-folder-001',
      contentType: 'image/jpeg',
      sizeBytes: 2048,
      checksum: 'b'.repeat(64),
    },
    { ...context, firestore, ...firestore },
  )

  assert.equal(firestore.writes[0].data.mediaState, 'drive-verified')
  assert.equal(firestore.writes[0].data.media.provider, 'google-drive')
  assert.equal(firestore.writes[0].data.media.driveFileId, 'drive-file-001')
  assert.equal(firestore.writes[0].data.media.storagePath, '')
  assert.equal(JSON.stringify(firestore.writes[0].data).includes('blob:'), false)
})

test('full-document v1 writes replace legacy extra fields instead of merging them forward', async () => {
  const firestore = createFirestoreStub()
  firestore.seed('couples/couple_alpha/favorites/member_one', {
    food: ['old cake'],
    hobbies: ['legacy field that rules reject'],
    revision: 1,
    schemaVersion: 1,
  })

  await saveOwnFavorites(
    { food: ['new cake'], songs: [], movies: [], places: [], memories: [], notes: [], revision: 1 },
    { ...context, firestore, ...firestore },
  )

  assert.equal(firestore.writes[0].options, undefined)
  assert.deepEqual(Object.keys(firestore.writes[0].data).sort(), [
    'food',
    'memories',
    'movies',
    'notes',
    'places',
    'revision',
    'schemaVersion',
    'songs',
  ])
  assert.equal(firestore.writes[0].data.hobbies, undefined)
})

test('write services reject unsupported and unsafe payloads', async () => {
  const firestore = createFirestoreStub()
  await assert.rejects(saveOwnFavorites({ food: ['<script>bad</script>'] }, { ...context, firestore, ...firestore }), /unsafe/)
  await assert.rejects(saveOwnSettings({ appearanceTheme: 'neon' }, { ...context, firestore, ...firestore }), /Theme/)
  await assert.rejects(saveMemory('memory_one', { title: 'A day', date: '2026-02-31' }, { ...context, firestore, ...firestore }), /calendar/)
  await assert.rejects(
    saveMemoryWithVerifiedMedia(
      'memory_one',
      { title: 'A day', date: '2026-02-14' },
      { id: 'media_bad', kind: 'image', storagePath: 'https://example.com/private.jpg', contentType: 'image/jpeg', sizeBytes: 4, checksum: 'a'.repeat(64) },
      { ...context, firestore, ...firestore },
    ),
    /Storage path is invalid/,
  )
  await assert.rejects(restoreMemory('memory_one', 0, { ...context, firestore, ...firestore }), /archived/)
  await assert.rejects(savePlan('plan_one', { title: 'Bad', category: 'Finance', status: 'idea' }, { ...context, firestore, ...firestore }), /category/)
  await assert.rejects(saveSpecialMomentText('birthday', { title: 'Birthday', sections: [{ kind: 'paragraph', content: '<img src=x>' }] }, { ...context, firestore, ...firestore }), /unsafe/)
})

test('plan-to-memory creates one deterministic memory and blocks duplicate conversion', async () => {
  const firestore = createFirestoreStub()
  const plan = {
    title: 'Picnic at the beach',
    category: 'Date Idea',
    status: 'completed',
    targetDate: '2026-08-21',
    notes: 'Bring snacks.',
    revision: 0,
    convertedMemoryId: '',
  }
  const memoryId = await convertPlanToMemory('plan_one', plan, { ...context, firestore, ...firestore })
  assert.equal(memoryId, 'memory_from_plan_plan_one')
  assert.equal(firestore.writes[0].path, 'couples/couple_alpha/memories/memory_from_plan_plan_one')
  assert.equal(firestore.writes[1].path, 'couples/couple_alpha/plans/plan_one')
  assert.equal(firestore.writes[1].data.convertedMemoryId, memoryId)

  await assert.rejects(
    convertPlanToMemory('plan_one', { ...plan, convertedMemoryId: memoryId }, { ...context, firestore, ...firestore }),
    /already has a memory/,
  )
})

test('plan-to-memory retry reuses an existing deterministic memory before finalizing the plan marker', async () => {
  const firestore = createFirestoreStub()
  firestore.seed('couples/couple_alpha/memories/memory_from_plan_plan_one', {
    revision: 1,
    title: 'Picnic at the beach',
    date: '2026-08-21',
    mediaState: 'none',
    linkedPlanId: 'plan_one',
    createdBy: 'member_one',
    updatedBy: 'member_one',
    status: 'active',
    schemaVersion: 1,
  })

  const memoryId = await convertPlanToMemory(
    'plan_one',
    {
      title: 'Picnic at the beach',
      category: 'Date Idea',
      status: 'planned',
      targetDate: '2026-08-21',
      notes: 'Bring snacks.',
      revision: 0,
      convertedMemoryId: '',
    },
    { ...context, firestore, ...firestore },
  )

  assert.equal(memoryId, 'memory_from_plan_plan_one')
  assert.equal(firestore.writes.length, 1)
  assert.equal(firestore.writes[0].path, 'couples/couple_alpha/plans/plan_one')
  assert.equal(firestore.writes[0].data.convertedMemoryId, memoryId)
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
