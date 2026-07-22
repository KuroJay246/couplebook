import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('favorites route uses the read-only feature hook and shared-space view', async () => {
  const favoritesPageSource = await readSource('../pages/FavoritesPage.jsx')
  const favoritesViewSource = await readSource('../features/favorites/FavoritesView.jsx')

  assert.match(favoritesPageSource, /useFavoritesData/)
  assert.match(favoritesPageSource, /FavoritesView/)
  assert.match(favoritesViewSource, /Favorite Things/)
  assert.match(favoritesViewSource, /favorites-layout/)
  assert.match(favoritesViewSource, /favorites-card/)
  assert.match(favoritesViewSource, /Jaylan/)
  assert.doesNotMatch(favoritesViewSource, /addFavorite|removeFavorite|prompt\(/)
})

test('favorites view keeps the migration read-only and avoids static page dependencies', async () => {
  const favoritesViewSource = await readSource('../features/favorites/FavoritesView.jsx')

  assert.match(favoritesViewSource, /FavoriteSection/)
  assert.match(favoritesViewSource, /Omia/)
  assert.doesNotMatch(favoritesViewSource, /localStorage|setItem|saveFavorites|updateDoc|addDoc|deleteDoc|pages\/favorites\.html/)
})
