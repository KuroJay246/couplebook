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
  assert.match(favoritesViewSource, /favorites-layout/)
  assert.match(favoritesViewSource, /favorites-card/)
  assert.match(favoritesViewSource, /Jaylan/)
  assert.match(favoritesViewSource, /useOwnerWrite/)
  assert.match(favoritesViewSource, /AddFavoriteDialog/)
  assert.match(favoritesViewSource, /saveFavorites/)
  assert.doesNotMatch(favoritesViewSource, /prompt\(/)
})

test('favorites view keeps owner writes narrow and avoids static page dependencies', async () => {
  const favoritesViewSource = await readSource('../features/favorites/FavoritesView.jsx')

  assert.match(favoritesViewSource, /FavoriteSection/)
  assert.match(favoritesViewSource, /Omia/)
  assert.match(favoritesViewSource, /isOwnerFavorites/)
  assert.doesNotMatch(favoritesViewSource, /localStorage|setItem|updateDoc|addDoc|deleteDoc|pages\/favorites\.html/)
})
