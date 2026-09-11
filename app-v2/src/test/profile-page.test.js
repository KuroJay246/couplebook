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
  assert.match(profileViewSource, /cb-us-redesign/)
  assert.match(profileViewSource, /relationshipTitle/)
  assert.match(profileViewSource, /Favorites/)
  assert.match(profileViewSource, /useOwnerWrite/)
  assert.match(profileViewSource, /ProfileEditDialog/)
  assert.match(profileViewSource, /saveProfile/)
  assert.match(profileViewSource, /Important dates/)
  assert.doesNotMatch(profileViewSource, /type="file"/)
})

test('profile view keeps unavailable states calm and does not invent private details', async () => {
  const profileViewSource = await readSource('../features/profile/ProfileView.jsx')

  assert.doesNotMatch(profileViewSource, /Creative soul|details planner|personal note is waiting|Dual view/)
  assert.doesNotMatch(profileViewSource, />Add note</)
  assert.match(profileViewSource, /No shared favorites yet\./)
  assert.doesNotMatch(profileViewSource, /PageTabs|Our Promises|Open Contract/)
  assert.doesNotMatch(profileViewSource, /UIDs, membership status, Firestore paths/)
})
