import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const gallerySource = await readFile(new URL('../features/gallery/GalleryView.jsx', import.meta.url), 'utf8')
const settingsSource = await readFile(new URL('../features/settings/SettingsView.jsx', import.meta.url), 'utf8')
const mediaSettingsSource = await readFile(new URL('../features/settings/MediaSettingsSection.jsx', import.meta.url), 'utf8')
const styleSource = await readFile(new URL('../styles/index.css', import.meta.url), 'utf8')

test('Album keeps management controls behind an explicit secondary action', () => {
  assert.match(gallerySource, /Add details/)
  assert.match(gallerySource, /manageUploadsOpen/)
  assert.match(gallerySource, /aria-label="Album management tools"/)
  assert.match(gallerySource, /Manage Media & Sync/)
  assert.doesNotMatch(gallerySource, /Metadata-first private album/)
  assert.doesNotMatch(gallerySource, /Connect Google Drive|Google Drive connection|DriveMediaGrid/)
})

test('Settings owns Google Drive media provider administration', () => {
  assert.match(settingsSource, /MediaSettingsSection/)
  assert.match(mediaSettingsSource, /Media & Sync/)
  assert.match(mediaSettingsSource, /Connect Google Drive/)
  assert.match(mediaSettingsSource, /Sync now/)
  assert.match(mediaSettingsSource, /Persistent background sync requires trusted backend approval/)
})

test('Settings keeps technical health behind Advanced', () => {
  assert.match(settingsSource, /System health and account controls/)
  assert.match(settingsSource, /className="cb-advanced-panel"/)
  assert.match(styleSource, /\.cb-advanced-panel/)
})

test('responsive web styling defines a mobile album and advanced-panel treatment', () => {
  assert.match(styleSource, /@media \(max-width: 640px\)/)
  assert.match(styleSource, /\.cb-album-intro/)
  assert.match(styleSource, /\.cb-advanced-summary/)
})
