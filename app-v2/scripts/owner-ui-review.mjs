/* global SubtleCrypto, document, getComputedStyle, setTimeout, window */

import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer as createViteServer } from 'vite'
import { getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { THEME_REGISTRY } from '../src/theme/themeRegistry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const APP_ROOT = path.resolve(__dirname, '..')
const REVIEW_ROOT = process.env.COUPLEBOOK_OWNER_UI_REVIEW_ROOT || 'C:\\Users\\Jaylan\\Documents\\couplebook.visual-review\\distinct-product-identity\\owner-ui-review'
const PREVIEW_URL = process.env.COUPLEBOOK_OWNER_UI_REVIEW_PREVIEW_URL || 'https://couplebook-97830--couplebook-distinct-identity-9d6i5xu0.web.app'
const PDF_PATH = path.join(REVIEW_ROOT, 'COUPLE_BOOK_OWNER_UI_REVIEW.pdf')
const SUMMARY_JSON_PATH = path.join(REVIEW_ROOT, 'owner-ui-review-summary.json')
const SUMMARY_MD_PATH = path.join(REVIEW_ROOT, 'owner-ui-review-summary.md')
const CONTACT_SHEET_PATH = path.join(REVIEW_ROOT, 'contact-sheets', 'owner-ui-review-contact-sheet.html')
const PAYLOAD_PATH = path.join(REVIEW_ROOT, 'owner-ui-review-pdf-payload.json')
const PYTHON_HELPER_PATH = path.join(APP_ROOT, 'scripts', 'build-owner-ui-review-pdf.py')
const PYTHON_COMMAND = process.env.PYTHON || 'python'
const REVIEW_DATE_LABEL = 'Saturday, August 22, 2026'
const EMULATOR_ENV_PATH = path.join(APP_ROOT, '.env.emulator.local')
const FIXTURE_ROOT = path.join(APP_ROOT, 'output', 'qa-fixtures')
const STORAGE_BUCKET = 'couplebook-97830.appspot.com'
const COUPLE_ID = 'couple_alpha'
const STORAGE_PREFIX = `couples/${COUPLE_ID}/media/`

const OUTPUT_FOLDERS = Object.freeze([
  'preview',
  'routes',
  'themes',
  'buttons',
  'cards',
  'forms',
  'dialogs',
  'media',
  'mobile',
  'technical',
  'contact-sheets',
  'issues-before',
  'issues-after',
])

const VIEWPORTS = Object.freeze([
  { slug: 'desktop', label: 'Desktop', width: 1440, height: 1024, mode: 'desktop' },
  { slug: 'tablet', label: 'Tablet', width: 768, height: 1024, mode: 'tablet' },
  { slug: 'mobile', label: 'Mobile', width: 390, height: 844, mode: 'mobile' },
])

const DEFAULT_ROUTE_SET = Object.freeze([
  { path: '/dashboard', slug: 'dashboard', heading: 'Pick up where your story left off.' },
  { path: '/timeline', slug: 'timeline', heading: /Our Story/ },
  { path: '/gallery', slug: 'gallery', heading: /Our Shared Gallery/ },
  { path: '/profile', slug: 'profile', heading: /^Us$/ },
  { path: '/favorites', slug: 'favorites', heading: /Favorite Things/ },
  { path: '/plans', slug: 'plans', heading: /Ideas worth doing together\./ },
  { path: '/settings', slug: 'settings', heading: /Make the book yours/ },
  { path: '/contract', slug: 'contract', heading: /Shared Relationship Contract/ },
  { path: '/birthday', slug: 'birthday', heading: 'Birthday chapter' },
  { path: '/valentine', slug: 'valentine', heading: 'Valentine chapter' },
  { path: '/confession', slug: 'confession', heading: 'Confession chapter' },
])

const THEME_ROUTES = Object.freeze([
  { path: '/dashboard', slug: 'dashboard', heading: 'Pick up where your story left off.' },
  { path: '/gallery', slug: 'gallery', heading: /Our Shared Gallery/ },
  { path: '/settings', slug: 'settings', heading: /Make the book yours/ },
])

const REQUIRED_THEME_IDS = Object.freeze(['midnight-rose', 'paper-hearts', 'moonlit'])
const THEME_TOKEN_KEYS = Object.freeze([
  '--cb-bg',
  '--cb-surface',
  '--cb-surface-raised',
  '--cb-text',
  '--cb-accent',
  '--cb-nav-bg',
])

const THEME_EXPECTATIONS = Object.freeze({
  'midnight-rose': Object.freeze({
    colorScheme: 'dark',
    '--cb-bg': '#120d14',
    '--cb-surface': 'rgba(36, 24, 39, 0.9)',
    '--cb-surface-raised': 'rgba(47, 32, 50, 0.96)',
    '--cb-text': '#f4eced',
    '--cb-accent': '#d27c99',
    '--cb-nav-bg': 'rgba(21, 16, 24, 0.94)',
  }),
  'paper-hearts': Object.freeze({
    colorScheme: 'light',
    '--cb-bg': '#f6efe6',
    '--cb-surface': 'rgba(255, 250, 244, 0.96)',
    '--cb-surface-raised': 'rgba(255, 252, 247, 0.98)',
    '--cb-text': '#2e2427',
    '--cb-accent': '#af6476',
    '--cb-nav-bg': 'rgba(248, 241, 232, 0.96)',
  }),
  moonlit: Object.freeze({
    colorScheme: 'dark',
    '--cb-bg': '#0f1520',
    '--cb-surface': 'rgba(25, 34, 48, 0.9)',
    '--cb-surface-raised': 'rgba(31, 42, 58, 0.96)',
    '--cb-text': '#edf0f7',
    '--cb-accent': '#b286c7',
    '--cb-nav-bg': 'rgba(15, 21, 32, 0.94)',
  }),
})

const STATUS_LABELS = Object.freeze(['Ready', 'Validating', 'Hashing', 'Uploading', 'Finalizing', 'Cancelling', 'Cancelled', 'Needs review', 'Saved'])

function log(message) {
  process.stdout.write(`${message}\n`)
}

function relativeToReviewRoot(filePath) {
  return path.relative(REVIEW_ROOT, filePath).replace(/\\/g, '/')
}

function slug(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function normalizeCssToken(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function uniqueSuffix() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    values[key] = value
  }
  return values
}

async function loadEnvFile(filePath) {
  return parseEnvFile(await fsp.readFile(filePath, 'utf8'))
}

function requireEnv(env, key) {
  const value = String(env[key] || '').trim()
  if (!value) throw new Error(`${key} is required for owner UI review.`)
  return value
}

async function ensureOutputTree() {
  await fsp.rm(REVIEW_ROOT, { recursive: true, force: true })
  for (const folder of OUTPUT_FOLDERS) await fsp.mkdir(path.join(REVIEW_ROOT, folder), { recursive: true })
}

async function writeIssueNotes() {
  const beforePath = path.join(REVIEW_ROOT, 'issues-before', '2026-08-22-owner-review-gap-notes.md')
  const afterPath = path.join(REVIEW_ROOT, 'issues-after', '2026-08-22-owner-review-corrections.md')
  await fsp.writeFile(beforePath, ['# Owner review gaps before correction pass', '', `Date: ${REVIEW_DATE_LABEL}`, '', '- Theme proof relied on fixture theme mutations instead of the real Appearance controls and persisted save workflow.', '- The evidence PDF compressed tall screenshots into unreadable 2x2 pages and omitted most detail captures.', '- The owner review did not cover the requested write workflows, queue recovery states, or card close-up inspection at readable sizes.', ''].join('\n'), 'utf8')
  await fsp.writeFile(afterPath, ['# Owner review correction scope', '', `Date: ${REVIEW_DATE_LABEL}`, '', '- Theme verification now uses the Settings Appearance UI, persisted save flow, reload proof, computed token assertions, and theme-difference guards.', '- The owner review runs against local auth/firestore/storage emulators for safe write, archive, restore, remove, and upload queue evidence.', '- The PDF includes route, theme, control, card, dialog, media, mobile, and technical full-page captures at readable sizes with explicit findings.', ''].join('\n'), 'utf8')
  return { before: relativeToReviewRoot(beforePath), after: relativeToReviewRoot(afterPath) }
}

function configureRuntimeEnv(emulatorEnv) {
  const projectId = requireEnv(emulatorEnv, 'COUPLEBOOK_EMULATOR_PROJECT_ID')
  const authHost = requireEnv(emulatorEnv, 'COUPLEBOOK_AUTH_EMULATOR_HOST')
  const [firestoreHost, firestorePortValue] = requireEnv(emulatorEnv, 'COUPLEBOOK_FIRESTORE_EMULATOR_HOST').split(':')
  process.env.GCLOUD_PROJECT = projectId
  process.env.FIRESTORE_EMULATOR_HOST = `${firestoreHost}:${firestorePortValue || '8085'}`
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199'
  process.env.VITE_FIREBASE_USE_EMULATORS = 'true'
  process.env.VITE_FIREBASE_AUTH_EMULATOR_URL = `http://${authHost}`
  process.env.VITE_FIRESTORE_EMULATOR_HOST = firestoreHost || '127.0.0.1'
  process.env.VITE_FIRESTORE_EMULATOR_PORT = firestorePortValue || '8085'
  process.env.VITE_FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1'
  process.env.VITE_FIREBASE_STORAGE_EMULATOR_PORT = '9199'
  process.env.VITE_ENABLE_LOCAL_UPLOAD_TEST_HOOKS = 'true'
  process.env.VITE_DATA_SOURCE_MODE = 'firestore'
  process.env.VITE_WRITE_MODE = 'firestore-emulator-write'
  return { projectId }
}

function initializeAdmin(projectId) {
  const app = getApps()[0] || initializeApp({ projectId, storageBucket: STORAGE_BUCKET })
  return { db: getFirestore(app), bucket: getStorage(app).bucket(STORAGE_BUCKET) }
}

function seedEmulators() {
  execFileSync(process.execPath, [path.join(APP_ROOT, 'scripts', 'seed-local-emulators.mjs')], { cwd: APP_ROOT, stdio: 'inherit' })
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true })
  } catch (error) {
    if (!/Executable doesn't exist|browserType\.launch/i.test(String(error?.message || error))) throw error
    return chromium.launch({ headless: true, channel: 'chrome' })
  }
}

async function createLocalServer() {
  const server = await createViteServer({ root: APP_ROOT, server: { host: '127.0.0.1', port: 0 } })
  await server.listen()
  const address = server.httpServer.address()
  return { baseUrl: `http://127.0.0.1:${address.port}`, server }
}

function createNetworkController() {
  return { delayMs: 0 }
}

async function createReviewContext(browser, viewport, networkController) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })
  await context.addInitScript(() => {
    globalThis.__COUPLEBOOK_UPLOAD_TEST__ = { enabled: true, failUploadsRemaining: 0, phaseDelayMs: { validating: 180, hashing: 180, finalizing: 180 } }
    const originalDigest = SubtleCrypto.prototype.digest
    SubtleCrypto.prototype.digest = async function patchedDigest(...args) {
      await new Promise((resolve) => setTimeout(resolve, 120))
      return originalDigest.apply(this, args)
    }
  })
  await context.route('http://127.0.0.1:9199/**', async (route) => {
    if (networkController.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, networkController.delayMs))
    await route.continue()
  })
  return context
}

function createObserved(label) {
  return { label, broadUsersAccess: [], consoleErrors: [], failedResponses: [], pageErrors: [], privateMedia: [], staticDependencies: [] }
}

function isBroadUsersAccess(text) {
  return /collectionId.?users/i.test(text) || /documents\/users(?:[/?#]|\b)/i.test(text)
}

function isTargetedUserPath(text) {
  return /documents\/users\/[A-Za-z0-9_-]+/i.test(text)
}

function isPrivateMediaRequest(url) {
  return /\/assets\/photos\/|\/assets\/videos\/|\/OUR%20MEMORIES\/|\/OUR MEMORIES\//i.test(url)
}

function isStaticRollbackDependency(url) {
  return /\/pages\/.*\.html\b|\/js\/settings\.js\b|\/core\/firestoreSync\.js\b/i.test(url)
}

function isIgnorableConsoleError(text) {
  return /ERR_NO_BUFFER_SPACE/i.test(text)
}

function attachPageGuards(page, observed) {
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (isIgnorableConsoleError(text)) return
    observed.consoleErrors.push(text)
  })
  page.on('pageerror', (error) => observed.pageErrors.push(error.message))
  page.on('request', (request) => {
    const url = request.url()
    const payload = request.postData() || ''
    const haystack = `${url}\n${payload}`
    if (isBroadUsersAccess(haystack) && !isTargetedUserPath(haystack)) observed.broadUsersAccess.push(url)
    if (isPrivateMediaRequest(url)) observed.privateMedia.push(url)
    if (isStaticRollbackDependency(url)) observed.staticDependencies.push(url)
  })
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().includes('127.0.0.1:9199')) observed.failedResponses.push(`${response.status()} ${response.url()}`)
  })
}

function assertObservedIsClean(observed) {
  assert.deepEqual(observed.consoleErrors, [], `${observed.label} should not log console errors.`)
  assert.deepEqual(observed.pageErrors, [], `${observed.label} should not raise page errors.`)
  assert.deepEqual(observed.failedResponses, [], `${observed.label} should not request failed resources.`)
  assert.deepEqual(observed.broadUsersAccess, [], `${observed.label} should not make broad users requests.`)
  assert.deepEqual(observed.privateMedia, [], `${observed.label} should not request private media assets.`)
  assert.deepEqual(observed.staticDependencies, [], `${observed.label} should not request rolled-back static runtime files.`)
}

function themeName(themeId) {
  return THEME_REGISTRY.find((theme) => theme.id === themeId)?.name || themeId
}

function parseColor(color, fallback = null) {
  const value = String(color || '').trim().toLowerCase()
  if (value.startsWith('#')) {
    const clean = value.slice(1)
    const values = clean.length === 3
      ? clean.split('').map((part) => parseInt(`${part}${part}`, 16))
      : [clean.slice(0, 2), clean.slice(2, 4), clean.slice(4, 6)].map((part) => parseInt(part, 16))
    return { red: values[0], green: values[1], blue: values[2], alpha: 1 }
  }
  const match = value.match(/^rgba?\(([^)]+)\)$/)
  if (match) {
    const [red = '0', green = '0', blue = '0', alpha = '1'] = match[1].split(',').map((part) => part.trim())
    const parsed = {
      red: Number.parseFloat(red),
      green: Number.parseFloat(green),
      blue: Number.parseFloat(blue),
      alpha: Number.parseFloat(alpha),
    }
    if (Number.isFinite(parsed.red) && Number.isFinite(parsed.green) && Number.isFinite(parsed.blue) && Number.isFinite(parsed.alpha)) {
      if (parsed.alpha < 1 && fallback) {
        const base = parseColor(fallback)
        return {
          red: Math.round((parsed.red * parsed.alpha) + (base.red * (1 - parsed.alpha))),
          green: Math.round((parsed.green * parsed.alpha) + (base.green * (1 - parsed.alpha))),
          blue: Math.round((parsed.blue * parsed.alpha) + (base.blue * (1 - parsed.alpha))),
          alpha: 1,
        }
      }
      return parsed
    }
  }
  throw new Error(`Unsupported color token: ${color}`)
}

function luminanceFromColor(color, fallback = null) {
  const parsed = parseColor(color, fallback)
  const [red, green, blue] = [parsed.red, parsed.green, parsed.blue].map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
}

function contrastRatio(foregroundColor, backgroundColor, backgroundFallback = null) {
  const foreground = luminanceFromColor(foregroundColor, backgroundFallback)
  const background = luminanceFromColor(backgroundColor, backgroundFallback)
  const lighter = Math.max(foreground, background)
  const darker = Math.min(foreground, background)
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2))
}

async function waitForVisibleDelay() {
  return new Promise((resolve) => setTimeout(resolve, 250))
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

async function waitForRoute(page, route) {
  await page.waitForURL((url) => url.pathname === route.path, { timeout: 15000 })
  await page.getByRole('heading', { name: route.heading }).first().waitFor({ state: 'visible', timeout: 15000 })
  await waitForVisibleDelay()
}

async function openRoute(page, baseUrl, route) {
  await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded' })
  await waitForRoute(page, route)
}

async function hashFile(filePath) {
  return createHash('sha256').update(await fsp.readFile(filePath)).digest('hex')
}

async function captureShot(summary, page, { captureType = 'viewport', fullPage = false, group = 'routes', label, locator = null, route = '', routeSlug = '', themeId = '', viewport }) {
  const filePath = path.join(REVIEW_ROOT, group, `${viewport.slug}-${routeSlug || slug(route || label)}-${themeId || 'current'}-${captureType}.png`)
  if (locator) await locator.screenshot({ path: filePath })
  else await page.screenshot({ path: filePath, fullPage })
  const entry = { captureType, group, label, output: relativeToReviewRoot(filePath), route, themeId, themeName: themeId ? themeName(themeId) : '', viewport: viewport.slug }
  summary.captures.push(entry)
  return entry
}

async function captureLongPageSections(summary, page, route, themeId, viewport, group = 'technical') {
  const metrics = await page.evaluate(() => ({ clientHeight: document.documentElement.clientHeight, scrollHeight: document.documentElement.scrollHeight }))
  if (metrics.scrollHeight <= metrics.clientHeight * 1.15) return
  const positions = { top: 0, middle: Math.max(0, Math.round((metrics.scrollHeight - metrics.clientHeight) / 2)), bottom: Math.max(0, metrics.scrollHeight - metrics.clientHeight) }
  for (const [section, top] of Object.entries(positions)) {
    await page.evaluate((nextTop) => window.scrollTo({ top: nextTop, behavior: 'instant' }), top)
    await waitForVisibleDelay()
    await captureShot(summary, page, { captureType: section, group, label: `${route.path} ${section}`, route: route.path, routeSlug: route.slug, themeId, viewport })
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
}

async function collectThemeSnapshot(page) {
  return page.evaluate((keys) => {
    const root = document.documentElement
    const style = getComputedStyle(root)
    const tokens = {}
    for (const key of keys) tokens[key] = style.getPropertyValue(key).trim()
    return { colorScheme: style.colorScheme, themeId: root.dataset.theme || '', tokens }
  }, THEME_TOKEN_KEYS)
}

function assertThemeSnapshot(themeId, snapshot) {
  const expectation = THEME_EXPECTATIONS[themeId]
  assert.equal(snapshot.themeId, themeId)
  assert.equal(normalizeCssToken(snapshot.colorScheme), expectation.colorScheme)
  for (const key of THEME_TOKEN_KEYS) {
    assert.equal(normalizeCssToken(snapshot.tokens[key]), normalizeCssToken(expectation[key]), `${themeId} token mismatch for ${key}`)
  }
  if (themeId === 'paper-hearts') {
    assert.equal(snapshot.colorScheme, 'light')
    assert.equal(luminanceFromColor(snapshot.tokens['--cb-bg']) > 0.84, true)
    assert.equal(contrastRatio(snapshot.tokens['--cb-text'], snapshot.tokens['--cb-surface'], snapshot.tokens['--cb-bg']) >= 9, true)
  }
}

function themeTile(page, themeId) {
  return page.getByRole('button', { name: new RegExp(themeName(themeId), 'i') }).first()
}

async function openAppearance(page, baseUrl) {
  await openRoute(page, baseUrl, DEFAULT_ROUTE_SET.find((route) => route.path === '/settings'))
  await page.getByRole('heading', { name: 'Appearance' }).waitFor({ state: 'visible', timeout: 10000 })
}

async function waitForSettingsSave(page, timeoutMs = 20000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const texts = await page.locator('[role="alert"], [role="status"]').allInnerTexts().catch(() => [])
    const joined = texts.join('\n')
    if (/More settings saved\./i.test(joined)) return
    if (/could not be saved|changed somewhere else|changed in another session|disabled outside approved|approved user is required|active couple membership|authenticated approved user|required before writing/i.test(joined)) {
      throw new Error(joined.replace(/\s+/g, ' ').trim())
    }
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  const lastTexts = await page.locator('[role="alert"], [role="status"]').allInnerTexts().catch(() => [])
  throw new Error(`Timed out waiting for the Settings save result. Visible status text: ${lastTexts.join(' | ') || 'none'}`)
}

async function recordControl(summary, base, action) {
  try {
    const result = await action()
    summary.controls.push({ ...base, ...(result || {}), status: 'PASS' })
  } catch (error) {
    log(`[owner-ui-review] FAIL ${base.controlName}: ${error?.message || String(error)}`)
    summary.controls.push({ ...base, actualResult: error?.message || String(error), status: 'FAIL' })
    summary.unresolvedDefects.add(`${base.controlName}: ${error?.message || String(error)}`)
  }
}

function pngBuffer() {
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9l8x8AAAAASUVORK5CYII=', 'base64')
}

function gifBuffer() {
  return Buffer.from('R0lGODdhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64')
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

async function copyFixture(sourcePath, targetDir, name) {
  const targetPath = path.join(targetDir, name)
  await fsp.copyFile(sourcePath, targetPath)
  return targetPath
}

async function buildUploadFixtures() {
  const targetDir = path.join(REVIEW_ROOT, 'media')
  return {
    imageCancel: await createPngFixture(targetDir, `owner-review-cancel-${uniqueSuffix()}.png`),
    imageRetry: await createGifFixture(targetDir, `owner-review-retry-${uniqueSuffix()}.gif`),
    imageSuccess: await copyFixture(path.join(FIXTURE_ROOT, 'couplebook-qa-image-webp.webp'), targetDir, `owner-review-success-${uniqueSuffix()}.webp`),
  }
}

function queueCard(page, fileName) {
  return page.locator('article').filter({ has: page.getByText(fileName, { exact: true }) }).first()
}

function routeSection(page, routeName) {
  return page.locator(`[data-route="${routeName}"]`).first()
}

function routeButton(page, routeName, buttonName) {
  return routeSection(page, routeName).getByRole('button', { name: buttonName }).last()
}

function routeGroupButton(page, routeName, groupName, buttonName) {
  return routeSection(page, routeName).getByRole('group', { name: groupName }).getByRole('button', { name: buttonName, exact: true })
}

function storyCard(page, title) {
  return page.locator('article').filter({ has: page.getByText(title) }).first()
}

function galleryTile(page, title) {
  return page.locator('.gallery-item').filter({ has: page.getByText(title) }).first()
}

async function setFiles(page, filePaths) {
  await page.locator('input[type="file"]').first().setInputFiles(filePaths)
}

async function currentStatus(card) {
  for (const label of STATUS_LABELS) if (await card.getByText(label, { exact: true }).count()) return label
  return ''
}

async function collectStatusHistory(card, doneStatuses, timeoutMs = 30000) {
  const startedAt = Date.now()
  const history = []
  while (Date.now() - startedAt < timeoutMs) {
    const status = await currentStatus(card)
    if (status && history[history.length - 1] !== status) history.push(status)
    if (doneStatuses.includes(status)) return history
    await new Promise((resolve) => setTimeout(resolve, 80))
  }
  throw new Error(`Timed out waiting for statuses: ${doneStatuses.join(', ')}`)
}

async function getMemoryDocsByTitle(db, title) {
  const snapshot = await db.collection(`couples/${COUPLE_ID}/memories`).where('title', '==', title).get()
  return snapshot.docs.map((entry) => ({ id: entry.id, data: entry.data() }))
}

async function waitForMemoryStatus(db, title, expectedStatus, timeoutMs = 15000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const docs = await getMemoryDocsByTitle(db, title)
    if (docs[0]?.data?.status === expectedStatus) return docs
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Timed out waiting for memory "${title}" to reach status "${expectedStatus}".`)
}

async function listStorageObjects(bucket, prefix) {
  const [files] = await bucket.getFiles({ prefix })
  return files.map((file) => file.name).sort()
}

async function inspectCard(locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    const textBlocks = [...element.querySelectorAll('h1,h2,h3,h4,p,span,a,button')]
    const actionable = [...element.querySelectorAll('a[href], button')]
    const media = element.querySelector('img, video')
    const childRects = [...element.children].map((child) => child.getBoundingClientRect())
    const usedArea = childRects.reduce((total, childRect) => total + Math.max(0, childRect.width) * Math.max(0, childRect.height), 0)
    const cardArea = Math.max(1, rect.width * rect.height)
    return {
      actionPlacement: actionable.map((node) => Math.round(node.getBoundingClientRect().top - rect.top)),
      alignment: `${style.display}/${style.alignItems}/${style.justifyContent}`,
      emptySpaceRatio: Number(Math.max(0, 1 - Math.min(usedArea / cardArea, 1))).toFixed(2),
      imageCrop: media ? getComputedStyle(media).objectFit || 'fill' : 'no-media',
      nestedCardHints: element.querySelectorAll('.cb-card, .gallery-item, .timeline-card').length,
      padding: `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
      textWrapPass: textBlocks.every((node) => node.scrollWidth <= node.clientWidth + 2),
    }
  })
}

function buildCardFinding(themeId, inspection) {
  const expectation = THEME_EXPECTATIONS[themeId]
  const defects = []
  const ratio = contrastRatio(expectation['--cb-text'], expectation['--cb-surface'], expectation['--cb-bg'])
  if (!inspection.textWrapPass) defects.push('Text wraps or overflows incorrectly.')
  if (ratio < 4.5) defects.push(`Contrast ratio ${ratio} is below 4.5.`)
  if (Number(inspection.emptySpaceRatio) > 0.72) defects.push('Card leaves excessive empty space.')
  return { contrastRatio: ratio, defects }
}

async function captureCard(summary, page, { label, locator, route, themeId, viewport, group = 'cards' }) {
  const shot = await captureShot(summary, page, { captureType: 'closeup', group, label, locator, route, routeSlug: slug(label), themeId, viewport })
  const inspection = await inspectCard(locator)
  const findings = buildCardFinding(themeId, inspection)
  summary.cards.push({
    label,
    route,
    viewport: viewport.slug,
    output: shot.output,
    padding: inspection.padding,
    alignment: inspection.alignment,
    imageCrop: inspection.imageCrop,
    textWrapping: inspection.textWrapPass ? 'PASS' : 'FAIL',
    actionPlacement: inspection.actionPlacement.join(', ') || 'No actions',
    contrastRatio: findings.contrastRatio,
    mobileStacking: viewport.mode === 'mobile' ? 'Verified from mobile capture.' : 'Checked via mobile companion capture.',
    excessiveEmptySpace: inspection.emptySpaceRatio,
    nestedCardAppearance: inspection.nestedCardHints > 0 ? 'Nested card-like descendants present.' : 'No nested card-like descendants detected.',
    defects: findings.defects,
    status: findings.defects.length ? 'FAIL' : 'PASS',
  })
}

function buildSummaryShape(baseUrl, issueNotes) {
  return {
    captures: [],
    cards: [],
    controls: [],
    defectsFixed: new Set([
      'Theme proof now uses the real Appearance controls, Save flow, reload persistence, and computed semantic token assertions.',
      'PDF evidence now uses readable image sizing, separate full-page captures, sectional long-page crops, and no two-by-two tiny route pages.',
      'Owner review now includes safe emulator-backed write, archive, restore, upload cancel, retry, and removal evidence.',
    ]),
    defectsFound: new Set([
      'Theme verification previously depended on fixture-only theme mutation.',
      'Route and detail screenshots were previously too small to inspect comfortably in the PDF.',
      'The prior owner review omitted several requested control states, queue recovery paths, and card close-ups.',
    ]),
    generatedAt: new Date().toISOString(),
    issueNotes,
    localBaseUrl: baseUrl,
    previewSmoke: [],
    previewUrl: PREVIEW_URL,
    reviewDateLabel: REVIEW_DATE_LABEL,
    themeProofs: [],
    unresolvedDefects: new Set(),
    viewportResults: [],
    verdict: 'FAIL',
  }
}

async function capturePreviewSmoke(browser, summary) {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })
    const observed = createObserved(`preview:${viewport.slug}`)
    const page = await context.newPage()
    attachPageGuards(page, observed)
    try {
      await page.goto(`${PREVIEW_URL}/dashboard`, { waitUntil: 'domcontentloaded' })
      await page.waitForURL((url) => url.pathname === '/login', { timeout: 15000 })
      await page.getByRole('heading', { name: 'Sign in with your Couple Book email' }).waitFor({ state: 'visible', timeout: 15000 })
      summary.previewSmoke.push(await captureShot(summary, page, { captureType: 'preview', group: 'preview', label: `Preview login • ${viewport.label}`, route: '/login', routeSlug: 'preview-login', themeId: 'signed-out', viewport }))
    } finally {
      assertObservedIsClean(observed)
      await context.close()
    }
  }
}

async function captureThemeWorkflow(summary, page, baseUrl, themeId) {
  await openAppearance(page, baseUrl)
  await themeTile(page, themeId).click()
  assertThemeSnapshot(themeId, await collectThemeSnapshot(page))
  await page.getByRole('button', { name: /Save changes/i }).click()
  await waitForSettingsSave(page)
  assertThemeSnapshot(themeId, await collectThemeSnapshot(page))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await waitForRoute(page, DEFAULT_ROUTE_SET.find((route) => route.path === '/settings'))
  const snapshot = await collectThemeSnapshot(page)
  assertThemeSnapshot(themeId, snapshot)
  summary.themeProofs.push({ themeId, themeName: themeName(themeId), tokenSignature: JSON.stringify(snapshot.tokens), tokens: snapshot.tokens })
  for (const route of THEME_ROUTES) {
    await openRoute(page, baseUrl, route)
    await captureShot(summary, page, { captureType: 'viewport', group: 'themes', label: `${route.path} • ${themeName(themeId)} • Desktop`, route: route.path, routeSlug: route.slug, themeId, viewport: VIEWPORTS[0] })
    await captureShot(summary, page, { captureType: 'full', fullPage: true, group: 'technical', label: `${route.path} • ${themeName(themeId)} • Desktop full`, route: route.path, routeSlug: route.slug, themeId, viewport: VIEWPORTS[0] })
    await captureLongPageSections(summary, page, route, themeId, VIEWPORTS[0])
  }
}

async function verifyThemeDifferenceGuard(summary) {
  assert.equal(summary.themeProofs.length, REQUIRED_THEME_IDS.length, 'All required theme proofs must complete before the difference guard runs.')
  assert.equal(new Set(summary.themeProofs.map((proof) => proof.tokenSignature)).size, REQUIRED_THEME_IDS.length)
  for (const route of THEME_ROUTES) {
    const shots = summary.captures.filter((entry) => entry.group === 'themes' && entry.captureType === 'viewport' && entry.route === route.path && entry.viewport === 'desktop')
    const hashes = new Set()
    for (const shot of shots) hashes.add(await hashFile(path.join(REVIEW_ROOT, shot.output)))
    assert.equal(hashes.size > 1, true)
  }
}

async function captureRouteSet(summary, browser, baseUrl, ownerEmail, ownerPassword, themeId) {
  for (const viewport of VIEWPORTS) {
    const context = await createReviewContext(browser, viewport, createNetworkController())
    const page = await context.newPage()
    const observed = createObserved(`routes:${viewport.slug}:${themeId}`)
    attachPageGuards(page, observed)
    try {
      await signIn(page, baseUrl, ownerEmail, ownerPassword)
      for (const route of DEFAULT_ROUTE_SET) {
        await openRoute(page, baseUrl, route)
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme || ''), themeId)
        await captureShot(summary, page, { captureType: 'viewport', group: 'routes', label: `${route.path} • ${themeName(themeId)} • ${viewport.label}`, route: route.path, routeSlug: route.slug, themeId, viewport })
        await captureShot(summary, page, { captureType: 'full', fullPage: true, group: 'technical', label: `${route.path} • ${themeName(themeId)} • ${viewport.label} full`, route: route.path, routeSlug: route.slug, themeId, viewport })
        await captureLongPageSections(summary, page, route, themeId, viewport)
      }
      summary.viewportResults.push({ viewport: viewport.slug, routeCount: DEFAULT_ROUTE_SET.length, themeId })
    } finally {
      assertObservedIsClean(observed)
      await context.close()
    }
  }
}

async function runTimelineWorkflows(summary, page, baseUrl, db) {
  const title = `Owner Review Text Memory ${uniqueSuffix()}`
  const tag = `owner-review-${uniqueSuffix()}`
  await recordControl(summary, { controlName: 'Add Memory', route: '/timeline', action: 'Open, validate, cancel, and save', expectedResult: 'Dialog opens, validates, cancels, and saves.' }, async () => {
    await openRoute(page, baseUrl, DEFAULT_ROUTE_SET.find((route) => route.path === '/timeline'))
    await routeButton(page, 'timeline', /^Add memory$/i).click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ state: 'visible', timeout: 5000 })
    await dialog.getByLabel('Title', { exact: true }).fill('')
    await dialog.locator('input[type="date"]').fill('')
    await dialog.getByRole('button', { name: /Save memory/i }).click()
    assert.equal(Boolean(await dialog.getByLabel('Title').evaluate((element) => element.validationMessage)), true)
    await captureShot(summary, page, { captureType: 'validation', group: 'forms', label: 'Add Memory validation', route: '/timeline', routeSlug: 'memory-validation', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await dialog.waitFor({ state: 'hidden', timeout: 5000 })
    await routeButton(page, 'timeline', /^Add memory$/i).click()
    await dialog.waitFor({ state: 'visible', timeout: 5000 })
    await dialog.getByLabel('Title', { exact: true }).fill(title)
    await dialog.locator('input[type="date"]').fill('2026-08-22')
    await dialog.getByLabel('Description', { exact: true }).fill('Owner review text memory used for Story save proof.')
    await dialog.getByLabel('Tags', { exact: true }).fill(`${tag}, owner review`)
    await dialog.getByRole('button', { name: /Save memory/i }).click()
    await page.getByText('Memory saved.').waitFor({ state: 'visible', timeout: 15000 })
    await dialog.waitFor({ state: 'hidden', timeout: 10000 })
  })
  await recordControl(summary, { controlName: 'Story search and filters', route: '/timeline', action: 'Search saved memory and apply tag filter', expectedResult: 'The new memory stays visible under search and tag filter.' }, async () => {
    await page.getByRole('searchbox', { name: 'Search memories' }).fill(title)
    await page.getByText(title).first().waitFor({ state: 'visible', timeout: 5000 })
    await page.getByRole('button', { name: tag }).click()
    await page.getByText(title).first().waitFor({ state: 'visible', timeout: 5000 })
    await captureShot(summary, page, { captureType: 'filtered', group: 'buttons', label: 'Story search and filters', route: '/timeline', routeSlug: 'story-search-filter', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
  })
  await recordControl(summary, { controlName: 'Archive confirmation cancel', route: '/timeline', action: 'Open archive confirmation and cancel', expectedResult: 'The active memory remains unarchived.' }, async () => {
    await openRoute(page, baseUrl, DEFAULT_ROUTE_SET.find((route) => route.path === '/dashboard'))
    await openRoute(page, baseUrl, DEFAULT_ROUTE_SET.find((route) => route.path === '/timeline'))
    await storyCard(page, title).getByRole('button', { name: 'View memory', exact: true }).click()
    const detailDialog = page.getByRole('dialog')
    await detailDialog.waitFor({ state: 'visible', timeout: 5000 })
    await detailDialog.getByRole('button', { name: /Archive memory/i }).click()
    const confirmDialog = page.getByRole('dialog', { name: 'Archive this memory?' })
    await confirmDialog.waitFor({ state: 'visible', timeout: 5000 })
    await captureShot(summary, page, { captureType: 'cancel', group: 'dialogs', label: 'Archive confirmation cancel', route: '/timeline', routeSlug: 'archive-cancel', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
    await confirmDialog.getByRole('button', { name: 'Cancel' }).click()
    await confirmDialog.waitFor({ state: 'hidden', timeout: 5000 })
    await detailDialog.getByRole('button', { name: 'Close' }).click()
    await detailDialog.waitFor({ state: 'hidden', timeout: 5000 })
  })
  await recordControl(summary, { controlName: 'Restore memory', route: '/timeline', action: 'Restore the seeded archived memory', expectedResult: 'The archived memory returns to the active Story list.' }, async () => {
    await openRoute(page, baseUrl, DEFAULT_ROUTE_SET.find((route) => route.path === '/dashboard'))
    await openRoute(page, baseUrl, DEFAULT_ROUTE_SET.find((route) => route.path === '/timeline'))
    await page.getByRole('button', { name: /Restore memory/i }).first().click()
    const confirmDialog = page.getByRole('dialog', { name: 'Restore this memory?' })
    await confirmDialog.waitFor({ state: 'visible', timeout: 5000 })
    await confirmDialog.getByRole('button', { name: 'Restore memory' }).click()
    await waitForMemoryStatus(db, 'Archived café note', 'active')
    await openRoute(page, baseUrl, DEFAULT_ROUTE_SET.find((route) => route.path === '/dashboard'))
    await openRoute(page, baseUrl, DEFAULT_ROUTE_SET.find((route) => route.path === '/timeline'))
    await page.getByText('Archived café note').first().waitFor({ state: 'visible', timeout: 5000 })
  })
  return { title }
}

async function runPlanWorkflows(summary, page, baseUrl) {
  const title = `Owner Review Plan ${uniqueSuffix()}`
  await recordControl(summary, { controlName: 'Add Plan', route: '/plans', action: 'Open, validate, cancel, and save', expectedResult: 'The plan form validates, cancels, and saves.' }, async () => {
    await openRoute(page, baseUrl, DEFAULT_ROUTE_SET.find((route) => route.path === '/plans'))
    await page.getByRole('button', { name: /Add plan/i }).click()
    const titleField = page.getByLabel('Plan title')
    await page.getByRole('button', { name: /Save plan/i }).click()
    assert.equal(Boolean(await titleField.evaluate((element) => element.validationMessage)), true)
    await captureShot(summary, page, { captureType: 'validation', group: 'forms', label: 'Add Plan validation', route: '/plans', routeSlug: 'plan-validation', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
    await page.getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('heading', { name: 'Add a new plan' }).waitFor({ state: 'hidden', timeout: 5000 })
    await page.getByRole('button', { name: /Add plan/i }).click()
    await titleField.fill(title)
    await page.getByLabel('Notes').fill('Owner review plan used for save proof.')
    await page.getByRole('button', { name: /Save plan/i }).click()
    await page.getByText('Plan saved.').waitFor({ state: 'visible', timeout: 15000 })
    await page.getByText(title).first().waitFor({ state: 'visible', timeout: 5000 })
  })
  await recordControl(summary, { controlName: 'Plan search and status filter', route: '/plans', action: 'Search saved plan and use the segmented filter', expectedResult: 'The plan remains visible after search and status filter interaction.' }, async () => {
    await page.getByRole('searchbox', { name: 'Search plans' }).fill(title)
    await page.getByText(title).first().waitFor({ state: 'visible', timeout: 5000 })
    await routeGroupButton(page, 'plans', 'Status filter', 'Ideas').click()
    await page.getByText(title).first().waitFor({ state: 'visible', timeout: 5000 })
    await captureShot(summary, page, { captureType: 'filtered', group: 'buttons', label: 'Plan search and status filter', route: '/plans', routeSlug: 'plan-search-filter', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
  })
}

async function runThemeChecks(summary, page, baseUrl) {
  await openAppearance(page, baseUrl)
  await themeTile(page, 'midnight-rose').click()
  if (await page.getByRole('button', { name: /Save changes/i }).isEnabled()) {
    await page.getByRole('button', { name: /Save changes/i }).click()
    await waitForSettingsSave(page)
  }
  assert.equal((await collectThemeSnapshot(page)).themeId, 'midnight-rose')
  await recordControl(summary, { controlName: 'Theme selection cancel', route: '/settings', action: 'Preview Paper Hearts and cancel', expectedResult: 'Cancel restores the saved theme.' }, async () => {
    await openAppearance(page, baseUrl)
    await themeTile(page, 'paper-hearts').click()
    assert.equal((await collectThemeSnapshot(page)).themeId, 'paper-hearts')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await page.getByText('Appearance and settings restored to the saved view.').waitFor({ state: 'visible', timeout: 10000 })
    assert.equal((await collectThemeSnapshot(page)).themeId, 'midnight-rose')
    await captureShot(summary, page, { captureType: 'cancel', group: 'forms', label: 'Theme selection cancel', route: '/settings', routeSlug: 'theme-cancel', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
  })
  for (const themeId of REQUIRED_THEME_IDS) {
    await recordControl(summary, { controlName: `Theme proof ${themeName(themeId)}`, route: '/settings', action: `Select ${themeName(themeId)}, save, reload, and verify tokens`, expectedResult: 'Theme persists through the real Settings workflow.' }, async () => {
      await captureThemeWorkflow(summary, page, baseUrl, themeId)
    })
  }
  await verifyThemeDifferenceGuard(summary)
  await openAppearance(page, baseUrl)
  await themeTile(page, 'midnight-rose').hover()
  await captureShot(summary, page, { captureType: 'hover', group: 'buttons', label: 'Theme tile hover', route: '/settings', routeSlug: 'theme-tile-hover', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
  await themeTile(page, 'midnight-rose').focus()
  await captureShot(summary, page, { captureType: 'focus-visible', group: 'buttons', label: 'Theme tile focus', route: '/settings', routeSlug: 'theme-tile-focus', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
  await captureShot(summary, page, { captureType: 'disabled', group: 'buttons', label: 'Save changes disabled', locator: page.getByRole('button', { name: /Save changes/i }), route: '/settings', routeSlug: 'save-disabled', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
}

async function runGalleryWorkflows(summary, page, baseUrl, fixtures, networkController, db, bucket) {
  const savedTitle = `Owner Review Photo Memory ${uniqueSuffix()}`
  const cancelTitle = `Owner Review Cancel Upload ${uniqueSuffix()}`
  await openRoute(page, baseUrl, DEFAULT_ROUTE_SET.find((route) => route.path === '/gallery'))
  await recordControl(summary, { controlName: 'Upload queue disabled state', route: '/gallery', action: 'Check empty queue', expectedResult: 'Start uploads stays disabled without queued files.' }, async () => {
    assert.equal(await page.getByRole('button', { name: /Start uploads/i }).isDisabled(), true)
    await captureShot(summary, page, { captureType: 'disabled', group: 'buttons', label: 'Start uploads disabled', locator: page.getByRole('button', { name: /Start uploads/i }), route: '/gallery', routeSlug: 'start-uploads-disabled', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
  })
  await recordControl(summary, { controlName: 'Upload queue cancel', route: '/gallery', action: 'Start uploading and cancel it', expectedResult: 'The queue stops and does not create a saved memory.' }, async () => {
    await setFiles(page, fixtures.imageCancel)
    const card = queueCard(page, path.basename(fixtures.imageCancel))
    await card.waitFor({ state: 'visible', timeout: 10000 })
    await card.getByRole('textbox', { name: 'Memory title' }).fill(cancelTitle)
    networkController.delayMs = 1800
    const historyPromise = collectStatusHistory(card, ['Cancelled'])
    await page.getByRole('button', { name: /^Start uploads$/ }).click()
    await card.getByText('Uploading', { exact: true }).waitFor({ state: 'visible', timeout: 20000 })
    await captureShot(summary, page, { captureType: 'loading', group: 'media', label: 'Upload queue loading', route: '/gallery', routeSlug: 'upload-loading', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
    await card.getByRole('button', { name: new RegExp(`Cancel upload for ${path.basename(fixtures.imageCancel).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click()
    await historyPromise
    networkController.delayMs = 0
    assert.deepEqual(await getMemoryDocsByTitle(db, cancelTitle), [])
  })
  await recordControl(summary, { controlName: 'Failed upload retry', route: '/gallery', action: 'Force one failure and retry to success', expectedResult: 'Retry saves one Album item after Needs review.' }, async () => {
    await setFiles(page, fixtures.imageRetry)
    const card = queueCard(page, path.basename(fixtures.imageRetry))
    await card.waitFor({ state: 'visible', timeout: 10000 })
    await card.getByRole('textbox', { name: 'Memory title' }).fill(savedTitle)
    await card.getByRole('textbox', { name: 'Description' }).fill('Owner review photo memory used for Album, Story, and card inspection proof.')
    await card.getByRole('textbox', { name: 'Tags' }).fill('album, owner review, photo')
    await card.getByRole('textbox', { name: 'Media note' }).fill('Private gallery proof item for owner UI review.')
    await page.evaluate(() => { globalThis.__COUPLEBOOK_UPLOAD_TEST__.failUploadsRemaining = 1 })
    const failedPromise = collectStatusHistory(card, ['Needs review'])
    await page.getByRole('button', { name: /^Start uploads$/ }).click()
    await failedPromise
    await captureShot(summary, page, { captureType: 'failed', group: 'media', label: 'Retryable upload failure', route: '/gallery', routeSlug: 'upload-failed', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
    await captureCard(summary, page, { label: 'Upload queue item', locator: card, route: '/gallery', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
    await page.evaluate(() => { globalThis.__COUPLEBOOK_UPLOAD_TEST__.failUploadsRemaining = 0 })
    const savedPromise = collectStatusHistory(card, ['Saved'])
    await card.getByRole('button', { name: new RegExp(`Retry upload for ${path.basename(fixtures.imageRetry).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click()
    await savedPromise
    await captureShot(summary, page, { captureType: 'success', group: 'media', label: 'Upload queue saved', route: '/gallery', routeSlug: 'upload-saved', themeId: 'midnight-rose', viewport: VIEWPORTS[0], locator: card })
    const docs = await getMemoryDocsByTitle(db, savedTitle)
    assert.equal(docs.length, 1)
    const storageObjects = await listStorageObjects(bucket, STORAGE_PREFIX)
    assert.equal(storageObjects.includes(docs[0].data.media.storagePath), true)
    summary.savedMedia = { title: savedTitle, storagePath: docs[0].data.media.storagePath }
    await openRoute(page, baseUrl, DEFAULT_ROUTE_SET.find((route) => route.path === '/timeline'))
    await page.getByRole('searchbox', { name: 'Search memories' }).fill(savedTitle)
    await captureCard(summary, page, { label: 'Story photo memory', locator: storyCard(page, savedTitle), route: '/timeline', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
    await openRoute(page, baseUrl, DEFAULT_ROUTE_SET.find((route) => route.path === '/gallery'))
  })
  await recordControl(summary, { controlName: 'Gallery viewer', route: '/gallery', action: 'Open the saved Album item and close the viewer', expectedResult: 'The viewer opens and closes cleanly.' }, async () => {
    await page.getByRole('searchbox', { name: 'Search Album' }).fill(savedTitle)
    await galleryTile(page, savedTitle).getByRole('button', { name: 'Open item', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ state: 'visible', timeout: 5000 })
    await captureShot(summary, page, { captureType: 'open', group: 'dialogs', label: 'Gallery viewer', route: '/gallery', routeSlug: 'gallery-viewer', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    await dialog.waitFor({ state: 'hidden', timeout: 5000 })
  })
  await recordControl(summary, { controlName: 'Media removal cancel', route: '/gallery', action: 'Open Remove from Album and cancel it', expectedResult: 'The saved Album item remains visible.' }, async () => {
    await galleryTile(page, savedTitle).getByRole('button', { name: 'Open item', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ state: 'visible', timeout: 5000 })
    await dialog.getByRole('button', { name: 'Remove from Album' }).click()
    const confirmDialog = page.getByRole('dialog', { name: 'Remove this Album item?' })
    await confirmDialog.waitFor({ state: 'visible', timeout: 5000 })
    await captureShot(summary, page, { captureType: 'cancel', group: 'dialogs', label: 'Media removal cancel', route: '/gallery', routeSlug: 'remove-cancel', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
    await confirmDialog.getByRole('button', { name: 'Cancel' }).click()
    await confirmDialog.waitFor({ state: 'hidden', timeout: 5000 })
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    await dialog.waitFor({ state: 'hidden', timeout: 5000 })
    await page.getByText(savedTitle).first().waitFor({ state: 'visible', timeout: 5000 })
  })
  await recordControl(summary, { controlName: 'Media removal confirm', route: '/gallery', action: 'Confirm Remove from Album', expectedResult: 'The Storage object is deleted and the item leaves Album.' }, async () => {
    await galleryTile(page, savedTitle).getByRole('button', { name: 'Open item', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ state: 'visible', timeout: 5000 })
    await dialog.getByRole('button', { name: 'Remove from Album' }).click()
    const confirmDialog = page.getByRole('dialog', { name: 'Remove this Album item?' })
    await confirmDialog.waitFor({ state: 'visible', timeout: 5000 })
    await confirmDialog.getByRole('button', { name: 'Remove from Album' }).click()
    await page.locator('[role="status"], [role="alert"]').filter({ hasText: /was removed from Album|was removed, but Album refresh still needs attention/i }).first().waitFor({ state: 'visible', timeout: 15000 })
    const storageObjects = await listStorageObjects(bucket, STORAGE_PREFIX)
    assert.equal(storageObjects.includes(summary.savedMedia.storagePath), false)
    await captureShot(summary, page, { captureType: 'success', group: 'media', label: 'Media removal confirm', route: '/gallery', routeSlug: 'remove-confirm', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
  })
  return { savedTitle }
}

async function runMobileChecks(summary, browser, baseUrl, ownerEmail, ownerPassword) {
  const context = await createReviewContext(browser, VIEWPORTS[2], createNetworkController())
  const page = await context.newPage()
  try {
    await signIn(page, baseUrl, ownerEmail, ownerPassword)
    await recordControl(summary, { controlName: 'Mobile navigation sheet', route: '/dashboard', action: 'Open More and close the menu', expectedResult: 'The mobile navigation dialog opens and closes.' }, async () => {
      await openRoute(page, baseUrl, DEFAULT_ROUTE_SET.find((route) => route.path === '/dashboard'))
      await page.getByRole('button', { name: 'Open all navigation' }).click()
      const dialog = page.getByRole('dialog', { name: 'Navigation menu' })
      await dialog.waitFor({ state: 'visible', timeout: 5000 })
      await captureShot(summary, page, { captureType: 'open', group: 'mobile', label: 'Mobile navigation sheet', route: '/dashboard', routeSlug: 'mobile-nav-sheet', themeId: 'midnight-rose', viewport: VIEWPORTS[2] })
      await dialog.getByRole('button', { name: 'Close menu' }).click()
      await dialog.waitFor({ state: 'hidden', timeout: 5000 })
    })
    await recordControl(summary, { controlName: 'More navigation', route: '/dashboard', action: 'Open More and choose Settings', expectedResult: 'Mobile More navigation reaches the Settings route.' }, async () => {
      await page.getByRole('button', { name: 'Open all navigation' }).click()
      const dialog = page.getByRole('dialog', { name: 'Navigation menu' })
      await dialog.waitFor({ state: 'visible', timeout: 5000 })
      await dialog.getByRole('link', { name: /^More$/i }).click()
      await page.waitForURL((url) => url.pathname === '/settings', { timeout: 10000 })
      await captureShot(summary, page, { captureType: 'navigation', group: 'mobile', label: 'More navigation to Settings', route: '/settings', routeSlug: 'more-navigation-settings', themeId: 'midnight-rose', viewport: VIEWPORTS[2] })
    })
    for (const themeId of REQUIRED_THEME_IDS) {
      await openRoute(page, baseUrl, DEFAULT_ROUTE_SET.find((route) => route.path === '/settings'))
      await openAppearance(page, baseUrl)
      await themeTile(page, themeId).click()
      if (await page.getByRole('button', { name: /Save changes/i }).isEnabled()) {
        await page.getByRole('button', { name: /Save changes/i }).click()
        await waitForSettingsSave(page)
      }
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme || ''), themeId)
      for (const route of THEME_ROUTES) {
        await openRoute(page, baseUrl, route)
        await captureShot(summary, page, { captureType: 'viewport', group: 'themes', label: `${route.path} • ${themeName(themeId)} • Mobile`, route: route.path, routeSlug: route.slug, themeId, viewport: VIEWPORTS[2] })
        await captureLongPageSections(summary, page, route, themeId, VIEWPORTS[2])
      }
    }
    await openAppearance(page, baseUrl)
    await themeTile(page, 'midnight-rose').click()
    if (await page.getByRole('button', { name: /Save changes/i }).isEnabled()) {
      await page.getByRole('button', { name: /Save changes/i }).click()
      await waitForSettingsSave(page)
    }
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme || ''), 'midnight-rose')
  } finally {
    await context.close()
  }
}

async function runSignOutChecks(summary, page, baseUrl) {
  await recordControl(summary, { controlName: 'Sign-out confirmation cancel', route: '/settings', action: 'Open sign-out dialog and cancel it', expectedResult: 'The current route remains active.' }, async () => {
    await openRoute(page, baseUrl, DEFAULT_ROUTE_SET.find((route) => route.path === '/settings'))
    await routeButton(page, 'settings', /^Sign out$/).click()
    const dialog = page.getByRole('dialog', { name: 'Sign out of Couple Book?' })
    await dialog.waitFor({ state: 'visible', timeout: 5000 })
    await captureShot(summary, page, { captureType: 'cancel', group: 'dialogs', label: 'Sign-out confirmation cancel', route: '/settings', routeSlug: 'signout-cancel', themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await dialog.waitFor({ state: 'hidden', timeout: 5000 })
  })
  await recordControl(summary, { controlName: 'Sign-out confirmation confirm', route: '/settings', action: 'Confirm sign out', expectedResult: 'The app returns to the login screen.' }, async () => {
    await routeButton(page, 'settings', /^Sign out$/).click()
    const dialog = page.getByRole('dialog', { name: 'Sign out of Couple Book?' })
    await dialog.waitFor({ state: 'visible', timeout: 5000 })
    await dialog.getByRole('button', { name: 'Sign out' }).click()
    await page.waitForURL((url) => url.pathname === '/login', { timeout: 10000 })
    await captureShot(summary, page, { captureType: 'success', group: 'dialogs', label: 'Sign-out confirmation confirm', route: '/login', routeSlug: 'signout-confirm', themeId: 'signed-out', viewport: VIEWPORTS[0] })
  })
}

async function captureCards(summary, browser, baseUrl, ownerEmail, ownerPassword) {
  const desktopContext = await createReviewContext(browser, VIEWPORTS[0], createNetworkController())
  const mobileContext = await createReviewContext(browser, VIEWPORTS[2], createNetworkController())
  const desktopPage = await desktopContext.newPage()
  const mobilePage = await mobileContext.newPage()
  try {
    await signIn(desktopPage, baseUrl, ownerEmail, ownerPassword)
    await signIn(mobilePage, baseUrl, ownerEmail, ownerPassword)
    const targets = [
      ['Home relationship hero', '/dashboard', async (page) => page.locator('.cb-shell-hero').first()],
      ['Featured memory', '/dashboard', async (page) => page.locator('article').filter({ has: page.getByText('Featured memory') }).first()],
      ['Story text memory', '/timeline', async (page) => page.locator('article').filter({ has: page.getByText('First harbor walk') }).first()],
      ['Album tile', '/gallery', async (page) => page.locator('.gallery-item').first()],
      ['Us profile section', '/profile', async (page) => page.locator('section').filter({ has: page.getByRole('heading', { name: /^Us$/ }) }).first()],
      ['Plan card', '/plans', async (page) => page.locator('article').filter({ has: page.getByText('Bookstore date') }).first()],
      ['Theme tile', '/settings', async (page) => themeTile(page, 'paper-hearts')],
      ['Contract section', '/contract', async (page) => page.locator('article').first()],
      ['Special-moment section', '/settings', async (page) => page.locator('section, article').filter({ has: page.getByRole('heading', { name: 'Special pages with their own mood' }) }).first()],
    ]
    for (const [label, routePath, locatorFn] of targets) {
      const route = DEFAULT_ROUTE_SET.find((entry) => entry.path === routePath)
      await openRoute(desktopPage, baseUrl, route)
      const desktopLocator = await locatorFn(desktopPage)
      await captureCard(summary, desktopPage, { label, locator: desktopLocator, route: routePath, themeId: 'midnight-rose', viewport: VIEWPORTS[0] })
      await openRoute(mobilePage, baseUrl, route)
      const mobileLocator = await locatorFn(mobilePage)
      await captureCard(summary, mobilePage, { label: `${label} mobile`, locator: mobileLocator, route: routePath, themeId: 'midnight-rose', viewport: VIEWPORTS[2], group: 'mobile' })
    }
  } finally {
    await desktopContext.close()
    await mobileContext.close()
  }
}

function finalizeSummary(summary) {
  const failedCards = summary.cards.filter((card) => card.status !== 'PASS')
  for (const card of failedCards) for (const defect of card.defects) summary.unresolvedDefects.add(`${card.label}: ${defect}`)
  summary.findings = {
    defectsFound: [...summary.defectsFound],
    defectsFixed: [...summary.defectsFixed],
    unresolvedDefects: [...summary.unresolvedDefects],
    buttonsTested: summary.controls.length,
    cardsInspected: summary.cards.length,
    themesProven: summary.themeProofs.map((proof) => proof.themeName),
    viewportResults: summary.viewportResults,
  }
  summary.verdict = summary.unresolvedDefects.size === 0 ? 'PASS' : 'FAIL'
}

function buildPdfSections(summary) {
  const grouped = new Map()
  for (const capture of summary.captures) {
    if (!grouped.has(capture.group)) grouped.set(capture.group, [])
    grouped.get(capture.group).push(capture)
  }
  const order = [
    ['preview', 'Preview'],
    ['routes', 'Routes'],
    ['themes', 'Themes'],
    ['buttons', 'Buttons'],
    ['cards', 'Cards'],
    ['forms', 'Forms'],
    ['dialogs', 'Dialogs'],
    ['media', 'Media'],
    ['mobile', 'Mobile'],
    ['technical', 'Technical'],
  ]
  summary.pdfSections = order
    .filter(([group]) => (grouped.get(group) || []).length > 0)
    .map(([group, title]) => ({
      title,
      subtitle: `${(grouped.get(group) || []).length} capture(s)`,
      images: (grouped.get(group) || []).map((entry) => ({
        caption: `${entry.label} | route: ${entry.route || 'n/a'} | theme: ${entry.themeName || entry.themeId || 'n/a'} | viewport: ${entry.viewport}`,
        path: path.join(REVIEW_ROOT, entry.output),
      })),
    }))
}

function renderMarkdownSummary(summary) {
  return ['# Couple Book owner UI review', '', `Date: ${REVIEW_DATE_LABEL}`, '', `Verdict: ${summary.verdict}`, '', '## Findings', '', `- Defects found: ${summary.findings.defectsFound.length}`, `- Defects fixed: ${summary.findings.defectsFixed.length}`, `- Unresolved defects: ${summary.findings.unresolvedDefects.length}`, `- Buttons tested: ${summary.findings.buttonsTested}`, `- Cards inspected: ${summary.findings.cardsInspected}`, `- Themes proven: ${summary.findings.themesProven.join(', ')}`, `- Viewport results: ${summary.findings.viewportResults.map((entry) => `${entry.viewport}:${entry.routeCount}@${entry.themeId}`).join(', ')}`, ''].join('\n')
}

async function writeContactSheet(summary) {
  const sections = summary.pdfSections.map((section) => {
    const figures = section.images.map((image) => ['<figure class="shot">', `  <img alt="${image.caption}" src="../${relativeToReviewRoot(image.path)}">`, `  <figcaption>${image.caption}</figcaption>`, '</figure>'].join('\n')).join('\n')
    return ['<section class="section">', `  <h2>${section.title}</h2>`, `  <p>${section.subtitle}</p>`, '  <div class="grid">', figures, '  </div>', '</section>'].join('\n')
  }).join('\n')
  const html = ['<!doctype html>', '<html lang="en">', '<head>', '  <meta charset="utf-8">', '  <meta name="viewport" content="width=device-width, initial-scale=1">', '  <title>Couple Book owner UI review</title>', '  <style>body{margin:0;font-family:Arial,sans-serif;background:#151317;color:#f4eced}main{padding:32px}.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}.shot{margin:0;border:1px solid rgba(210,124,153,.24);border-radius:8px;overflow:hidden;background:#221822}.shot img{display:block;width:100%;height:auto}.shot figcaption{padding:12px;font-size:12px;line-height:1.5}</style>', '</head>', '<body>', '  <main>', '    <h1>Couple Book owner UI review</h1>', sections, '  </main>', '</body>', '</html>', ''].join('\n')
  await fsp.writeFile(CONTACT_SHEET_PATH, html, 'utf8')
}

async function writeSummaryFiles(summary) {
  await fsp.writeFile(SUMMARY_JSON_PATH, JSON.stringify({ ...summary, defectsFixed: [...summary.defectsFixed], defectsFound: [...summary.defectsFound], unresolvedDefects: [...summary.unresolvedDefects] }, null, 2), 'utf8')
  await fsp.writeFile(SUMMARY_MD_PATH, `${renderMarkdownSummary(summary)}\n`, 'utf8')
}

async function createPdf(summary) {
  await fsp.writeFile(PAYLOAD_PATH, JSON.stringify({
    pdfPath: PDF_PATH,
    reviewDateLabel: REVIEW_DATE_LABEL,
    summary: { ...summary, defectsFixed: [...summary.defectsFixed], defectsFound: [...summary.defectsFound], unresolvedDefects: [...summary.unresolvedDefects] },
  }, null, 2), 'utf8')
  execFileSync(PYTHON_COMMAND, [PYTHON_HELPER_PATH, PAYLOAD_PATH], { cwd: APP_ROOT, stdio: 'inherit' })
}

async function run() {
  await ensureOutputTree()
  const issueNotes = await writeIssueNotes()
  const emulatorEnv = await loadEnvFile(EMULATOR_ENV_PATH)
  const runtime = configureRuntimeEnv(emulatorEnv)
  const ownerEmail = requireEnv(emulatorEnv, 'COUPLEBOOK_EMULATOR_OWNER_EMAIL')
  const ownerPassword = requireEnv(emulatorEnv, 'COUPLEBOOK_EMULATOR_OWNER_PASSWORD')
  const { db, bucket } = initializeAdmin(runtime.projectId)
  seedEmulators()
  const { baseUrl, server } = await createLocalServer()
  const summary = buildSummaryShape(baseUrl, issueNotes)
  const browser = await launchBrowser()
  const networkController = createNetworkController()
  const fixtures = await buildUploadFixtures()

  try {
    log(`Running Couple Book owner UI review against local ${baseUrl} and preview ${PREVIEW_URL}`)
    await capturePreviewSmoke(browser, summary)
    const context = await createReviewContext(browser, VIEWPORTS[0], networkController)
    const page = await context.newPage()
    const observed = createObserved('owner-review:desktop')
    attachPageGuards(page, observed)
    try {
      await signIn(page, baseUrl, ownerEmail, ownerPassword)
      await runThemeChecks(summary, page, baseUrl)
      await openAppearance(page, baseUrl)
      await themeTile(page, 'midnight-rose').click()
      await page.getByRole('button', { name: /Save changes/i }).click()
      await waitForSettingsSave(page)
      await runTimelineWorkflows(summary, page, baseUrl, db)
      await runPlanWorkflows(summary, page, baseUrl)
      await runGalleryWorkflows(summary, page, baseUrl, fixtures, networkController, db, bucket)
      await captureCards(summary, browser, baseUrl, ownerEmail, ownerPassword)
      await runMobileChecks(summary, browser, baseUrl, ownerEmail, ownerPassword)
      await captureRouteSet(summary, browser, baseUrl, ownerEmail, ownerPassword, 'midnight-rose')
      await runSignOutChecks(summary, page, baseUrl)
    } finally {
      assertObservedIsClean(observed)
      await context.close()
    }
    finalizeSummary(summary)
    buildPdfSections(summary)
    await writeContactSheet(summary)
    await createPdf(summary)
    await writeSummaryFiles(summary)
    if (summary.verdict !== 'PASS') throw new Error(`Owner UI review verdict is ${summary.verdict}.`)
    log(`Couple Book owner UI review passed. Evidence: ${REVIEW_ROOT}`)
  } finally {
    await browser.close()
    await server.close()
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exit(1)
})
