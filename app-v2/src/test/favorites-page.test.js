import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('favorites route uses the feature hook and owner editing view', async () => {
  const favoritesPageSource = await readSource('../pages/FavoritesPage.jsx')
  const favoritesViewSource = await readSource('../features/favorites/FavoritesView.jsx')

  assert.match(favoritesPageSource, /useFavoritesData/)
  assert.match(favoritesPageSource, /FavoritesView/)
  assert.match(favoritesViewSource, /Favorite Things/)
  assert.match(favoritesViewSource, /Things you both reach for/)
  assert.match(favoritesViewSource, /FavoriteSection/)
  assert.match(favoritesViewSource, /Jaylan/)
  assert.match(favoritesViewSource, /useOwnerWrite/)
  assert.match(favoritesViewSource, /AddFavoriteDialog/)
  assert.match(favoritesViewSource, /saveFavorites/)
  assert.match(favoritesViewSource, /Search favorites/)
  assert.match(favoritesViewSource, /shared matches/i)
  assert.doesNotMatch(favoritesViewSource, /prompt\(/)
})

test('favorites view keeps owner writes narrow and avoids static page dependencies', async () => {
  const favoritesViewSource = await readSource('../features/favorites/FavoritesView.jsx')

  assert.match(favoritesViewSource, /FavoriteSection/)
  assert.match(favoritesViewSource, /Omia/)
  assert.match(favoritesViewSource, /isOwnerFavorites/)
  assert.doesNotMatch(favoritesViewSource, /localStorage|setItem|updateDoc|addDoc|deleteDoc|pages\/favorites\.html/)
})

test('favorites editing waits for the loaded owner model instead of fallback placeholders', async () => {
  const favoritesViewSource = await readSource('../features/favorites/FavoritesView.jsx')

  assert.match(
    favoritesViewSource,
    /const ownerPerson = \(model\.people \|\| \[\]\)\.find\(\(person\) => isOwnerFavorites\(person, writer\.approvedUser\)\) \|\| null/,
  )
  assert.match(favoritesViewSource, /canEdit=\{person === ownerPerson\}/)
  assert.match(favoritesViewSource, /const displayName = writer\.approvedUser\.displayName \|\| writer\.approvedUser\.username \|\| 'Jaylan'/)
})
