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
  assert.match(galleryViewSource, /Our visual archive/)
  assert.match(galleryViewSource, /Moments kept in pictures and motion\./)
  assert.match(galleryViewSource, /Special moments/)
  assert.match(galleryViewSource, /Private media/)
  assert.match(galleryViewSource, /Show less/)
  assert.match(galleryViewSource, /The visual archive is unavailable here\./)
})

test('gallery view keeps media metadata-only and avoids static Gallery dependencies', async () => {
  const galleryViewSource = await readSource('../features/gallery/GalleryView.jsx')

  assert.doesNotMatch(galleryViewSource, /<img|<video|createObjectURL|fetch\(|getDownloadURL|uploadBytes|firebase\/storage/)
  assert.doesNotMatch(galleryViewSource, /pages\/media\.html|pages\/gallery\.html|js\/media\.js|legacy\.html|pageUrl|mediaPath/)
  assert.doesNotMatch(galleryViewSource, /localStorage|memorybook_|legacyMemoryAdapter|raw warnings/)
  assert.doesNotMatch(galleryViewSource, /\bsetItem\s*\(|\bupdateDoc\s*\(|\baddDoc\s*\(|\bdeleteDoc\s*\(/)
})
