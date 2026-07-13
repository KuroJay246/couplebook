import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('profile route uses the read-only feature hook and shared-space view', async () => {
  const profilePageSource = await readSource('../pages/ProfilePage.jsx')
  const profileViewSource = await readSource('../features/profile/ProfileView.jsx')

  assert.match(profilePageSource, /useProfileData/)
  assert.match(profilePageSource, /ProfileView/)
  assert.match(profileViewSource, /SharedSpaceHeader/)
  assert.match(profileViewSource, /We are the subject of this book\./)
  assert.match(profileViewSource, /Open favorites/)
  assert.match(profileViewSource, /Open contract/)
  assert.match(profileViewSource, /model\.entries/)
  assert.match(profileViewSource, /Refresh reads/)
  assert.doesNotMatch(profileViewSource, /Edit Profile|openEditProfile|saveProfile|type="file"/)
})

test('profile view keeps unavailable states calm and does not invent private details', async () => {
  const profileViewSource = await readSource('../features/profile/ProfileView.jsx')

  assert.match(profileViewSource, /The page stays honest instead of inventing names or dates\./)
  assert.match(profileViewSource, /This route is ready for the paired spread, but it will not invent names, birthdays, or bios on its own\./)
  assert.match(profileViewSource, /No hidden write-back paths/)
})
