/* global Buffer, SubtleCrypto, setTimeout */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'
import { createServer as createViteServer } from 'vite'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const execFile = promisify(execFileCallback)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const APP_ROOT = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(APP_ROOT, '..')
const OUTPUT_ROOT = path.join(REPO_ROOT, '.visual-audit', 'media-workflow-current')
const FIXTURE_ROOT = path.join(APP_ROOT, 'output', 'qa-fixtures')
const EMULATOR_ENV_PATH = path.join(APP_ROOT, '.env.emulator.local')

const STATUS_LABELS = Object.freeze([
  'Ready',
  'Validating',
  'Hashing',
  'Uploading',
  'Finalizing',
  'Cancelling',
  'Cancelled',
  'Needs review',
  'Saved',
])

function log(message) {
  process.stdout.write(`${message}\n`)
}

function parseEnvFile(contents) {
  const values = {}
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator <= 0) continue
    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

async function loadEnvFile(filePath) {
  const contents = await fsp.readFile(filePath, 'utf8')
  return parseEnvFile(contents)
}

function requireEnv(env, key) {
  const value = String(env[key] || '').trim()
  if (!value) throw new Error(`${key} is required for emulator media workflows.`)
  return value
}

function pngBuffer() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9l8x8AAAAASUVORK5CYII=',
    'base64',
  )
}

function gifBuffer() {
  return Buffer.from(
    'R0lGODdhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=',
    'base64',
  )
}

function uniqueSuffix() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

async function copyFixture(sourcePath, targetDir, name) {
  const targetPath = path.join(targetDir, name)
  await fsp.copyFile(sourcePath, targetPath)
  return targetPath
}

async function createPngFixture(targetDir, name) {
  const targetPath = path.join(targetDir, name)
  await fsp.writeFile(targetPath, pngBuffer())
  return targetPath
}

async function createGifFixture(targetDir, name) {
  const targetPath = path.join(targetDir, name)
  await fsp.writeFile(targetPath, gifBuffer())
  return targetPath
}

async function ensureOutputFolders() {
  await fsp.rm(OUTPUT_ROOT, { recursive: true, force: true })
  await fsp.mkdir(path.join(OUTPUT_ROOT, 'fixtures'), { recursive: true })
  await fsp.mkdir(path.join(OUTPUT_ROOT, 'screenshots'), { recursive: true })
}

function initializeAdmin(projectId, storageBucket) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085'
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199'
  process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || projectId

  const app = getApps()[0] || initializeApp({
    projectId,
    storageBucket,
  })

  return {
    db: getFirestore(app),
    bucket: getStorage(app).bucket(storageBucket),
  }
}

async function seedEmulators() {
  await execFile(process.execPath, [path.join(APP_ROOT, 'scripts', 'seed-local-emulators.mjs')], {
    cwd: APP_ROOT,
    env: process.env,
  })
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true })
  } catch (error) {
    if (!/Executable doesn't exist|browserType\.launch/i.test(String(error?.message || error))) throw error
    return chromium.launch({ headless: true, channel: 'chrome' })
  }
}

async function createServer() {
  process.env.VITE_ENABLE_LOCAL_UPLOAD_TEST_HOOKS = 'true'
  const server = await createViteServer({
    root: APP_ROOT,
    server: {
      host: '127.0.0.1',
      port: 0,
    },
  })
  await server.listen()
  const address = server.httpServer.address()
  return { server, baseUrl: `http://127.0.0.1:${address.port}` }
}

function createNetworkController() {
  return {
    delayMs: 0,
    failFirstStorageWrite: false,
    failedFirstStorageWrite: false,
  }
}

async function createContext(browser, networkController) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 } })

  await context.addInitScript(() => {
    globalThis.__COUPLEBOOK_UPLOAD_TEST__ = {
      enabled: true,
      failUploadsRemaining: 0,
      phaseDelayMs: {
        validating: 180,
        hashing: 180,
        finalizing: 180,
      },
    }

    const originalDigest = SubtleCrypto.prototype.digest
    SubtleCrypto.prototype.digest = async function patchedDigest(...args) {
      await new Promise((resolve) => setTimeout(resolve, 120))
      return originalDigest.apply(this, args)
    }
  })

  await context.route('http://127.0.0.1:9199/**', async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') {
      await route.continue()
      return
    }

    if (networkController.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, networkController.delayMs))
    }

    if (networkController.failFirstStorageWrite && !networkController.failedFirstStorageWrite && request.method() !== 'GET') {
      networkController.failedFirstStorageWrite = true
      await route.abort('failed')
      return
    }

    await route.continue()
  })

  return context
}

async function signIn(page, baseUrl, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Sign in with your Couple Book email' }).waitFor({ state: 'visible', timeout: 15000 })
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /Enter Couple Book/i }).click()
  await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 20000 })
  await page.getByRole('heading', { name: 'Pick up where your story left off.' }).waitFor({ state: 'visible', timeout: 15000 })
}

async function openGallery(page, baseUrl) {
  await page.goto(`${baseUrl}/gallery`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Our Shared Gallery' }).waitFor({ state: 'visible', timeout: 15000 })
}

async function setFiles(page, filePaths) {
  const target = page.locator('input[type="file"]').first()
  await target.setInputFiles(filePaths)
}

function queueCard(page, fileName) {
  return page.locator('article').filter({ has: page.getByText(fileName, { exact: true }) }).first()
}

async function currentStatus(card) {
  for (const label of STATUS_LABELS) {
    if (await card.getByText(label, { exact: true }).count()) return label
  }
  return ''
}

async function collectStatusHistory(card, doneStatuses, timeoutMs = 30000) {
  const startedAt = Date.now()
  const history = []

  while (Date.now() - startedAt < timeoutMs) {
    const status = await currentStatus(card)
    if (status && history[history.length - 1] !== status) {
      history.push(status)
    }
    if (doneStatuses.includes(status)) return history
    await new Promise((resolve) => setTimeout(resolve, 80))
  }

  throw new Error(`Timed out waiting for statuses: ${doneStatuses.join(', ')}`)
}

async function fillQueueTitle(card, title) {
  const input = card.getByRole('textbox', { name: 'Memory title' })
  await input.fill(title)
}

async function startUploads(page) {
  await page.getByRole('button', { name: /^Start uploads$/ }).click()
}

async function assertPreviewExists(card, kind) {
  if (kind === 'video') {
    await card.locator('video').first().waitFor({ state: 'visible', timeout: 5000 })
    return
  }

  await card.locator('img').first().waitFor({ state: 'visible', timeout: 5000 })
}

async function waitForNotice(page, pattern, timeoutMs = 10000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const text = await page.locator('[role="alert"], .text-sm').allInnerTexts().catch(() => [])
    const joined = text.join('\n')
    if (pattern.test(joined)) return joined
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Notice matching ${pattern} was not found.`)
}

async function getMemoryDocsByTitle(db, coupleId, title) {
  const snapshot = await db.collection(`couples/${coupleId}/memories`).where('title', '==', title).get()
  return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }))
}

async function listStorageObjects(bucket, prefix) {
  const [files] = await bucket.getFiles({ prefix })
  return files.map((file) => file.name).sort()
}

async function saveScreenshot(page, fileName) {
  const filePath = path.join(OUTPUT_ROOT, 'screenshots', fileName)
  await page.screenshot({ path: filePath, fullPage: true })
  return filePath
}

async function assertTileVisible(page, title) {
  await page.getByRole('heading', { name: title }).first().waitFor({ state: 'visible', timeout: 15000 })
}

async function assertTileAbsent(page, title) {
  await expectCount(page.getByRole('heading', { name: title }).first(), 0, 5000)
}

async function expectCount(locator, count, timeoutMs = 7000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await locator.count() === count) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.equal(await locator.count(), count)
}

async function searchGallery(page, title) {
  const input = page.getByRole('searchbox', { name: 'Search Album' })
  await input.fill(title)
}

async function clearGallerySearch(page) {
  const input = page.getByRole('searchbox', { name: 'Search Album' })
  await input.fill('')
}

async function openGalleryItem(page, title) {
  await searchGallery(page, title)
  await page.getByRole('button', { name: 'Open item' }).first().click()
  await page.getByRole('dialog').first().waitFor({ state: 'visible', timeout: 10000 })
}

async function closeGalleryItem(page) {
  const dialog = page.getByRole('dialog').first()
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expectCount(dialog, 0, 5000)
}

async function removeAlbumItem(page, title, confirm = true) {
  await openGalleryItem(page, title)
  await page.getByRole('button', { name: 'Remove from Album' }).click()
  const confirmDialog = page.getByRole('dialog', { name: 'Remove this Album item?' })
  await confirmDialog.waitFor({ state: 'visible', timeout: 5000 })
  if (confirm) {
    await confirmDialog.getByRole('button', { name: 'Remove from Album', exact: true }).evaluate((button) => button.click())
    await expectCount(confirmDialog, 0, 5000)
  } else {
    await confirmDialog.getByRole('button', { name: 'Cancel', exact: true }).evaluate((button) => button.click())
    await expectCount(confirmDialog, 0, 5000)
    await closeGalleryItem(page)
  }
}

async function run() {
  await ensureOutputFolders()

  const emulatorEnv = await loadEnvFile(EMULATOR_ENV_PATH)
  const projectId = requireEnv(emulatorEnv, 'COUPLEBOOK_EMULATOR_PROJECT_ID')
  const ownerEmail = requireEnv(emulatorEnv, 'COUPLEBOOK_EMULATOR_OWNER_EMAIL')
  const ownerPassword = requireEnv(emulatorEnv, 'COUPLEBOOK_EMULATOR_OWNER_PASSWORD')
  const coupleId = 'couple_alpha'
  const storageBucket = 'couplebook-97830.appspot.com'
  const storagePrefix = `couples/${coupleId}/media/`

  const { db, bucket } = initializeAdmin(projectId, storageBucket)

  await seedEmulators()
  log('Emulators seeded for media workflow proof.')

  const fixtureDir = path.join(OUTPUT_ROOT, 'fixtures')
  const suffix = uniqueSuffix()
  const fixtures = {
    imageSuccess: await createPngFixture(fixtureDir, `qa_image_success_${suffix}.png`),
    imageCancel: await createPngFixture(fixtureDir, `qa_image_cancel_${suffix}.png`),
    imageRetry: await createGifFixture(fixtureDir, `qa_image_retry_${suffix}.gif`),
    imageDuplicate: await copyFixture(path.join(FIXTURE_ROOT, 'couplebook-qa-image-webp.webp'), fixtureDir, `qa_image_duplicate_${suffix}.webp`),
    imageWebp: await copyFixture(path.join(FIXTURE_ROOT, 'couplebook-qa-image-webp.webp'), fixtureDir, `qa_image_webp_${suffix}.webp`),
    imageUnsupported: path.join(FIXTURE_ROOT, 'couplebook-qa-image-unsupported.bmp'),
    imageOversize: path.join(FIXTURE_ROOT, 'couplebook-qa-image-oversize.jpg'),
    videoSuccess: await copyFixture(path.join(FIXTURE_ROOT, 'couplebook-qa-video.mp4'), fixtureDir, `qa_video_success_${suffix}.mp4`),
    videoRemove: await copyFixture(path.join(FIXTURE_ROOT, 'couplebook-qa-video.webm'), fixtureDir, `qa_video_remove_${suffix}.webm`),
    videoWebm: await copyFixture(path.join(FIXTURE_ROOT, 'couplebook-qa-video.webm'), fixtureDir, `qa_video_webm_${suffix}.webm`),
  }

  const report = {
    generatedAt: new Date().toISOString(),
    projectId,
    coupleId,
    outputRoot: OUTPUT_ROOT,
    scenarios: {},
  }

  const { server, baseUrl } = await createServer()
  const browser = await launchBrowser()
  const networkController = createNetworkController()
  const context = await createContext(browser, networkController)
  const page = await context.newPage()

  try {
    await signIn(page, baseUrl, ownerEmail, ownerPassword)
    await openGallery(page, baseUrl)

    const initialStorageObjects = await listStorageObjects(bucket, storagePrefix)
    assert.equal(initialStorageObjects.length, 0, 'Expected emulator storage to start empty.')

    const imageTitle = 'QA Browser Image Saved'
    await setFiles(page, fixtures.imageSuccess)
    const imageCard = queueCard(page, path.basename(fixtures.imageSuccess))
    await imageCard.waitFor({ state: 'visible', timeout: 10000 })
    await assertPreviewExists(imageCard, 'image')
    await fillQueueTitle(imageCard, imageTitle)
    networkController.delayMs = 300
    const imageStatusesPromise = collectStatusHistory(imageCard, ['Saved'])
    await startUploads(page)
    const imageStatuses = await imageStatusesPromise
    networkController.delayMs = 0
    assert.deepEqual(
      ['Ready', 'Validating', 'Hashing', 'Uploading', 'Finalizing', 'Saved'].every((label) => imageStatuses.includes(label)),
      true,
      `Image upload should show every queue phase. Got: ${imageStatuses.join(', ')}`,
    )
    await waitForNotice(page, /saved to Album|saved\./i)
    await clearGallerySearch(page)
    await assertTileVisible(page, imageTitle)
    await saveScreenshot(page, 'image-saved.png')
    await openGalleryItem(page, imageTitle)
    await saveScreenshot(page, 'image-opened.png')
    await closeGalleryItem(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Our Shared Gallery' }).waitFor({ state: 'visible', timeout: 15000 })
    await assertTileVisible(page, imageTitle)
    const imageDocs = await getMemoryDocsByTitle(db, coupleId, imageTitle)
    assert.equal(imageDocs.length, 1, 'Expected one saved image memory.')
    assert.equal(imageDocs[0].data.media?.kind, 'image')
    const imageStorageAfterSave = await listStorageObjects(bucket, storagePrefix)
    assert.equal(imageStorageAfterSave.length, 1, 'Expected one stored image object after save.')
    assert.equal(imageStorageAfterSave.includes(imageDocs[0].data.media.storagePath), true)
    report.scenarios.imageSuccess = {
      statuses: imageStatuses,
      memoryId: imageDocs[0].id,
      storagePath: imageDocs[0].data.media.storagePath,
    }

    const imageCountBeforeCoverage = (await page.locator('article').count())
    await setFiles(page, fixtures.imageWebp)
    const webpCard = queueCard(page, path.basename(fixtures.imageWebp))
    await webpCard.waitFor({ state: 'visible', timeout: 10000 })
    await assertPreviewExists(webpCard, 'image')
    await webpCard.getByText('Ready', { exact: true }).waitFor({ state: 'visible', timeout: 5000 })
    await webpCard.getByText('Remove', { exact: true }).click()
    await waitForNotice(page, /ready for private upload|file is ready/i)
    await setFiles(page, fixtures.imageUnsupported)
    const unsupportedNotice = await waitForNotice(page, /Only JPG, PNG, WEBP, GIF, MP4, and WEBM files are supported/i)
    await setFiles(page, fixtures.imageOversize)
    const oversizeNotice = await waitForNotice(page, /Images must stay under 20\.0 MB/i)
    report.scenarios.imageFormatCoverage = {
      webpAccepted: true,
      unsupportedNotice,
      oversizeNotice,
      queueCountSnapshot: await page.locator('article').count(),
      queueCountBeforeCoverage: imageCountBeforeCoverage,
    }

    const cancelTitle = 'QA Browser Image Cancelled'
    const storageBeforeCancel = await listStorageObjects(bucket, storagePrefix)
    await setFiles(page, fixtures.imageCancel)
    const cancelCard = queueCard(page, path.basename(fixtures.imageCancel))
    await cancelCard.waitFor({ state: 'visible', timeout: 10000 })
    await fillQueueTitle(cancelCard, cancelTitle)
    networkController.delayMs = 2000
    const cancelStatusesPromise = collectStatusHistory(cancelCard, ['Cancelled'])
    await startUploads(page)
    await cancelCard.getByText('Uploading', { exact: true }).waitFor({ state: 'visible', timeout: 15000 })
    await cancelCard.getByRole('button', { name: new RegExp(`Cancel upload for ${path.basename(fixtures.imageCancel).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click()
    const cancelStatuses = await cancelStatusesPromise
    networkController.delayMs = 0
    await waitForNotice(page, /Upload cancelled/i)
    const cancelDocs = await getMemoryDocsByTitle(db, coupleId, cancelTitle)
    assert.equal(cancelDocs.length, 0, 'Cancelled upload should not create a memory.')
    const storageAfterCancel = await listStorageObjects(bucket, storagePrefix)
    assert.deepEqual(storageAfterCancel, storageBeforeCancel, 'Cancelled upload should not leave storage objects behind.')
    await saveScreenshot(page, 'image-cancelled.png')
    report.scenarios.cancellation = {
      statuses: cancelStatuses,
      storageObjectCountBefore: storageBeforeCancel.length,
      storageObjectCountAfter: storageAfterCancel.length,
    }

    const retryTitle = 'QA Browser Image Retried'
    const storageBeforeRetry = await listStorageObjects(bucket, storagePrefix)
    await setFiles(page, fixtures.imageRetry)
    const retryCard = queueCard(page, path.basename(fixtures.imageRetry))
    await retryCard.waitFor({ state: 'visible', timeout: 10000 })
    await fillQueueTitle(retryCard, retryTitle)
    await page.evaluate(() => {
      globalThis.__COUPLEBOOK_UPLOAD_TEST__.failUploadsRemaining = 1
    })
    const retryFailureStatusesPromise = collectStatusHistory(retryCard, ['Needs review'])
    await startUploads(page)
    const retryFailureStatuses = await retryFailureStatusesPromise
    await retryCard.getByRole('button', { name: new RegExp(`Retry upload for ${path.basename(fixtures.imageRetry).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).waitFor({ state: 'visible', timeout: 10000 })
    await saveScreenshot(page, 'image-retry-failed.png')
    await page.evaluate(() => {
      globalThis.__COUPLEBOOK_UPLOAD_TEST__.failUploadsRemaining = 0
    })
    const retrySuccessStatusesPromise = collectStatusHistory(retryCard, ['Saved'])
    await retryCard.getByRole('button', { name: new RegExp(`Retry upload for ${path.basename(fixtures.imageRetry).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click()
    const retrySuccessStatuses = await retrySuccessStatusesPromise
    const retryDocs = await getMemoryDocsByTitle(db, coupleId, retryTitle)
    assert.equal(retryDocs.length, 1, 'Retry flow should end with exactly one memory.')
    const storageAfterRetry = await listStorageObjects(bucket, storagePrefix)
    assert.equal(storageAfterRetry.length, storageBeforeRetry.length + 1, 'Retry flow should create exactly one storage object.')
    assert.equal(storageAfterRetry.includes(retryDocs[0].data.media.storagePath), true)
    await saveScreenshot(page, 'image-retry-saved.png')
    report.scenarios.retry = {
      failedStatuses: retryFailureStatuses,
      successStatuses: retrySuccessStatuses,
      memoryId: retryDocs[0].id,
      storagePath: retryDocs[0].data.media.storagePath,
    }

    const duplicateTitle = 'QA Browser Image Duplicate'
    await setFiles(page, [fixtures.imageDuplicate, fixtures.imageDuplicate])
    const duplicateCard = queueCard(page, path.basename(fixtures.imageDuplicate))
    await duplicateCard.waitFor({ state: 'visible', timeout: 10000 })
    await fillQueueTitle(duplicateCard, duplicateTitle)
    const duplicateStatusesPromise = collectStatusHistory(duplicateCard, ['Saved'])
    await startUploads(page)
    const duplicateStatuses = await duplicateStatusesPromise
    const duplicateDocs = await getMemoryDocsByTitle(db, coupleId, duplicateTitle)
    assert.equal(duplicateDocs.length, 1, 'Duplicate-in-selection flow should save one memory only.')
    await setFiles(page, fixtures.imageDuplicate)
    const duplicateLaterNotice = await waitForNotice(page, /already in the current private Album queue|Duplicate private media was blocked before upload/i)
    const duplicateDocsAfterLaterRun = await getMemoryDocsByTitle(db, coupleId, duplicateTitle)
    assert.equal(duplicateDocsAfterLaterRun.length, 1, 'Later duplicate run must not create extra memories.')
    await saveScreenshot(page, 'image-duplicate.png')
    report.scenarios.duplicates = {
      statuses: duplicateStatuses,
      duplicateLaterNotice,
      memoryId: duplicateDocs[0].id,
    }

    const videoTitle = 'QA Browser Video Saved'
    await setFiles(page, fixtures.videoSuccess)
    const videoCard = queueCard(page, path.basename(fixtures.videoSuccess))
    await videoCard.waitFor({ state: 'visible', timeout: 10000 })
    await assertPreviewExists(videoCard, 'video')
    await fillQueueTitle(videoCard, videoTitle)
    networkController.delayMs = 300
    const videoStatusesPromise = collectStatusHistory(videoCard, ['Saved'])
    await startUploads(page)
    const videoStatuses = await videoStatusesPromise
    networkController.delayMs = 0
    assert.deepEqual(
      ['Ready', 'Validating', 'Hashing', 'Uploading', 'Finalizing', 'Saved'].every((label) => videoStatuses.includes(label)),
      true,
      `Video upload should show every queue phase. Got: ${videoStatuses.join(', ')}`,
    )
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Our Shared Gallery' }).waitFor({ state: 'visible', timeout: 15000 })
    await assertTileVisible(page, videoTitle)
    const videoDocs = await getMemoryDocsByTitle(db, coupleId, videoTitle)
    assert.equal(videoDocs.length, 1, 'Expected one saved video memory.')
    assert.equal(videoDocs[0].data.media?.kind, 'video')
    await saveScreenshot(page, 'video-saved.png')
    report.scenarios.videoSuccess = {
      statuses: videoStatuses,
      memoryId: videoDocs[0].id,
      storagePath: videoDocs[0].data.media.storagePath,
    }

    await setFiles(page, fixtures.videoWebm)
    const webmCard = queueCard(page, path.basename(fixtures.videoWebm))
    await webmCard.waitFor({ state: 'visible', timeout: 10000 })
    await assertPreviewExists(webmCard, 'video')
    await webmCard.getByText('Ready', { exact: true }).waitFor({ state: 'visible', timeout: 5000 })
    await webmCard.getByText('Remove', { exact: true }).click()
    report.scenarios.webm = { accepted: true }

    await removeAlbumItem(page, imageTitle, false)
    await expectCount(page.getByRole('dialog', { name: 'Remove this Album item?' }), 0, 5000)
    const imageDocBeforeRemove = (await getMemoryDocsByTitle(db, coupleId, imageTitle))[0]
    assert.equal(imageDocBeforeRemove.data.status, 'active')
    await removeAlbumItem(page, imageTitle, true)
    await waitForNotice(page, /was removed from Album|was removed, but Album refresh still needs attention/i, 15000)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Our Shared Gallery' }).waitFor({ state: 'visible', timeout: 15000 })
    await searchGallery(page, imageTitle)
    await assertTileAbsent(page, imageTitle)
    const removedImageDoc = (await getMemoryDocsByTitle(db, coupleId, imageTitle))[0]
    assert.equal(removedImageDoc.data.status, 'archived')
    assert.equal(removedImageDoc.data.mediaState, 'none')
    assert.equal('media' in removedImageDoc.data, false)
    const storageAfterImageRemoval = await listStorageObjects(bucket, storagePrefix)
    assert.equal(storageAfterImageRemoval.includes(report.scenarios.imageSuccess.storagePath), false)
    await saveScreenshot(page, 'image-removed.png')
    await clearGallerySearch(page)
    report.scenarios.imageRemoval = {
      memoryId: removedImageDoc.id,
      status: removedImageDoc.data.status,
    }

    const removeVideoTitle = 'QA Browser Video Removed'
    await setFiles(page, fixtures.videoRemove)
    const removeVideoCard = queueCard(page, path.basename(fixtures.videoRemove))
    await removeVideoCard.waitFor({ state: 'visible', timeout: 10000 })
    await fillQueueTitle(removeVideoCard, removeVideoTitle)
    const removeVideoStatusesPromise = collectStatusHistory(removeVideoCard, ['Saved'])
    await startUploads(page)
    await removeVideoStatusesPromise
    const removeVideoDocs = await getMemoryDocsByTitle(db, coupleId, removeVideoTitle)
    assert.equal(removeVideoDocs.length, 1, 'Expected one removable saved video memory.')
    await removeAlbumItem(page, removeVideoTitle, false)
    const videoDocBeforeRemove = (await getMemoryDocsByTitle(db, coupleId, removeVideoTitle))[0]
    assert.equal(videoDocBeforeRemove.data.status, 'active')
    await removeAlbumItem(page, removeVideoTitle, true)
    await waitForNotice(page, /was removed from Album|was removed, but Album refresh still needs attention/i, 15000)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Our Shared Gallery' }).waitFor({ state: 'visible', timeout: 15000 })
    await searchGallery(page, removeVideoTitle)
    await assertTileAbsent(page, removeVideoTitle)
    const removedVideoDoc = (await getMemoryDocsByTitle(db, coupleId, removeVideoTitle))[0]
    assert.equal(removedVideoDoc.data.status, 'archived')
    assert.equal(removedVideoDoc.data.mediaState, 'none')
    assert.equal('media' in removedVideoDoc.data, false)
    const storageAfterVideoRemoval = await listStorageObjects(bucket, storagePrefix)
    assert.equal(storageAfterVideoRemoval.includes(removeVideoDocs[0].data.media.storagePath), false)
    await saveScreenshot(page, 'video-removed.png')
    report.scenarios.videoRemoval = {
      memoryId: removedVideoDoc.id,
      status: removedVideoDoc.data.status,
    }

    await clearGallerySearch(page)
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'media-workflow-report.json'), JSON.stringify(report, null, 2))
    log(`Media workflow proof passed. Report: ${path.join(OUTPUT_ROOT, 'media-workflow-report.json')}`)
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
    await server.close().catch(() => {})
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exit(1)
})
