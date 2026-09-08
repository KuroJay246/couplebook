import test from 'node:test'
import assert from 'node:assert/strict'
import { createDriveConnectionController, shouldUseLocalDriveTestProvider } from '../features/media/useGoogleDriveConnection.js'
import { createLocalGoogleDriveTestProvider } from '../features/media/localGoogleDriveTestProvider.js'
import { COUPLE_BOOK_DRIVE_FOLDER_ID, DRIVE_STATE } from '../services/googleDriveMediaProvider.js'

function makeProvider(id, events, previewDelay = 0) {
  return {
    async connect() {
      events.push(`${id}:connect`)
      return { state: 'connected' }
    },
    async listFiles() {
      events.push(`${id}:list`)
      return { files: [{ id: `${id}-image`, name: `${id}.jpg` }], nextPageToken: '' }
    },
    async fetchPreview(fileId) {
      events.push(`${id}:preview:${fileId}`)
      if (previewDelay) await new Promise((resolve) => setTimeout(resolve, previewDelay))
      return `blob:${id}:${fileId}`
    },
    openExternally(fileId) {
      events.push(`${id}:open:${fileId}`)
    },
    disconnect() {
      events.push(`${id}:disconnect`)
    },
  }
}

test('Drive previews and refreshes remain bound to the active provider session', async () => {
  const events = []
  const providers = []
  const controller = createDriveConnectionController({
    createProvider: () => {
      const provider = makeProvider(`provider-${providers.length + 1}`, events)
      providers.push(provider)
      return provider
    },
    loadIdentityScript: async () => {},
    revokeObjectUrl: (url) => events.push(`revoke:${url}`),
  })
  const states = []
  controller.bindReact((state) => states.push(state))

  await controller.connect()
  assert.equal((await controller.getPreview('provider-1-image')), 'blob:provider-1:provider-1-image')
  await controller.refreshListing()
  controller.disconnect()
  assert.deepEqual(states.at(-1).previews, {})
  assert.throws(() => controller.openExternally('provider-1-image'), (error) => error.code === DRIVE_STATE.reconnectRequired)
  assert.ok(events.includes('provider-1:disconnect'))
  assert.ok(events.includes('revoke:blob:provider-1:provider-1-image'))

  await controller.retryAccess()
  await controller.getPreview('provider-2-image')
  controller.openExternally('provider-2-image')
  assert.ok(events.includes('provider-2:preview:provider-2-image'))
  assert.ok(events.includes('provider-2:open:provider-2-image'))
})

test('an in-flight preview from an old session is revoked and rejected', async () => {
  const events = []
  const controller = createDriveConnectionController({
    createProvider: () => makeProvider('slow', events, 15),
    loadIdentityScript: async () => {},
    revokeObjectUrl: (url) => events.push(`revoke:${url}`),
  })
  controller.bindReact(() => {})
  await controller.connect()
  const previewPromise = controller.getPreview('slow-image')
  controller.disconnect()
  await assert.rejects(previewPromise, (error) => error.code === DRIVE_STATE.cancelled)
  assert.ok(events.includes('revoke:blob:slow:slow-image'))
})

test('local Drive test provider requires an explicit local browser hook', async () => {
  const originalWindow = globalThis.window
  globalThis.window = {
    location: { hostname: 'preview.example.com' },
    __COUPLEBOOK_DRIVE_TEST__: { enabled: true },
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
    },
  }

  try {
    const provider = createLocalGoogleDriveTestProvider()
    await assert.rejects(provider.connect(), (error) => error.code === DRIVE_STATE.temporaryFailure)

    globalThis.window.location.hostname = '127.0.0.1'
    const connected = await provider.connect()
    assert.equal(connected.state, DRIVE_STATE.connected)
    assert.equal(connected.folderId, COUPLE_BOOK_DRIVE_FOLDER_ID)
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = originalWindow
    }
  }
})

test('local Drive provider selection stays disabled without every local test boundary', () => {
  const originalWindow = globalThis.window
  globalThis.window = {
    location: { hostname: 'localhost' },
    __COUPLEBOOK_DRIVE_TEST__: { enabled: true },
  }

  try {
    assert.equal(shouldUseLocalDriveTestProvider(''), false)
    assert.equal(shouldUseLocalDriveTestProvider('false'), false)

    globalThis.window.__COUPLEBOOK_DRIVE_TEST__.enabled = false
    assert.equal(shouldUseLocalDriveTestProvider('true'), false)

    globalThis.window.__COUPLEBOOK_DRIVE_TEST__.enabled = true
    globalThis.window.location.hostname = 'couplebook.web.app'
    assert.equal(shouldUseLocalDriveTestProvider('true'), false)

    globalThis.window.location.hostname = '127.0.0.1'
    assert.equal(shouldUseLocalDriveTestProvider('true'), true)
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = originalWindow
    }
  }
})
