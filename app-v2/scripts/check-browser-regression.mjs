/* global URL, document, setTimeout, window */

import assert from 'node:assert/strict'
import http from 'node:http'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer as createViteServer } from 'vite'
import {
  browserRegressionAuthorizedFixture,
  browserRegressionSignedOutFixture,
  browserRegressionUnavailableTimelineFixture,
} from '../src/test-fixtures/browser-regression.fixture.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const APP_ROOT = path.resolve(__dirname, '..')
const DEFAULT_PORT = 4173
let baseUrl = process.env.COUPLEBOOK_APP_V2_BROWSER_BASE_URL || `http://127.0.0.1:${DEFAULT_PORT}`
const SPOOFED_SESSION = Object.freeze({
  memorybook_active_session: 'spoofed-reader',
  memorybook_active_user: 'spoofed-reader',
  memorybook_active_uid: 'spoofed-reader-only',
})
const SIGNED_OUT_ROUTES = ['/dashboard', '/timeline', '/gallery', '/contract', '/birthday', '/valentine', '/confession']
const SPOOFED_STORAGE_ROUTES = ['/dashboard', '/timeline', '/gallery', '/contract', '/birthday', '/valentine', '/confession']
const FORBIDDEN_CONTRACT_TEXT = /data:image|base64|strokeData|Sign & Open Vault/i

function log(message) {
  process.stdout.write(`${message}\n`)
}

function getBaseUrl() {
  return baseUrl
}

function isLocalAppRequest(url) {
  return url.startsWith(getBaseUrl())
}

function isBroadUsersAccess(text) {
  return /collectionId.?users/i.test(text) || /documents\/users(?:[/?#]|\b)/i.test(text)
}

function isTargetedUserPath(text) {
  return /documents\/users\/[A-Za-z0-9_-]+/i.test(text)
}

function isStaticRollbackDependency(url) {
  return /\/pages\/.*\.html\b|\/js\/settings\.js\b|\/core\/firestoreSync\.js\b/i.test(url)
}

function isPrivateMediaRequest(url) {
  return /\/assets\/photos\/|\/assets\/videos\/|\/OUR%20MEMORIES\/|\/OUR MEMORIES\//i.test(url)
}

function createObserved(name) {
  return {
    name,
    consoleErrors: [],
    pageErrors: [],
    responseErrors: [],
    unexpectedWrites: [],
    broadUsersAccess: [],
    staticDependencies: [],
    privateMedia: [],
  }
}

function recordNetworkRequest(request, observed) {
  const url = request.url()
  const method = request.method()
  const payload = request.postData() || ''
  const haystack = `${url}\n${payload}`

  if (!isLocalAppRequest(url) && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    observed.unexpectedWrites.push(`${method} ${url}`)
  }

  if (isBroadUsersAccess(haystack) && !isTargetedUserPath(haystack)) {
    observed.broadUsersAccess.push(url)
  }

  if (isStaticRollbackDependency(url)) {
    observed.staticDependencies.push(url)
  }

  if (isPrivateMediaRequest(url)) {
    observed.privateMedia.push(url)
  }
}

function attachPageGuards(page, observed) {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      observed.consoleErrors.push(message.text())
    }
  })

  page.on('pageerror', (error) => {
    observed.pageErrors.push(error.message)
  })

  page.on('request', (request) => {
    recordNetworkRequest(request, observed)
  })

  page.on('response', (response) => {
    const status = response.status()
    if (status >= 400) {
      observed.responseErrors.push(`${status} ${response.url()}`)
    }
  })
}

function ensureObservedIsClean(observed) {
  assert.deepEqual(observed.consoleErrors, [], `${observed.name} logged a browser console error.`)
  assert.deepEqual(observed.pageErrors, [], `${observed.name} raised an uncaught page error.`)
  assert.deepEqual(observed.responseErrors, [], `${observed.name} hit an HTTP failure response.`)
  assert.deepEqual(observed.unexpectedWrites, [], `${observed.name} made an unexpected non-GET external request.`)
  assert.deepEqual(observed.broadUsersAccess, [], `${observed.name} attempted a broad users lookup.`)
  assert.deepEqual(observed.staticDependencies, [], `${observed.name} requested a static rollback dependency.`)
  assert.deepEqual(observed.privateMedia, [], `${observed.name} requested a private media path.`)
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => {
        body += chunk
      })
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode || 0,
          body,
        })
      })
    })

    request.on('error', reject)
    request.setTimeout(5000, () => {
      request.destroy(new Error(`Timeout requesting ${url}`))
    })
  })
}

async function isExpectedServerReady() {
  try {
    const response = await httpGet(getBaseUrl())
    return response.statusCode === 200 && /@vite\/client|src="\/src\/main\.jsx"/.test(response.body)
  } catch {
    return false
  }
}

async function waitForServer(timeoutMs = 15000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (await isExpectedServerReady()) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  return false
}

async function canUsePort(port) {
  return new Promise((resolve) => {
    const server = net.createServer()

    server.once('error', () => {
      resolve(false)
    })

    server.once('listening', () => {
      server.close(() => resolve(true))
    })

    server.listen(port, '127.0.0.1')
  })
}

async function findAvailablePort(startPort = DEFAULT_PORT, attempts = 20) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = startPort + offset
    if (await canUsePort(port)) {
      return port
    }
  }

  throw new Error(`Unable to find an open local port starting at ${startPort}.`)
}

async function withAppServer(callback) {
  if (await isExpectedServerReady()) {
    log(`Using existing app-v2 server on ${getBaseUrl()}`)
    return callback()
  }

  const serverPort = await findAvailablePort()
  baseUrl = `http://127.0.0.1:${serverPort}`
  const server = await createViteServer({
    root: APP_ROOT,
    server: {
      host: '127.0.0.1',
      port: serverPort,
      strictPort: true,
    },
  })
  await server.listen()

  try {
    const ready = await waitForServer()
    assert.equal(ready, true, `app-v2 dev server did not become ready on ${getBaseUrl()}.`)
    return await callback()
  } finally {
    await server.close()
  }
}

function buildInitScript() {
  return ({ injectedBrowserTestMode, injectedSpoofedSession }) => {
    if (injectedBrowserTestMode) {
      window.__COUPLEBOOK_BROWSER_TEST__ = injectedBrowserTestMode
    }

    if (!injectedSpoofedSession) {
      return
    }

    window.localStorage.clear()
    for (const [key, value] of Object.entries(injectedSpoofedSession)) {
      window.localStorage.setItem(key, value)
    }
  }
}

async function createGuardedPage(browser, name, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1440, height: 1024 },
  })
  const observed = createObserved(name)
  const initScript = buildInitScript()

  await context.addInitScript(initScript, {
    injectedBrowserTestMode: options.browserTestMode,
    injectedSpoofedSession: options.spoofedSession,
  })

  const page = await context.newPage()
  attachPageGuards(page, observed)

  return { context, observed, page }
}

async function waitForRouteContent(page, pathname, heading) {
  await page.waitForURL((url) => url.pathname === pathname, { timeout: 5000 })
  await page.getByRole('heading', { name: heading }).first().waitFor({ state: 'visible', timeout: 5000 })
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText || ''
      return !text.includes('Restoring your private route') && !text.includes('Restoring Couple Book')
    },
    { timeout: 5000 },
  )
}

async function expectRedirectToLogin(page, expectedFromPath) {
  await page.waitForURL((url) => url.pathname === '/login', { timeout: 5000, waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Sign in with your Couple Book email' }).waitFor({ state: 'visible', timeout: 5000 })

  const historyState = await page.evaluate(() => window.history.state?.usr?.from?.pathname || '')
  assert.equal(historyState, expectedFromPath, `Expected login redirect to preserve return path for ${expectedFromPath}.`)
}

async function runSignedOutCoverage(browser) {
  for (const route of SIGNED_OUT_ROUTES) {
    const { context, observed, page } = await createGuardedPage(browser, `signed-out:${route}`, {
      browserTestMode: browserRegressionSignedOutFixture,
    })

    try {
      await page.goto(`${getBaseUrl()}${route}`, { waitUntil: 'domcontentloaded' })
      await expectRedirectToLogin(page, route)
    } finally {
      ensureObservedIsClean(observed)
      await context.close()
    }
  }
}

async function runSpoofedStorageCoverage(browser) {
  for (const route of SPOOFED_STORAGE_ROUTES) {
    const { context, observed, page } = await createGuardedPage(browser, `signed-out-spoofed:${route}`, {
      browserTestMode: browserRegressionSignedOutFixture,
      spoofedSession: SPOOFED_SESSION,
    })

    try {
      await page.goto(`${getBaseUrl()}${route}`, { waitUntil: 'domcontentloaded' })
      await expectRedirectToLogin(page, route)
    } finally {
      ensureObservedIsClean(observed)
      await context.close()
    }
  }
}

async function runAuthenticatedDesktopCoverage(browser) {
  const { context, observed, page } = await createGuardedPage(browser, 'authorized-desktop', {
    browserTestMode: browserRegressionAuthorizedFixture,
    viewport: { width: 1440, height: 1024 },
  })

  try {
    await page.goto(`${getBaseUrl()}/settings`, { waitUntil: 'domcontentloaded' })
    await waitForRouteContent(page, '/settings', 'Application Settings')

    assert.equal(await page.locator('.app-shell').count(), 1, 'Authorized Settings should render inside AppShell.')
    assert.equal(await page.getByText('Approved Reader').count() > 0, true, 'Authorized fixture identity should render.')

    const desktopPrimaryPaths = await page.locator('nav[aria-label="Main navigation"] a').evaluateAll((elements) => {
      return elements.map((element) => new URL(element.href).pathname)
    })
    assert.deepEqual(desktopPrimaryPaths, ['/dashboard', '/timeline', '/gallery', '/profile', '/favorites', '/settings'])

    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForRouteContent(page, '/settings', 'Application Settings')

    await page.goto(`${getBaseUrl()}/dashboard`, { waitUntil: 'domcontentloaded' })
    await waitForRouteContent(page, '/dashboard', 'A place for the moments that still feel alive.')

    await page.goto(`${getBaseUrl()}/contract`, { waitUntil: 'domcontentloaded' })
    await waitForRouteContent(page, '/contract', 'Shared Relationship Contract')
    assert.equal(await page.getByText('Pillar I: Mutual Respect').count() > 0, true)
    assert.equal(await page.getByText('Pillar II: Absolute Trust').count() > 0, true)
    assert.equal(await page.locator('main').getByRole('button', { name: /delete|export|upload|draw|sign contract|sign & open vault/i }).count(), 0)
    assert.equal(await page.locator('main').getByRole('button', { name: /accept contract|accepted/i }).count(), 1)

    const contractText = await page.locator('main').innerText()
    assert.equal(FORBIDDEN_CONTRACT_TEXT.test(contractText), false, 'Contract route rendered forbidden raw signature or legacy action text.')

    await page.goto(`${getBaseUrl()}/timeline`, { waitUntil: 'domcontentloaded' })
    await waitForRouteContent(page, '/timeline', 'Our Story')
    await page.getByRole('heading', { name: 'Our Story' }).waitFor({ state: 'visible', timeout: 5000 })
    assert.equal(await page.locator('.timeline-line').count(), 1, 'Timeline should keep the original vertical line.')
    assert.equal(await page.locator('.timeline-card').count() > 0, true, 'Timeline should render old-style cards.')
    assert.equal(await page.getByRole('button', { name: 'View memory' }).count() > 0, true, 'Timeline should keep detail interaction.')

    await page.goto(`${getBaseUrl()}/timeline`, { waitUntil: 'domcontentloaded' })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForRouteContent(page, '/timeline', 'Our Story')

    await page.goto(`${getBaseUrl()}/gallery`, { waitUntil: 'domcontentloaded' })
    await waitForRouteContent(page, '/gallery', 'Our Shared Gallery')
    await page.getByRole('heading', { name: 'Moments we kept close' }).waitFor({ state: 'visible', timeout: 5000 })
    assert.equal(await page.locator('.gallery-grid .gallery-item').count() > 0, true, 'Gallery should render old-style grid tiles.')
    await page.getByRole('button', { name: /Videos/ }).click()
    assert.equal(await page.getByText('Video memory').count() > 0, true, 'Gallery video filter should keep video entries visible.')
    await page.getByRole('button', { name: /All Media/ }).click()
    assert.equal(await page.getByRole('link', { name: /Our Live Album/ }).count(), 1, 'Gallery should include the integrated live album tile.')

    for (const [route, heading] of [
      ['/birthday', 'Fictional birthday runtime chapter'],
      ['/valentine', 'Fictional Valentine runtime chapter'],
      ['/confession', 'Fictional confession runtime chapter'],
    ]) {
      await page.goto(`${getBaseUrl()}${route}`, { waitUntil: 'domcontentloaded' })
      await waitForRouteContent(page, route, heading)
      assert.equal(await page.getByText('Fictional runtime section').count() > 0, true, `${route} should render sanitized runtime sections.`)
      assert.equal(await page.getByText('Sanitized item one').count() > 0, true, `${route} should render sanitized runtime lists.`)
      assert.equal(await page.getByRole('heading', { name: heading }).count(), 1)
      assert.equal(await page.locator('main img, main video, main audio, main iframe').count(), 0, `${route} should not render private media elements.`)
      assert.equal(await page.getByRole('link', { name: 'Return to Dashboard' }).count() > 0, true, `${route} should keep return navigation.`)
      assert.equal(await page.getByRole('link', { name: 'Open Gallery' }).count() > 0, true, `${route} should keep gallery navigation.`)
    }

    await page.goto(`${getBaseUrl()}/gallery`, { waitUntil: 'domcontentloaded' })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForRouteContent(page, '/gallery', 'Our Shared Gallery')

    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.locator('.sidebar-panel.active').waitFor({ state: 'visible', timeout: 5000 })
    await page.getByRole('button', { name: /Logout/ }).first().click()
    await expectRedirectToLogin(page, '/gallery')
  } finally {
    ensureObservedIsClean(observed)
    await context.close()
  }
}

async function runUnavailableTimelineCoverage(browser) {
  const { context, observed, page } = await createGuardedPage(browser, 'authorized-timeline-unavailable', {
    browserTestMode: browserRegressionUnavailableTimelineFixture,
    viewport: { width: 1440, height: 1024 },
  })

  try {
    await page.goto(`${getBaseUrl()}/timeline`, { waitUntil: 'domcontentloaded' })
    await waitForRouteContent(page, '/timeline', 'Our Story')
    assert.equal(await page.getByText(/No memories match this view yet\./).count() >= 0, true)
  } finally {
    ensureObservedIsClean(observed)
    await context.close()
  }
}

async function runAuthenticatedMobileCoverage(browser) {
  const { context, observed, page } = await createGuardedPage(browser, 'authorized-mobile', {
    browserTestMode: browserRegressionAuthorizedFixture,
    viewport: { width: 390, height: 844 },
  })

  try {
    await page.goto(`${getBaseUrl()}/settings`, { waitUntil: 'domcontentloaded' })
    await waitForRouteContent(page, '/settings', 'Application Settings')

    const primaryLabels = await page.locator('.mobile-nav-bar .mobile-nav-item a').allInnerTexts()
    assert.equal(primaryLabels.some((label) => label.includes('Dashboard')), true)
    assert.equal(primaryLabels.some((label) => label.includes('Gallery')), true)

    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.locator('.sidebar-panel.active').waitFor({ state: 'visible', timeout: 5000 })
    await page.getByRole('link', { name: /Contract/i }).first().click()
    await waitForRouteContent(page, '/contract', 'Shared Relationship Contract')

    await page.goto(`${getBaseUrl()}/timeline`, { waitUntil: 'domcontentloaded' })
    await waitForRouteContent(page, '/timeline', 'Our Story')
    assert.equal(await page.locator('.timeline-card').count() > 0, true, 'Timeline mobile should retain compact cards.')

    await page.goto(`${getBaseUrl()}/gallery`, { waitUntil: 'domcontentloaded' })
    await waitForRouteContent(page, '/gallery', 'Our Shared Gallery')
    await page.getByRole('button', { name: /Videos/ }).click()
    assert.equal(await page.getByText('Video memory').count() > 0, true, 'Gallery mobile should keep video filtering available.')

    await page.goto(`${getBaseUrl()}/birthday`, { waitUntil: 'domcontentloaded' })
    await waitForRouteContent(page, '/birthday', 'Fictional birthday runtime chapter')
    assert.equal(await page.getByText('Fictional birthday runtime chapter').count(), 1, 'Special mobile route should render sanitized runtime content.')

    const overflowX = await page.evaluate(() => {
      return Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
    })
    assert.equal(overflowX, 0, 'Gallery and special mobile layouts should not overflow horizontally.')
  } finally {
    ensureObservedIsClean(observed)
    await context.close()
  }
}

async function run() {
  await withAppServer(async () => {
    const browser = await chromium.launch({ headless: true })

    try {
      await runSignedOutCoverage(browser)
      await runSpoofedStorageCoverage(browser)
      await runAuthenticatedDesktopCoverage(browser)
      await runUnavailableTimelineCoverage(browser)
      await runAuthenticatedMobileCoverage(browser)
      log('app-v2 browser regression check passed.')
    } finally {
      await browser.close()
    }
  })
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exit(1)
})
