import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { DATA_SOURCE_MODES, resolveDataSourceMode } from '../data/dataSourceMode.js'
import { assertApprovedMomentType, memoryPath, pathToString, userPath } from '../services/firestorePaths.js'
import { normalizeFirestoreMemory } from '../services/memoryService.js'
import { normalizeFirestoreSpecialMoment } from '../services/specialMomentService.js'

test('data source mode defaults to legacy and rejects unsafe test production mode', () => {
  assert.equal(resolveDataSourceMode({}), DATA_SOURCE_MODES.legacy)
  assert.equal(resolveDataSourceMode({ VITE_DATA_SOURCE_MODE: 'firestore', MODE: 'development' }), DATA_SOURCE_MODES.firestore)
  assert.equal(resolveDataSourceMode({ VITE_DATA_SOURCE_MODE: 'unknown', MODE: 'development' }), DATA_SOURCE_MODES.legacy)
  assert.equal(resolveDataSourceMode({ VITE_DATA_SOURCE_MODE: 'test', MODE: 'production' }), DATA_SOURCE_MODES.legacy)
})

test('Firestore path helpers reject slash injection and unapproved special moments', () => {
  assert.deepEqual(userPath('member_one'), ['users', 'member_one'])
  assert.equal(pathToString(memoryPath('couple_alpha', 'memory_one')), 'couples/couple_alpha/memories/memory_one')
  assert.equal(assertApprovedMomentType('Birthday'), 'birthday')
  assert.throws(() => userPath('bad/user'))
  assert.throws(() => memoryPath('couple_alpha', '../bad'))
  assert.throws(() => assertApprovedMomentType('anniversary'))
})

test('Firestore normalizers quarantine unsafe media and raw special HTML', () => {
  const warnings = []
  const memory = normalizeFirestoreMemory('memory_one', {
    title: 'Safe title',
    description: 'Safe description',
    mediaState: 'private-legacy-reference',
    mediaReference: 'C:\\Users\\Private\\photo.jpg',
    schemaVersion: 1,
  }, warnings)
  assert.equal(memory.media, 'private-legacy-reference')
  assert.match(warnings.join(' '), /unsafe/)

  const specialWarnings = []
  const special = normalizeFirestoreSpecialMoment('birthday', {
    title: '<script>bad()</script>',
    sections: [{ kind: 'paragraph', content: 'Safe fictional content' }],
    schemaVersion: 1,
  }, specialWarnings)
  assert.equal(special.content.title, '')
  assert.equal(special.content.sections.length, 1)
  assert.ok(specialWarnings.length > 0)
})

test('Firestore memory normalizer accepts only safe verified Storage metadata', () => {
  const warnings = []
  const memory = normalizeFirestoreMemory('memory_one', {
    title: 'Safe title',
    description: 'Safe description',
    date: '2026-01-01',
    mediaState: 'storage-verified',
    media: {
      id: 'media_001',
      kind: 'video',
      storagePath: 'couples/couple_alpha/media/media_001/original',
      posterPath: 'couples/couple_alpha/media/media_001/poster',
      contentType: 'video/mp4',
      sizeBytes: 100,
      checksum: 'a'.repeat(64),
    },
    schemaVersion: 1,
  }, warnings)
  assert.equal(memory.media.status, undefined)
  assert.equal(memory.media.kind, 'video')
  assert.equal(memory.media.storagePath, 'couples/couple_alpha/media/media_001/original')

  const unsafeWarnings = []
  const unsafe = normalizeFirestoreMemory('memory_two', {
    title: 'Unsafe title',
    date: '2026-01-01',
    mediaState: 'storage-verified',
    media: {
      id: 'media_002',
      kind: 'image',
      storagePath: 'https://example.com/private.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 10,
      checksum: 'b'.repeat(64),
    },
    schemaVersion: 1,
  }, unsafeWarnings)
  assert.equal(unsafe.media, '')
  assert.match(unsafeWarnings.join(' '), /invalid storage metadata/)
})

test('app-v2 Firestore sources avoid broad users queries, writes, and arbitrary paths', async () => {
  const serviceFiles = [
    '../services/userService.js',
    '../services/coupleService.js',
    '../services/profileService.js',
    '../services/favoritesService.js',
    '../services/settingsService.js',
    '../services/contractService.js',
    '../services/memoryService.js',
    '../services/specialMomentService.js',
    '../services/firestorePaths.js',
    '../services/firestoreReaders.js',
  ]
  const sources = await Promise.all(serviceFiles.map((file) => readFile(new URL(file, import.meta.url), 'utf8')))
  const combined = sources.join('\n')
  assert.doesNotMatch(combined, /collection\([^)]*['"]users['"]/)
  assert.doesNotMatch(combined, /collectionGroup\(/)
  assert.doesNotMatch(combined, /setDoc|addDoc|updateDoc|deleteDoc|writeBatch|runTransaction/)
})
