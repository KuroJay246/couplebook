/* global document, process, window */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer as createViteServer } from 'vite'
import { browserRegressionAuthorizedFixture } from '../src/test-fixtures/browser-regression.fixture.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const APP_ROOT = path.resolve(__dirname, '..')
const OUTPUT_ROOT = path.join(APP_ROOT, 'output', 'playwright', 'event-hub-shell-port')
let baseUrl = process.env.COUPLEBOOK_APP_V2_BROWSER_BASE_URL || 'http://127.0.0.1:4176'

function createInitScript() {
  return ({ fixture }) => {
    window.__COUPLEBOOK_BROWSER_TEST__ = fixture
  }
}

async function openAuthorizedPage(browser, viewport, route) {
  const context = await browser.newContext({ viewport })
  await context.addInitScript(createInitScript(), { fixture: browserRegressionAuthorizedFixture })
  const page = await context.newPage()
  const consoleErrors = []
  const responseErrors = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      responseErrors.push(`${response.status()} ${response.url()}`)
    }
  })

  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' })
  return { context, consoleErrors, page, responseErrors }
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
        resolve({ body, statusCode: response.statusCode || 0 })
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
    const response = await httpGet(baseUrl)
    return response.statusCode === 200 && /@vite\/client|src="\/src\/main\.jsx"/.test(response.body)
  } catch {
    return false
  }
}

async function withAppServer(callback) {
  if (await isExpectedServerReady()) {
    return callback()
  }

  const server = await createViteServer({
    root: APP_ROOT,
    server: {
      host: '127.0.0.1',
      port: 0,
    },
  })
  await server.listen()
  const address = server.httpServer.address()
  baseUrl = `http://127.0.0.1:${address.port}`

  try {
    return await callback()
  } finally {
    await server.close()
  }
}

async function capture(page, fileName) {
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true })
  await page.screenshot({
    path: path.join(OUTPUT_ROOT, fileName),
    fullPage: true,
  })
}

async function validateDesktop(browser) {
  const { context, consoleErrors, page, responseErrors } = await openAuthorizedPage(
    browser,
    { width: 1440, height: 1024 },
    '/settings',
  )

  try {
    await page.locator('header.app-safe-top h1').first().waitFor({ state: 'visible', timeout: 7000 })
    await page.locator('aside nav[aria-label="Main navigation"]').waitFor({ state: 'visible', timeout: 7000 })

    const navLabels = await page.locator('aside nav[aria-label="Main navigation"] a').allInnerTexts()
    assert.equal(navLabels.includes('Home'), true, 'Desktop rail should include Home.')
    assert.equal(navLabels.includes('Story'), true, 'Desktop rail should include Story.')
    assert.equal(navLabels.includes('Album'), true, 'Desktop rail should include Album.')
    assert.equal(navLabels.includes('Us'), true, 'Desktop rail should include Us.')
    assert.equal(navLabels.includes('Plans'), true, 'Desktop rail should include Plans.')

    const metrics = await page.evaluate(() => ({
      overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      railWidth: Math.round(document.querySelector('aside')?.getBoundingClientRect().width || 0),
      heading: document.querySelector('header h1')?.textContent?.trim() || '',
      quickAddVisible: Boolean(document.querySelector('header button')),
    }))

    assert.equal(metrics.overflowX, 0, 'Desktop shell should not overflow horizontally.')
    assert.equal(metrics.railWidth >= 84, true, 'Desktop rail should render with Event Hub-style width.')
    assert.equal(metrics.heading, 'More', 'Desktop top bar should render the current route title.')
    assert.deepEqual(consoleErrors, [], 'Desktop shell should not log console errors.')
    assert.deepEqual(responseErrors, [], 'Desktop shell should not request failed resources.')

    await capture(page, 'desktop-settings.png')
  } finally {
    await context.close()
  }
}

async function validateMobile(browser) {
  const { context, consoleErrors, page, responseErrors } = await openAuthorizedPage(
    browser,
    { width: 390, height: 844 },
    '/dashboard',
  )

  try {
    await page.locator('header.app-safe-top h1').first().waitFor({ state: 'visible', timeout: 7000 })
    await page.locator('.mobile-tab-bar').waitFor({ state: 'visible', timeout: 7000 })

    const mobileLabels = await page.locator('.mobile-tab-bar .mobile-tab-item').allInnerTexts()
    assert.equal(mobileLabels.some((label) => label.includes('Home')), true, 'Mobile nav should include Home.')
    assert.equal(mobileLabels.some((label) => label.includes('Story')), true, 'Mobile nav should include Story.')
    assert.equal(mobileLabels.some((label) => label.includes('Album')), true, 'Mobile nav should include Album.')
    assert.equal(mobileLabels.some((label) => label.includes('Us')), true, 'Mobile nav should include Us.')
    assert.equal(mobileLabels.some((label) => label.includes('Plans')), true, 'Mobile nav should include Plans.')

    await page.getByRole('button', { name: 'Open all navigation' }).click()
    await page.getByRole('dialog', { name: 'Navigation menu' }).waitFor({ state: 'visible', timeout: 7000 })
    assert.equal(await page.getByRole('link', { name: 'Favorites' }).count() > 0, true, 'Mobile More sheet should expose extra destinations.')

    const metrics = await page.evaluate(() => ({
      overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      tabBottom: Math.round(window.innerHeight - document.querySelector('.mobile-tab-bar').getBoundingClientRect().bottom),
    }))

    assert.equal(metrics.overflowX, 0, 'Mobile shell should not overflow horizontally.')
    assert.equal(metrics.tabBottom >= 0, true, 'Mobile tab bar should remain visible in the viewport.')
    assert.deepEqual(consoleErrors, [], 'Mobile shell should not log console errors.')
    assert.deepEqual(responseErrors, [], 'Mobile shell should not request failed resources.')

    await capture(page, 'mobile-dashboard-more-open.png')
  } finally {
    await context.close()
  }
}

async function run() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true })
  await withAppServer(async () => {
    const browser = await chromium.launch({ headless: true })

    try {
      await validateDesktop(browser)
      await validateMobile(browser)
    } finally {
      await browser.close()
    }
  })

  process.stdout.write(`Shell port validation passed. Screenshots saved to ${OUTPUT_ROOT}\n`)
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exit(1)
})
