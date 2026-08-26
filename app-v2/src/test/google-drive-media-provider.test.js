import assert from 'node:assert/strict'
import test from 'node:test'
import { COUPLE_BOOK_DRIVE_FOLDER_ID, DRIVE_STATE, GOOGLE_DRIVE_SCOPE, createGoogleDriveMediaProvider } from '../services/googleDriveMediaProvider.js'

test('Google Drive provider keeps the approved folder and minimum scope explicit', () => {
  assert.equal(COUPLE_BOOK_DRIVE_FOLDER_ID, '17Ar4UK5_puORz9TE1dijIk2-qHgh7oIa')
  assert.equal(GOOGLE_DRIVE_SCOPE, 'https://www.googleapis.com/auth/drive.file')
})

test('Google Drive provider fails closed when OAuth is not configured', async () => {
  const provider = createGoogleDriveMediaProvider({})
  await assert.rejects(provider.connect(), (error) => error.code === DRIVE_STATE.temporaryFailure)
  assert.equal(provider.getConnectionState(), DRIVE_STATE.disconnected)
})

test('Google Drive provider lists only supported media and preserves pagination', async () => {
  const calls = []
  const provider = createGoogleDriveMediaProvider({
    clientId: 'test-client',
    fetchImpl: async (url) => {
      calls.push(String(url))
      if (String(url).includes('/files?')) {
        return new Response(JSON.stringify({ nextPageToken: 'next', files: [
          { id: 'image-1', name: 'photo.jpg', mimeType: 'image/jpeg' },
          { id: 'text-1', name: 'notes.txt', mimeType: 'text/plain' },
        ] }), { status: 200 })
      }
      return new Response(JSON.stringify({ id: COUPLE_BOOK_DRIVE_FOLDER_ID, mimeType: 'application/vnd.google-apps.folder', trashed: false }), { status: 200 })
    },
    google: { accounts: { oauth2: { initTokenClient: ({ callback }) => ({ requestAccessToken() { void callback({ access_token: 'test-token' }) } }) } } },
  })
  await provider.connect()
  const list = await provider.listFiles()
  assert.deepEqual(list.files.map((file) => file.id), ['image-1'])
  assert.equal(list.nextPageToken, 'next')
  assert.match(calls.find((url) => url.includes('/files?')), /pageSize=100/)
})
