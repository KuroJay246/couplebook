import assert from 'node:assert/strict'
import test from 'node:test'
import { createManagedObjectUrl, createObjectUrlRegistry } from '../services/objectUrlLifecycle.js'

test('managed object URLs revoke once and report repeated cleanup as inactive', () => {
  const originalUrl = globalThis.URL
  const revoked = []
  globalThis.URL = {
    ...originalUrl,
    createObjectURL() {
      return 'blob:managed-preview'
    },
    revokeObjectURL(url) {
      revoked.push(url)
    },
  }

  try {
    const managed = createManagedObjectUrl(new Blob(['preview']))
    assert.equal(managed.url, 'blob:managed-preview')
    assert.equal(managed.revoke(), true)
    assert.equal(managed.revoke(), false)
    assert.deepEqual(revoked, ['blob:managed-preview'])
  } finally {
    globalThis.URL = originalUrl
  }
})

test('object URL registry can revoke individually and clear all remaining previews', () => {
  const originalUrl = globalThis.URL
  const created = []
  const revoked = []
  globalThis.URL = {
    ...originalUrl,
    createObjectURL() {
      const url = `blob:registered-${created.length + 1}`
      created.push(url)
      return url
    },
    revokeObjectURL(url) {
      revoked.push(url)
    },
  }

  try {
    const registry = createObjectUrlRegistry()
    const first = registry.create(new Blob(['one']))
    const second = registry.create(new Blob(['two']))

    assert.equal(registry.has(first), true)
    assert.equal(registry.revoke(first), true)
    assert.equal(registry.revoke(first), false)

    registry.revokeAll()
    registry.revokeAll()

    assert.equal(registry.has(second), false)
    assert.deepEqual(revoked, [first, second])
  } finally {
    globalThis.URL = originalUrl
  }
})
