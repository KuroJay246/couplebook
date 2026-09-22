import assert from 'node:assert/strict'
import test from 'node:test'
import { getCoupleScopedOwnerKey } from '../features/domain/coupleSourceIdentity.js'
import { withSourceTimeout } from '../features/domain/sourceTimeout.js'

test('couple-scoped sources resolve normally before the loading timeout', async () => {
  const source = await withSourceTimeout(Promise.resolve({ status: 'ready' }), 'story', 50)
  assert.deepEqual(source, { status: 'ready' })
})

test('couple-scoped sources fail clearly instead of loading forever', async () => {
  await assert.rejects(
    withSourceTimeout(new Promise(() => {}), 'story', 5),
    /Story is taking too long to load/,
  )
})

test('couple-scoped sources load for approved users even when username is absent', () => {
  const ownerKey = getCoupleScopedOwnerKey({
    approvedUser: {
      uid: 'uid-123',
      displayName: 'Jaylan',
      coupleId: 'couple-alpha',
    },
    domainKey: 'memories',
    fixtureSource: null,
    isAuthorized: true,
    sourceMode: 'firestore',
  })

  assert.equal(ownerKey, 'memories:firestore:uid-123:couple-alpha:Jaylan')
})
