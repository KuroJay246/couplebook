/* global URL, document, getComputedStyle, matchMedia, window */

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
const OUTPUT_ROOT = path.join(REPO_ROOT, '.visual-audit', 'product-current')

const VIEWPORTS = Object.freeze([
  { name: 'desktop', width: 1440, height: 1024, mode: 'desktop' },
  { name: 'laptop', width: 1280, height: 800, mode: 'desktop' },
  { name: 'tablet', width: 768, height: 1024, mode: 'tablet' },
  { name: 'mobile', width: 390, height: 844, mode: 'mobile' },
  { name: 'small-mobile', width: 360, height: 800, mode: 'mobile' },
  { name: 'desktop-zoom-200', width: 720, height: 512, mode: 'zoom' },
])

const ROUTES = Object.freeze([
  { path: '/login', heading: 'Sign in with your Couple Book email', fixture: browserRegressionSignedOutFixture },
  { path: '/dashboard', heading: 'Dashboard', fixture: browserRegressionAuthorizedFixture },
  { path: '/timeline', heading: 'Our story timeline', fixture: browserRegressionAuthorizedFixture, detailButton: 'View memory' },
  { path: '/gallery', heading: 'Our visual archive', fixture: browserRegressionAuthorizedFixture, detailButton: 'View details' },
  { path: '/profile', heading: 'Profile', fixture: browserRegressionAuthorizedFixture },
  { path: '/favorites', heading: 'Favorites', fixture: browserRegressionAuthorizedFixture },
  { path: '/settings', heading: 'Settings', fixture: browserRegressionAuthorizedFixture },
  { path: '/contract', heading: 'Our agreement', fixture: browserRegressionAuthorizedFixture },
  { path: '/birthday', heading: 'Birthday moment', fixture: browserRegressionAuthorizedFixture },
  { path: '/valentine', heading: 'Valentine moment', fixture: browserRegressionAuthorizedFixture },
  { path: '/confession', heading: 'Confession moment', fixture: browserRegressionAuthorizedFixture },
])

const READ_ONLY_WORKFLOW_ROUTES = new Set(['/timeline', '/profile', '/favorites', '/settings', '/contract', '/birthday', '/valentine', '/confession'])

function log(message) {
  process.stdout.write(`${message}\n`)
}

function createInitScript() {
  return ({ fixture, reducedMotion }) => {
    window.__COUPLEBOOK_BROWSER_TEST__ = fixture
    if (reducedMotion) {
      window.matchMedia = (query) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() {
          return false
        },
      })
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

function createObserved(label) {
  return {
    label,
    broadUsersAccess: [],
    consoleErrors: [],
    failedResponses: [],
    pageErrors: [],
    privateMedia: [],
    staticDependencies: [],
  }
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
  assert.deepEqual(observed.consoleErrors, [], `${observed.label} should not log console errors.`)
  assert.deepEqual(observed.pageErrors, [], `${observed.label} should not raise page errors.`)
  assert.deepEqual(observed.failedResponses, [], `${observed.label} should not request failed resources.`)
  assert.deepEqual(observed.broadUsersAccess, [], `${observed.label} should not make broad users requests.`)
  assert.deepEqual(observed.privateMedia, [], `${observed.label} should not request private media files.`)
  assert.deepEqual(observed.staticDependencies, [], `${observed.label} should not request old static runtime files.`)
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

async function collectInteractionMetrics(page) {
  return page.evaluate(() => {
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    }
    const accessibleText = (element) => {
      const labelledBy = element.getAttribute('aria-labelledby')
      const labelledByText = labelledBy
        ? labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.innerText || '')
            .join(' ')
        : ''
      return [
        element.getAttribute('aria-label'),
        labelledByText,
        [...(element.labels || [])].map((label) => label.innerText).join(' '),
        element.innerText,
        element.getAttribute('title'),
      ]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    }
    const controls = [...document.querySelectorAll('a[href], button, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])')]
      .filter(isVisible)
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName.toLowerCase(),
          type: element.getAttribute('type') || '',
          name: accessibleText(element),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          disabled: element.disabled === true || element.getAttribute('aria-disabled') === 'true',
          pathname: element.href ? new URL(element.href).pathname : '',
        }
      })
    const formControls = [...document.querySelectorAll('input, select, textarea')]
      .filter(isVisible)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute('type') || '',
        name: accessibleText(element),
      }))
    const headings = [...document.querySelectorAll('main h1, main h2, main h3')]
      .filter(isVisible)
      .map((element) => ({ tag: element.tagName.toLowerCase(), text: element.innerText.trim() }))

    return {
      controls,
      formControls,
      headings,
      mobileNavVisible: Boolean(document.querySelector('.mobile-nav')) && getComputedStyle(document.querySelector('.mobile-nav')).display !== 'none',
      overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    }
  })
}

function assertInteractionMetrics(route, viewport, metrics) {
  assert.equal(metrics.overflowX, 0, `${viewport.name} ${route.path} should not overflow horizontally.`)
  assert.equal(metrics.headings.length > 0, true, `${viewport.name} ${route.path} should expose a visible heading structure.`)
  assert.equal(metrics.controls.length > 0, true, `${viewport.name} ${route.path} should expose visible interactive controls.`)

  const unnamedControls = metrics.controls.filter((control) => !control.name && !control.disabled)
  assert.deepEqual(unnamedControls, [], `${viewport.name} ${route.path} should not expose unnamed active controls.`)

  const unnamedFields = metrics.formControls.filter((control) => !control.name)
  assert.deepEqual(unnamedFields, [], `${viewport.name} ${route.path} should label every visible form control.`)

  if (viewport.mode === 'mobile' || viewport.mode === 'zoom') {
    const tinyTargets = metrics.controls.filter((control) => {
      if (control.disabled) return false
      if (control.tag === 'a' && control.height >= 32 && control.width >= 32) return false
      return control.width < 36 || control.height < 36
    })
    assert.deepEqual(tinyTargets, [], `${viewport.name} ${route.path} should keep touch targets usable.`)
  }

  if (viewport.mode === 'mobile' && route.path !== '/login') {
    assert.equal(metrics.mobileNavVisible, true, `${viewport.name} ${route.path} should keep mobile navigation available.`)
  }
}

async function assertKeyboardFocus(page, route, viewport) {
  await page.keyboard.press('Home')
  await page.keyboard.press('Tab')
  const focused = []

  for (let index = 0; index < 8; index += 1) {
    const result = await page.evaluate(() => {
      const element = document.activeElement
      if (!element || element === document.body) return null
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        tag: element.tagName.toLowerCase(),
        text: (element.innerText || element.getAttribute('aria-label') || element.getAttribute('type') || '').trim(),
        visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden',
        focusVisible:
          style.outlineStyle !== 'none' ||
          Number.parseFloat(style.outlineWidth) > 0 ||
          style.boxShadow !== 'none' ||
          style.borderColor !== 'rgba(0, 0, 0, 0)',
      }
    })
    if (result) focused.push(result)
    await page.keyboard.press('Tab')
  }

  assert.equal(focused.length >= 2, true, `${viewport.name} ${route.path} should have keyboard-reachable controls.`)
  assert.deepEqual(
    focused.filter((entry) => !entry.visible || !entry.focusVisible),
    [],
    `${viewport.name} ${route.path} should keep keyboard focus visible.`,
  )
}

async function assertDialogInteraction(page, route, viewport) {
  if (!route.detailButton) return null

  const trigger = page.getByRole('button', { name: route.detailButton }).first()
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await dialog.waitFor({ state: 'visible', timeout: 5000 })

  const state = await page.evaluate(() => {
    const dialogElement = document.querySelector('dialog[open]')
    const active = document.activeElement
    const activeRect = active?.getBoundingClientRect()
    return {
      activeInsideDialog: Boolean(dialogElement && active && dialogElement.contains(active)),
      activeVisible: Boolean(activeRect && activeRect.width > 0 && activeRect.height > 0),
      mediaElements: dialogElement?.querySelectorAll('img, video, audio, iframe').length || 0,
      closeButtonCount: dialogElement?.querySelectorAll('button[aria-label*="Close"]').length || 0,
    }
  })
  assert.equal(state.activeInsideDialog, true, `${viewport.name} ${route.path} dialog should move focus inside the modal.`)
  assert.equal(state.activeVisible, true, `${viewport.name} ${route.path} dialog focus target should be visible.`)
  assert.equal(state.mediaElements, 0, `${viewport.name} ${route.path} dialog should not render private media elements.`)
  assert.equal(state.closeButtonCount > 0, true, `${viewport.name} ${route.path} dialog should expose a close button.`)

  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden', timeout: 5000 })
  await trigger.waitFor({ state: 'visible', timeout: 5000 })
  return state
}

async function assertMobileNavigation(page, route, viewport) {
  if (viewport.mode !== 'mobile' || route.path === '/login') return null

  const menuButton = page.getByRole('button', { name: 'Open secondary navigation' })
  await menuButton.click()
  const sheet = page.locator('.secondary-sheet')
  await sheet.waitFor({ state: 'visible', timeout: 5000 })
  const closeButton = sheet.getByRole('button', { name: 'Close' })
  await closeButton.click()
  await sheet.waitFor({ state: 'hidden', timeout: 5000 })
  return { opened: true, closed: true }
}

async function assertReadOnlyWorkflow(page, route, viewport) {
  if (!READ_ONLY_WORKFLOW_ROUTES.has(route.path)) return null

  const workflow = page.locator('.workflow-section').first()
  await workflow.waitFor({ state: 'visible', timeout: 5000 })
  await workflow.getByText('Editing locked').waitFor({ state: 'visible', timeout: 5000 })
  await workflow.getByRole('heading', { name: 'Preview changes are protected' }).waitFor({ state: 'visible', timeout: 5000 })
  await workflow.getByText('This preview is read-only.').waitFor({ state: 'visible', timeout: 5000 })

  const state = await workflow.evaluate((element) => ({
    forms: element.querySelectorAll('form, input, textarea, select').length,
    submitButtons: [...element.querySelectorAll('button')].filter((button) => /save|accept|archive/i.test(button.innerText || '')).length,
    text: element.innerText,
  }))
  assert.equal(state.forms, 0, `${viewport.name} ${route.path} read-only workflow should not expose editable form controls.`)
  assert.equal(state.submitButtons, 0, `${viewport.name} ${route.path} read-only workflow should not expose save/archive buttons.`)
  assert.equal(/production-write-disabled/i.test(state.text), true, `${viewport.name} ${route.path} should keep the disabled write mode visible as a subordinate note.`)
  return { readOnly: true }
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
        await context.addInitScript(initScript, {
          fixture: route.fixture,
          reducedMotion: viewport.name === 'desktop-zoom-200',
        })
        const page = await context.newPage()
        const observed = createObserved(`${viewport.name}:${route.path}`)
        attachPageGuards(page, observed)

        try {
          await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded' })
          await waitForRoute(page, route)
          const metrics = await collectInteractionMetrics(page)
          assertInteractionMetrics(route, viewport, metrics)
          await assertKeyboardFocus(page, route, viewport)
          const dialog = await assertDialogInteraction(page, route, viewport)
          const mobileMenu = await assertMobileNavigation(page, route, viewport)
          const workflow = await assertReadOnlyWorkflow(page, route, viewport)
          assertCleanObserved(observed)
          results.push({
            route: route.path,
            viewport: viewport.name,
            controlCount: metrics.controls.length,
            formControlCount: metrics.formControls.length,
            headingCount: metrics.headings.length,
            reducedMotion: metrics.reducedMotion,
            dialog,
            mobileMenu,
            workflow,
          })
        } finally {
          await context.close()
        }
      }
    }

    fs.writeFileSync(path.join(OUTPUT_ROOT, 'product-interactions.json'), JSON.stringify({ baseUrl, results }, null, 2))
    log(`app-v2 product interaction check passed. Metrics: ${path.join(OUTPUT_ROOT, 'product-interactions.json')}`)
  } finally {
    await browser.close()
    await server.close()
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exit(1)
})
