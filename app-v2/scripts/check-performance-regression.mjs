/* global PerformanceObserver, document, performance, window */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer as createViteServer } from 'vite'
import { browserRegressionAuthorizedFixture } from '../src/test-fixtures/browser-regression.fixture.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const APP_ROOT = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(APP_ROOT, '..')
const OUTPUT_ROOT = path.join(REPO_ROOT, '.visual-audit', 'performance-current')

const ROUTES = Object.freeze([
  { path: '/dashboard', heading: 'A place for the moments that still feel alive.' },
  { path: '/timeline', heading: /Our Story/ },
  { path: '/gallery', heading: /Our Shared Gallery/ },
  { path: '/profile', heading: /Relationship Profiles/ },
  { path: '/favorites', heading: /Favorite Things/ },
  { path: '/settings', heading: /Application Settings/ },
  { path: '/contract', heading: /Shared Relationship Contract/ },
  { path: '/birthday', heading: 'Fictional birthday runtime chapter' },
  { path: '/valentine', heading: 'Fictional Valentine runtime chapter' },
  { path: '/confession', heading: 'Fictional confession runtime chapter' },
])

const THRESHOLDS = Object.freeze({
  initialRouteMs: 5000,
  routeTransitionMs: 2500,
  modalOpenMs: 1000,
  mobileScrollMaxFrameGapMs: 120,
  mobileScrollLongFrameCount: 2,
  cumulativeLayoutShift: 0.1,
})

function log(message) {
  process.stdout.write(`${message}\n`)
}

function createInitScript() {
  return ({ fixture }) => {
    window.__COUPLEBOOK_BROWSER_TEST__ = fixture
    window.__COUPLEBOOK_PERF__ = {
      layoutShift: 0,
      longTasks: [],
    }

    if ('PerformanceObserver' in window) {
      try {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              window.__COUPLEBOOK_PERF__.layoutShift += entry.value
            }
          }
        })
        layoutShiftObserver.observe({ type: 'layout-shift', buffered: true })
      } catch {
        // Layout shift is unavailable in some browser builds.
      }

      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          window.__COUPLEBOOK_PERF__.longTasks.push(
            ...list.getEntries().map((entry) => ({
              duration: Math.round(entry.duration),
              startTime: Math.round(entry.startTime),
            })),
          )
        })
        longTaskObserver.observe({ type: 'longtask', buffered: true })
      } catch {
        // Long task timing is unavailable in some browser builds.
      }
    }
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

function attachPageGuards(page, observed) {
  page.on('console', (message) => {
    if (message.type() === 'error') observed.consoleErrors.push(message.text())
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
    if (response.status() >= 400) observed.failedResponses.push(`${response.status()} ${response.url()}`)
  })
}

function assertCleanObserved(observed) {
  assert.deepEqual(observed.consoleErrors, [], 'Performance run should not log console errors.')
  assert.deepEqual(observed.pageErrors, [], 'Performance run should not raise page errors.')
  assert.deepEqual(observed.failedResponses, [], 'Performance run should not hit failed responses.')
  assert.deepEqual(observed.broadUsersAccess, [], 'Performance run should not make broad users requests.')
  assert.deepEqual(observed.privateMedia, [], 'Performance run should not request private media.')
  assert.deepEqual(observed.staticDependencies, [], 'Performance run should not request old static runtime files.')
}

async function waitForRoute(page, route) {
  await page.waitForURL((url) => url.pathname === route.path, { timeout: 7000 })
  await page.getByRole('heading', { name: route.heading }).first().waitFor({ state: 'visible', timeout: 7000 })
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText || ''
      return !text.includes('Restoring your private route') && !text.includes('Restoring Couple Book')
    },
    { timeout: 7000 },
  )
}

async function timed(label, callback) {
  const startedAt = performance.now()
  const value = await callback()
  return {
    label,
    ms: Math.round(performance.now() - startedAt),
    ...(value === undefined ? {} : { value }),
  }
}

async function measureInitialRoutes(page, baseUrl) {
  const routes = []

  for (const route of ROUTES) {
    const result = await timed(`initial:${route.path}`, async () => {
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded' })
      await waitForRoute(page, route)
    })
    assert.equal(result.ms <= THRESHOLDS.initialRouteMs, true, `${route.path} initial render should stay below ${THRESHOLDS.initialRouteMs}ms.`)
    routes.push(result)
  }

  return routes
}

async function measureRouteTransitions(page, baseUrl) {
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' })
  await waitForRoute(page, ROUTES[0])

  const transitions = []
  for (const route of ROUTES.slice(1, 6)) {
    const result = await timed(`transition:${route.path}`, async () => {
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded' })
      await waitForRoute(page, route)
    })
    assert.equal(result.ms <= THRESHOLDS.routeTransitionMs, true, `${route.path} transition should stay below ${THRESHOLDS.routeTransitionMs}ms.`)
    transitions.push(result)
  }

  return transitions
}

async function measureDetailDialog(page, baseUrl, routePath, triggerTarget) {
  const route = ROUTES.find((entry) => entry.path === routePath)
  await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded' })
  await waitForRoute(page, route)

  const result = await timed(`modal:${route.path}`, async () => {
    if (triggerTarget.selector) {
      await page.locator(triggerTarget.selector).first().click()
    } else {
      await page.getByRole('button', { name: triggerTarget.name }).first().click()
    }
    await page.locator('[role="dialog"], .lightbox-overlay.active, .modal-overlay.active').first().waitFor({ state: 'visible', timeout: 5000 })
  })
  assert.equal(result.ms <= THRESHOLDS.modalOpenMs, true, `${route.path} detail dialog should open below ${THRESHOLDS.modalOpenMs}ms.`)
  const dialog = page.locator('[role="dialog"], .lightbox-overlay.active, .modal-overlay.active').first()
  assert.equal(await dialog.locator('img, video, audio, iframe').count(), 0, `${route.path} dialog should not render private media elements.`)
  await page.locator('.lightbox-close, .modal-close, .modal-footer button, [role="dialog"] button[aria-label*="Close"]').first().click()
  await dialog.waitFor({ state: 'hidden', timeout: 5000 })
  return result
}

async function measureMobileScroll(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(createInitScript(), { fixture: browserRegressionAuthorizedFixture })
  const page = await context.newPage()
  const observed = {
    broadUsersAccess: [],
    consoleErrors: [],
    failedResponses: [],
    pageErrors: [],
    privateMedia: [],
    staticDependencies: [],
  }
  attachPageGuards(page, observed)

  try {
    const route = ROUTES.find((entry) => entry.path === '/gallery')
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded' })
    await waitForRoute(page, route)

    const result = await timed('mobile-scroll:/gallery', async () => {
      return page.evaluate(async () => {
        return new Promise((resolve) => {
          let frame = 0
          let lastFrameAt = performance.now()
          const maxFrames = 45
          const frameGaps = []
          const nodeCount = document.querySelectorAll('*').length
          const tileCount = document.querySelectorAll('.gallery-item').length
          const mediaFrameCount = document.querySelectorAll('.gallery-media-frame').length
          const imageCount = document.querySelectorAll('img').length
          const videoCount = document.querySelectorAll('video').length
          const scrollHeight = document.documentElement.scrollHeight
          const scrollWidth = document.documentElement.scrollWidth
          const step = () => {
            const now = performance.now()
            frameGaps.push(Math.round(now - lastFrameAt))
            lastFrameAt = now
            window.scrollBy(0, 140)
            frame += 1
            if (frame >= maxFrames || window.scrollY + window.innerHeight >= document.documentElement.scrollHeight) {
              const sortedFrameGaps = frameGaps.toSorted((left, right) => left - right)
              resolve({
                frameCount: frame,
                longFrameCount: frameGaps.filter((gap) => gap > 50).length,
                maxFrameGapMs: Math.max(...frameGaps),
                medianFrameGapMs: sortedFrameGaps[Math.floor(sortedFrameGaps.length / 2)],
                nodeCount,
                tileCount,
                mediaFrameCount,
                imageCount,
                videoCount,
                scrollHeight,
                scrollWidth,
                usedJsHeapSize: performance.memory?.usedJSHeapSize ?? null,
                totalJsHeapSize: performance.memory?.totalJSHeapSize ?? null,
              })
              return
            }
            window.requestAnimationFrame(step)
          }
          window.requestAnimationFrame(step)
        })
      })
    })

    const overflowX = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth))
    assert.equal(overflowX, 0, 'Mobile performance route should not overflow horizontally while scrolling.')
    assert.equal(
      result.value.maxFrameGapMs <= THRESHOLDS.mobileScrollMaxFrameGapMs,
      true,
      `Mobile Gallery scroll frame gaps should stay below ${THRESHOLDS.mobileScrollMaxFrameGapMs}ms. ${JSON.stringify(result.value)}`,
    )
    assert.equal(
      result.value.longFrameCount <= THRESHOLDS.mobileScrollLongFrameCount,
      true,
      `Mobile Gallery scroll should not repeatedly miss long-frame thresholds. ${JSON.stringify(result.value)}`,
    )
    assertCleanObserved(observed)
    return result
  } finally {
    await context.close()
  }
}

async function readPerformanceState(page) {
  return page.evaluate(() => {
    const resources = performance.getEntriesByType('resource')
    return {
      cumulativeLayoutShift: Number((window.__COUPLEBOOK_PERF__?.layoutShift || 0).toFixed(4)),
      longTaskCount: window.__COUPLEBOOK_PERF__?.longTasks?.length || 0,
      privateMediaResourceCount: resources.filter((entry) => /\/assets\/photos\/|\/assets\/videos\/|OUR%20MEMORIES|OUR MEMORIES/i.test(entry.name)).length,
      resourceCount: resources.length,
      route: window.location.pathname,
    }
  })
}

async function run() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true })
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true })

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

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
    await context.addInitScript(createInitScript(), { fixture: browserRegressionAuthorizedFixture })
    const page = await context.newPage()
    const observed = {
      broadUsersAccess: [],
      consoleErrors: [],
      failedResponses: [],
      pageErrors: [],
      privateMedia: [],
      staticDependencies: [],
    }
    attachPageGuards(page, observed)

    const initialRoutes = await measureInitialRoutes(page, baseUrl)
    const routeTransitions = await measureRouteTransitions(page, baseUrl)
    const modalOpen = [
      await measureDetailDialog(page, baseUrl, '/timeline', { name: 'View memory' }),
      await measureDetailDialog(page, baseUrl, '/gallery', { selector: 'button.gallery-media-frame' }),
    ]
    const performanceState = await readPerformanceState(page)

    assert.equal(performanceState.cumulativeLayoutShift <= THRESHOLDS.cumulativeLayoutShift, true, 'Cumulative layout shift should stay below the recovery threshold.')
    assert.equal(performanceState.privateMediaResourceCount, 0, 'Performance run should not load private media resources.')
    assertCleanObserved(observed)

    await context.close()
    const mobileScroll = await measureMobileScroll(browser, baseUrl)

    const report = {
      baseUrl,
      generatedAt: new Date().toISOString(),
      thresholds: THRESHOLDS,
      initialRoutes,
      routeTransitions,
      modalOpen,
      mobileScroll,
      performanceState,
    }
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'performance.json'), JSON.stringify(report, null, 2))
    log(`app-v2 performance regression check passed. Metrics: ${path.join(OUTPUT_ROOT, 'performance.json')}`)
  } finally {
    await browser.close()
    await server.close()
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exit(1)
})
