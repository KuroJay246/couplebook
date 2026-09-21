import assert from 'node:assert/strict'
import test from 'node:test'
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
