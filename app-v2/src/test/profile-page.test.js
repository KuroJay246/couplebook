import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('profile route uses the feature hook and owner editing view', async () => {
  const profilePageSource = await readSource('../pages/ProfilePage.jsx')
  const profileViewSource = await readSource('../features/profile/ProfileView.jsx')

  assert.match(profilePageSource, /useProfileData/)
  assert.match(profilePageSource, /ProfileView/)
  assert.match(profileViewSource, /About us/)
  assert.match(profileViewSource, /PageTabs/)
  assert.match(profileViewSource, /Shared matches/)
  assert.match(profileViewSource, /Our Promises/)
  assert.match(profileViewSource, /useOwnerWrite/)
  assert.match(profileViewSource, /ProfileEditDialog/)
  assert.match(profileViewSource, /saveProfile/)
  assert.match(profileViewSource, /Our story/)
  assert.doesNotMatch(profileViewSource, /type="file"/)
})

test('profile view keeps unavailable states calm and does not invent private details', async () => {
  const profileViewSource = await readSource('../features/profile/ProfileView.jsx')

  assert.match(profileViewSource, /A personal note is waiting to be written\./)
  assert.match(profileViewSource, /Protected/)
  assert.match(profileViewSource, /UIDs, membership status, Firestore paths/)
})
