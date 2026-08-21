import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('gallery route uses the read-only feature hook and archive view', async () => {
  const galleryPageSource = await readSource('../pages/GalleryPage.jsx')
  const galleryViewSource = await readSource('../features/gallery/GalleryView.jsx')

  assert.match(galleryPageSource, /useGalleryData/)
  assert.match(galleryPageSource, /GalleryView/)
  assert.doesNotMatch(galleryPageSource, /PlaceholderPage/)
  assert.match(galleryViewSource, /Our Shared Gallery/)
  assert.match(galleryViewSource, /Moments we kept close/)
  assert.match(galleryViewSource, /Our Live Album/)
  assert.match(galleryViewSource, /model\.items/)
  assert.match(galleryViewSource, /useMediaUploadQueue/)
  assert.match(galleryViewSource, /Protected imports/)
  assert.match(galleryViewSource, /Start uploads/)
  assert.match(galleryViewSource, /Queue is empty/)
  assert.match(galleryViewSource, /private media/i)
})

test('gallery view keeps verified private media boundaries and uses the modular CSS entrypoint', async () => {
  const galleryViewSource = await readSource('../features/gallery/GalleryView.jsx')
  const mainSource = await readSource('../main.jsx')
  const tokensSource = await readSource('../styles/tokens.css')
  const navigationSource = await readSource('../styles/navigation.css')

  assert.match(galleryViewSource, /function galleryTileLabel\(item\)/)
  assert.match(galleryViewSource, /aria-label=\{galleryTileLabel\(item\)\}/)
  assert.match(galleryViewSource, /storage-verified/)
  assert.match(galleryViewSource, /LIVE_SHARED_ALBUM_URL/)
  assert.match(mainSource, /import '\.\/styles\/pages\/album\.css'/)
  assert.match(mainSource, /import '\.\/styles\/pages\/media-upload\.css'/)
  assert.match(tokensSource, /--cb-color-primary:/)
  assert.match(navigationSource, /safe-area-inset-bottom/)
  assert.doesNotMatch(galleryViewSource, /createObjectURL|fetch\(|uploadBytes|firebase\/storage/)
  assert.doesNotMatch(galleryViewSource, /pages\/media\.html|pages\/gallery\.html|js\/media\.js|legacy\.html|pageUrl|mediaPath/)
  assert.doesNotMatch(galleryViewSource, /localStorage|memorybook_|legacyMemoryAdapter|raw warnings/)
  assert.doesNotMatch(galleryViewSource, /\bsetItem\s*\(|\bupdateDoc\s*\(|\baddDoc\s*\(|\bdeleteDoc\s*\(/)
})
