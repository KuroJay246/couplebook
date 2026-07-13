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
  assert.match(favoritesViewSource, /SharedSpaceHeader/)
  assert.match(favoritesViewSource, /The things we return to\./)
  assert.match(favoritesViewSource, /Open profile/)
  assert.match(favoritesViewSource, /Open contract/)
  assert.match(favoritesViewSource, /Different favorites, one shared collection\./)
  assert.match(favoritesViewSource, /Refresh reads/)
  assert.doesNotMatch(favoritesViewSource, /Add favorite|Remove|addFavorite|removeFavorite|prompt\(/)
})

test('favorites view keeps the migration read-only and avoids static page dependencies', async () => {
  const favoritesViewSource = await readSource('../features/favorites/FavoritesView.jsx')

  assert.match(favoritesViewSource, /This collection has not been connected here yet\./)
  assert.match(favoritesViewSource, /This collection is ready for its first entries\./)
  assert.match(favoritesViewSource, /Only exact category matches surface here\./)
  assert.doesNotMatch(favoritesViewSource, /localStorage|setItem|saveFavorites|updateDoc|addDoc|deleteDoc|pages\/favorites\.html/)
})
