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
  assert.match(galleryViewSource, /gallery-grid/)
  assert.match(galleryViewSource, /Our Live Album/)
  assert.match(galleryViewSource, /private media/i)
})

test('gallery view renders only verified secure media and avoids static Gallery dependencies', async () => {
  const galleryViewSource = await readSource('../features/gallery/GalleryView.jsx')

  assert.match(galleryViewSource, /storage-verified/)
  assert.doesNotMatch(galleryViewSource, /createObjectURL|fetch\(|uploadBytes|firebase\/storage/)
  assert.doesNotMatch(galleryViewSource, /pages\/media\.html|pages\/gallery\.html|js\/media\.js|legacy\.html|pageUrl|mediaPath/)
  assert.doesNotMatch(galleryViewSource, /localStorage|memorybook_|legacyMemoryAdapter|raw warnings/)
  assert.doesNotMatch(galleryViewSource, /\bsetItem\s*\(|\bupdateDoc\s*\(|\baddDoc\s*\(|\bdeleteDoc\s*\(/)
})
