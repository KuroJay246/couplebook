/* global document, window */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer as createViteServer } from 'vite'
import {
  browserRegressionAuthorizedFixture,
  browserRegressionSignedOutFixture,
} from '../src/test-fixtures/browser-regression.fixture.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const APP_ROOT = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(APP_ROOT, '..')
const SCREENSHOT_ROOT = path.join(REPO_ROOT, '.visual-audit', 'visual-regression-current')

const VIEWPORTS = Object.freeze([
  { name: 'desktop-1440', family: 'desktop', width: 1440, height: 1024 },
  { name: 'desktop-1280', family: 'desktop', width: 1280, height: 800 },
  { name: 'tablet-landscape', family: 'tablet', width: 1024, height: 768 },
  { name: 'tablet-portrait', family: 'tablet', width: 768, height: 1024 },
  { name: 'mobile-390', family: 'mobile', width: 390, height: 844 },
  { name: 'mobile-360', family: 'mobile', width: 360, height: 800 },
])

const ROUTES = Object.freeze([
  { path: '/login', heading: 'Open the book kept between the two of you.', mode: 'signed-out' },
  { path: '/dashboard', heading: 'A place for the moments that still feel alive.', mode: 'authorized' },
  { path: '/timeline', heading: /Our Story/, mode: 'authorized' },
  { path: '/gallery', heading: /Our Shared Gallery/, mode: 'authorized' },
  { path: '/profile', heading: /Relationship Profiles/, mode: 'authorized' },
  { path: '/favorites', heading: /Favorite Things/, mode: 'authorized' },
  { path: '/settings', heading: /Application Settings/, mode: 'authorized' },
  { path: '/contract', heading: /Shared Relationship Contract/, mode: 'authorized' },
  { path: '/birthday', heading: 'Fictional birthday runtime chapter', mode: 'authorized' },
  { path: '/valentine', heading: 'Fictional Valentine runtime chapter', mode: 'authorized' },
  { path: '/confession', heading: 'Fictional confession runtime chapter', mode: 'authorized' },
])

function log(message) {
  process.stdout.write(`${message}\n`)
}

function createInitScript() {
  return ({ fixture }) => {
    window.__COUPLEBOOK_BROWSER_TEST__ = fixture
  }
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true })
  } catch (error) {
    if (!/Executable doesn't exist|browserType\.launch/i.test(String(error?.message || error))) {
      throw error
    }
    return chromium.launch({ headless: true, channel: 'chrome' })
  }
}

async function measurePage(page) {
  return page.evaluate(() => {
    const mobileNav = document.querySelector('.mobile-nav-bar')
    const shellContent = document.querySelector('.main-content')
    const heading = document.querySelector('main h1, main h2')
    const galleryCards = [...document.querySelectorAll('.gallery-item')]
    const timelineCards = [...document.querySelectorAll('.timeline-card')]
    const specialDocument = document.querySelector('.special-page-standalone .card')
    const specialDocumentHeading = specialDocument?.querySelector('h2, h3')
    const specialDocumentBody = specialDocument?.querySelector('p, li, blockquote')
    const visibleGalleryCards = galleryCards.filter((card) => card.getBoundingClientRect().height > 0)
    const galleryTops = [...new Set(visibleGalleryCards.map((card) => Math.round(card.getBoundingClientRect().top)))]

    return {
      pathname: window.location.pathname,
      overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      scrollHeight: document.documentElement.scrollHeight,
      contentWidth: shellContent ? Math.round(shellContent.getBoundingClientRect().width) : null,
      headingSize: heading ? Number.parseFloat(window.getComputedStyle(heading).fontSize) : 0,
      headingFamily: heading ? window.getComputedStyle(heading).fontFamily : '',
      bodyBackground: window.getComputedStyle(document.body).backgroundImage,
      mobileNavVisible: mobileNav ? window.getComputedStyle(mobileNav).display !== 'none' : false,
      mobileNavBottom: mobileNav ? Math.round(window.innerHeight - mobileNav.getBoundingClientRect().bottom) : null,
      galleryCardWidths: visibleGalleryCards.slice(0, 8).map((card) => Math.round(card.getBoundingClientRect().width)),
      galleryColumnsInFirstRows: galleryTops.slice(0, 2).map((top) => {
        return visibleGalleryCards.filter((card) => Math.round(card.getBoundingClientRect().top) === top).length
      }),
      timelineCardWidths: timelineCards.slice(0, 8).map((card) => Math.round(card.getBoundingClientRect().width)),
      specialDocumentBackground: specialDocument ? window.getComputedStyle(specialDocument).backgroundColor : '',
      specialDocumentHeadingColor: specialDocumentHeading ? window.getComputedStyle(specialDocumentHeading).color : '',
      specialDocumentBodyColor: specialDocumentBody ? window.getComputedStyle(specialDocumentBody).color : '',
    }
  })
}

function assertRecoveredVisuals(route, viewport, metrics) {
  assert.equal(metrics.overflowX, 0, `${viewport.name} ${route.path} should not overflow horizontally.`)
  assert.match(metrics.headingFamily, /Playfair Display|Georgia/i, `${viewport.name} ${route.path} should keep the recovered heading type.`)
  assert.match(metrics.bodyBackground, /radial-gradient|linear-gradient/i, `${viewport.name} ${route.path} should keep the dark romantic background.`)

  if (route.mode === 'authorized') {
    assert.equal(metrics.contentWidth <= 1180, true, `${viewport.name} ${route.path} should stay inside the recovered app width.`)
  }

  if (viewport.family === 'mobile' && route.mode === 'authorized') {
    assert.equal(metrics.mobileNavVisible, true, `${viewport.name} ${route.path} should keep mobile navigation visible.`)
    assert.equal(metrics.mobileNavBottom >= 0, true, `${viewport.name} ${route.path} mobile navigation should remain in the viewport.`)
  }

  if (route.path === '/gallery') {
    if (viewport.family === 'desktop') {
      assert.equal(
        metrics.galleryColumnsInFirstRows.some((columns) => columns >= 3),
        true,
        'Desktop Gallery should retain multi-column visual density.',
      )
    }
    assert.equal(
      metrics.galleryCardWidths.every((width) => width >= 220 && width <= 390),
      true,
      `${viewport.name} Gallery card widths should stay in the recovered range.`,
    )
  }

  if (route.path === '/timeline') {
    const maxTimelineCardWidth = viewport.family === 'mobile' ? 390 : 940
    assert.equal(
      metrics.timelineCardWidths.every((width) => width <= maxTimelineCardWidth),
      true,
      `${viewport.name} Timeline cards should not return to oversized full-page blocks.`,
    )
  }

  if (['/birthday', '/valentine', '/confession'].includes(route.path)) {
    assert.notEqual(metrics.specialDocumentBackground, 'rgba(0, 0, 0, 0)', `${route.path} should keep a distinct dark special document.`)
    assert.notEqual(metrics.specialDocumentHeadingColor, 'rgb(255, 255, 255, 0)', `${route.path} should keep readable special headings.`)
    assert.notEqual(metrics.specialDocumentBodyColor, 'rgb(255, 255, 255, 0)', `${route.path} should keep readable special body copy.`)
  }
}

async function assertDetailInteraction(page, route, viewport) {
  if (route.path === '/timeline') {
    await page.getByRole('button', { name: 'View memory' }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ state: 'visible', timeout: 5000 })
    assert.equal(await dialog.locator('img, video, audio, iframe').count(), 0, `${viewport.name} ${route.path} detail should not render private media elements.`)
    assert.equal(await dialog.getByRole('button', { name: /close/i }).count() > 0, true, `${viewport.name} ${route.path} detail should expose a close control.`)
    await dialog.getByRole('button', { name: /close/i }).first().click()
    await dialog.waitFor({ state: 'hidden', timeout: 5000 })
  }

  if (route.path === '/gallery') {
    await page.locator('button.gallery-media-frame').first().click()
    const overlay = page.locator('.lightbox-overlay.active, .modal-overlay.active').first()
    await overlay.waitFor({ state: 'visible', timeout: 5000 })
    assert.equal(await overlay.locator('img, video, audio, iframe').count(), 0, `${viewport.name} ${route.path} detail should not render private media elements.`)
    await page.locator('.lightbox-close, .modal-close, .modal-footer button').first().click()
    await overlay.waitFor({ state: 'hidden', timeout: 5000 })
  }
}

async function run() {
  fs.rmSync(SCREENSHOT_ROOT, { recursive: true, force: true })
  fs.mkdirSync(SCREENSHOT_ROOT, { recursive: true })

  const server = await createViteServer({
    root: APP_ROOT,
    server: {
      host: '127.0.0.1',
      port: 0,
    },
  })
  await server.listen()
  const address = server.httpServer.address()
  const baseUrl = `http://127.0.0.1:${address.port}`
  const browser = await launchBrowser()
  const initScript = createInitScript()
  const results = []

  try {
    for (const viewport of VIEWPORTS) {
      for (const route of ROUTES) {
        const context = await browser.newContext({
          viewport: {
            width: viewport.width,
            height: viewport.height,
          },
        })
        const fixture = route.mode === 'authorized' ? browserRegressionAuthorizedFixture : browserRegressionSignedOutFixture
        await context.addInitScript(initScript, { fixture })
        const page = await context.newPage()
        const consoleErrors = []
        const failedResponses = []

        page.on('console', (message) => {
          if (message.type() === 'error') {
            consoleErrors.push(message.text())
          }
        })
        page.on('response', (response) => {
          if (response.status() >= 400) {
            failedResponses.push(`${response.status()} ${response.url()}`)
          }
        })

        try {
          await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded' })
          await page.getByRole('heading', { name: route.heading }).first().waitFor({ state: 'visible', timeout: 7000 })
          await page.waitForTimeout(200)
          const metrics = await measurePage(page)
          assert.deepEqual(consoleErrors, [], `${viewport.name} ${route.path} should not log browser console errors.`)
          assert.deepEqual(failedResponses, [], `${viewport.name} ${route.path} should not request failed resources.`)
          assertRecoveredVisuals(route, viewport, metrics)
          await assertDetailInteraction(page, route, viewport)

          const screenshotPath = path.join(SCREENSHOT_ROOT, `${viewport.name}-${route.path.slice(1) || 'root'}.png`)
          await page.screenshot({ path: screenshotPath, fullPage: true })
          results.push({ viewport: viewport.name, route: route.path, metrics, screenshotPath })
        } finally {
          await context.close()
        }
      }
    }
  } finally {
    await browser.close()
    await server.close()
  }

  fs.writeFileSync(path.join(SCREENSHOT_ROOT, 'measurements.json'), JSON.stringify({ baseUrl, results }, null, 2))
  log(`app-v2 visual regression check passed. Screenshots: ${SCREENSHOT_ROOT}`)
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exit(1)
})
