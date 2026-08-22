/* global document, getComputedStyle, setTimeout, window */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer as createViteServer } from 'vite'
import { browserRegressionAuthorizedFixture } from '../src/test-fixtures/browser-regression.fixture.js'
import { DEFAULT_THEME_ID, THEME_REGISTRY } from '../src/theme/themeRegistry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const APP_ROOT = path.resolve(__dirname, '..')
const REVIEW_ROOT = process.env.COUPLEBOOK_OWNER_UI_REVIEW_ROOT || 'C:\\Users\\Jaylan\\Documents\\couplebook.visual-review\\distinct-product-identity\\owner-ui-review'
const PREVIEW_URL = process.env.COUPLEBOOK_OWNER_UI_REVIEW_PREVIEW_URL || 'https://couplebook-97830--couplebook-distinct-identity-9d6i5xu0.web.app'
const PDF_PATH = path.join(REVIEW_ROOT, 'COUPLE_BOOK_OWNER_UI_REVIEW.pdf')
const SUMMARY_JSON_PATH = path.join(REVIEW_ROOT, 'owner-ui-review-summary.json')
const SUMMARY_MD_PATH = path.join(REVIEW_ROOT, 'owner-ui-review-summary.md')
const CONTACT_SHEET_PATH = path.join(REVIEW_ROOT, 'contact-sheets', 'owner-ui-review-contact-sheet.html')
const PYTHON_HELPER_PATH = path.join(APP_ROOT, 'scripts', 'build-owner-ui-review-pdf.py')
const PYTHON_COMMAND = process.env.PYTHON || 'python'
const REVIEW_DATE_LABEL = 'Saturday, August 22, 2026'

const OUTPUT_FOLDERS = Object.freeze([
  'desktop',
  'tablet',
  'mobile',
  'themes',
  'pages',
  'buttons',
  'cards',
  'forms',
  'dialogs',
  'media',
  'issues-before',
  'issues-after',
  'contact-sheets',
])

const VIEWPORTS = Object.freeze([
  { slug: 'desktop', label: 'Desktop', width: 1440, height: 1024, mode: 'desktop' },
  { slug: 'tablet', label: 'Tablet', width: 768, height: 1024, mode: 'tablet' },
  { slug: 'mobile', label: 'Mobile', width: 390, height: 844, mode: 'mobile' },
])

const THEME_VIEWPORTS = Object.freeze([
  VIEWPORTS[0],
  VIEWPORTS[2],
])

const DEFAULT_ROUTE_SET = Object.freeze([
  { path: '/dashboard', slug: 'dashboard', heading: 'Pick up where your story left off.' },
  { path: '/timeline', slug: 'timeline', heading: /Our Story/ },
  { path: '/gallery', slug: 'gallery', heading: /Our Shared Gallery/ },
  { path: '/profile', slug: 'profile', heading: /Us/ },
  { path: '/favorites', slug: 'favorites', heading: /Favorite Things/ },
  { path: '/plans', slug: 'plans', heading: /Ideas worth doing together\./ },
  { path: '/settings', slug: 'settings', heading: /Make the book yours/ },
  { path: '/contract', slug: 'contract', heading: /Shared Relationship Contract/ },
  { path: '/birthday', slug: 'birthday', heading: 'Fictional birthday runtime chapter' },
  { path: '/valentine', slug: 'valentine', heading: 'Fictional Valentine runtime chapter' },
  { path: '/confession', slug: 'confession', heading: 'Fictional confession runtime chapter' },
])

const THEME_ROUTES = Object.freeze([
  { path: '/dashboard', slug: 'dashboard', heading: 'Pick up where your story left off.' },
  { path: '/gallery', slug: 'gallery', heading: /Our Shared Gallery/ },
  { path: '/settings', slug: 'settings', heading: /Make the book yours/ },
])

function log(message) {
  process.stdout.write(`${message}\n`)
}

function fileNameForRoute(route, themeId) {
  return `${route.slug}-${themeId}.png`
}

function relativeToReviewRoot(filePath) {
  return path.relative(REVIEW_ROOT, filePath).replace(/\\/g, '/')
}

function waitForVisibleDelay() {
  return new Promise((resolve) => setTimeout(resolve, 250))
}

function createInitScript() {
  return ({ fixture }) => {
    window.__COUPLEBOOK_BROWSER_TEST__ = fixture
  }
}

function buildThemeFixture(themeId) {
  const fixture = JSON.parse(JSON.stringify(browserRegressionAuthorizedFixture))
  const settings = fixture.compatibility?.snapshot?.sources?.settings?.data
  if (settings) {
    settings.appearanceTheme = themeId
    settings.theme = themeId
  }
  return fixture
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

function assertObservedIsClean(observed) {
  assert.deepEqual(observed.consoleErrors, [], `${observed.label} should not log console errors.`)
  assert.deepEqual(observed.pageErrors, [], `${observed.label} should not raise page errors.`)
  assert.deepEqual(observed.failedResponses, [], `${observed.label} should not request failed resources.`)
  assert.deepEqual(observed.broadUsersAccess, [], `${observed.label} should not make broad users requests.`)
  assert.deepEqual(observed.privateMedia, [], `${observed.label} should not request private media assets.`)
  assert.deepEqual(observed.staticDependencies, [], `${observed.label} should not request rolled-back static runtime files.`)
}

async function ensureOutputTree() {
  await fsp.rm(REVIEW_ROOT, { recursive: true, force: true })
  for (const folder of OUTPUT_FOLDERS) {
    await fsp.mkdir(path.join(REVIEW_ROOT, folder), { recursive: true })
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

async function createLocalServer() {
  const server = await createViteServer({
    root: APP_ROOT,
    server: {
      host: '127.0.0.1',
      port: 0,
    },
  })
  await server.listen()
  const address = server.httpServer.address()
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    server,
  }
}

async function waitForRoute(page, route) {
  await page.waitForURL((url) => url.pathname === route.path, { timeout: 10000 })
  await page.getByRole('heading', { name: route.heading }).first().waitFor({ state: 'visible', timeout: 10000 })
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText || ''
      return !text.includes('Restoring your private route') && !text.includes('Restoring Couple Book')
    },
    { timeout: 10000 },
  )
  await waitForVisibleDelay()
}

async function collectPageMetrics(page, viewport) {
  return page.evaluate((viewportMode) => {
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
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
        }
      })
    const formControls = [...document.querySelectorAll('input, select, textarea')]
      .filter(isVisible)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute('type') || '',
        name: accessibleText(element),
      }))

    return {
      pathname: window.location.pathname,
      backgroundImage: getComputedStyle(document.body).backgroundImage,
      controlCount: controls.length,
      formControlCount: formControls.length,
      headingCount: [...document.querySelectorAll('main h1, main h2, main h3')].filter(isVisible).length,
      mobileNavVisible: Boolean(document.querySelector('.mobile-tab-bar')) && getComputedStyle(document.querySelector('.mobile-tab-bar')).display !== 'none',
      overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      tinyTargets: controls.filter((control) => {
        if (control.disabled) return false
        if (viewportMode !== 'mobile') return false
        return control.width < 36 || control.height < 36
      }).length,
      unnamedControls: controls.filter((control) => !control.name && !control.disabled).length,
      unnamedFields: formControls.filter((control) => !control.name).length,
    }
  }, viewport.mode)
}

function assertPageMetrics(route, viewport, metrics) {
  assert.equal(metrics.pathname, route.path, `${viewport.label} ${route.path} should keep the expected route.`)
  assert.equal(metrics.overflowX, 0, `${viewport.label} ${route.path} should not overflow horizontally.`)
  assert.match(metrics.backgroundImage, /radial-gradient|linear-gradient/i, `${viewport.label} ${route.path} should keep the rebuilt background system.`)
  assert.equal(metrics.headingCount > 0, true, `${viewport.label} ${route.path} should expose visible headings.`)
  assert.equal(metrics.controlCount > 0, true, `${viewport.label} ${route.path} should expose visible interactive controls.`)
  assert.equal(metrics.unnamedControls, 0, `${viewport.label} ${route.path} should not expose unnamed active controls.`)
  assert.equal(metrics.unnamedFields, 0, `${viewport.label} ${route.path} should label visible form controls.`)

  if (viewport.mode === 'mobile' && route.path !== '/login') {
    assert.equal(metrics.mobileNavVisible, true, `${viewport.label} ${route.path} should keep the mobile tab bar visible.`)
    assert.equal(metrics.tinyTargets, 0, `${viewport.label} ${route.path} should keep touch targets usable.`)
  }
}

async function writeIssueNotes() {
  const beforePath = path.join(REVIEW_ROOT, 'issues-before', '2026-08-22-missing-plans-route-coverage.md')
  const afterPath = path.join(REVIEW_ROOT, 'issues-after', '2026-08-22-plans-route-coverage-restored.md')

  await fsp.writeFile(
    beforePath,
    [
      '# Verified gap before owner review rerun',
      '',
      `Date: ${REVIEW_DATE_LABEL}`,
      '',
      '- The routed app exposes `/plans` as a protected primary route.',
      '- The existing browser-regression, visual-regression, product-interaction, and performance scripts were not traversing that route.',
      '- The owner review would have been incomplete without restoring that route to the review matrix.',
      '',
    ].join('\n'),
    'utf8',
  )

  await fsp.writeFile(
    afterPath,
    [
      '# Coverage fix applied before final owner review',
      '',
      `Date: ${REVIEW_DATE_LABEL}`,
      '',
      '- `/plans` is now covered by the browser-regression, visual-regression, product-interaction, and performance review lanes.',
      '- The dedicated owner-review run also captures `/plans` across desktop, tablet, and mobile screenshots.',
      '- No additional rendered UI defect was verified during this pass.',
      '',
    ].join('\n'),
    'utf8',
  )

  return {
    before: relativeToReviewRoot(beforePath),
    after: relativeToReviewRoot(afterPath),
  }
}

async function capturePreviewSmoke(browser, summary) {
  const results = []
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: {
        width: viewport.width,
        height: viewport.height,
      },
    })
    const page = await context.newPage()
    const observed = createObserved(`preview:${viewport.slug}`)
    attachPageGuards(page, observed)

    try {
      await page.goto(`${PREVIEW_URL}/dashboard`, { waitUntil: 'domcontentloaded' })
      await page.waitForURL((url) => url.pathname === '/login', { timeout: 15000 })
      await page.getByRole('heading', { name: 'Sign in with your Couple Book email' }).waitFor({ state: 'visible', timeout: 15000 })
      await waitForVisibleDelay()
      const metrics = await collectPageMetrics(page, viewport)
      assertPageMetrics({ path: '/login' }, viewport, metrics)
      const filePath = path.join(REVIEW_ROOT, viewport.slug, 'preview-signed-out.png')
      await page.screenshot({ path: filePath, fullPage: true })
      results.push({
        metrics,
        output: relativeToReviewRoot(filePath),
        viewport: viewport.slug,
      })
    } finally {
      assertObservedIsClean(observed)
      await context.close()
    }
  }

  summary.previewSmoke = results
}

async function captureViewportMatrix(browser, baseUrl, viewport, themeId) {
  const fixture = buildThemeFixture(themeId)
  const context = await browser.newContext({
    viewport: {
      width: viewport.width,
      height: viewport.height,
    },
  })
  const observed = createObserved(`matrix:${viewport.slug}:${themeId}`)
  await context.addInitScript(createInitScript(), { fixture })
  const page = await context.newPage()
  attachPageGuards(page, observed)

  const results = []

  try {
    for (const route of DEFAULT_ROUTE_SET) {
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded' })
      await waitForRoute(page, route)
      const metrics = await collectPageMetrics(page, viewport)
      assertPageMetrics(route, viewport, metrics)
      const filePath = path.join(REVIEW_ROOT, viewport.slug, fileNameForRoute(route, themeId))
      await page.screenshot({ path: filePath, fullPage: true })
      results.push({
        metrics,
        output: relativeToReviewRoot(filePath),
        route: route.path,
        viewport: viewport.slug,
      })
    }
  } finally {
    assertObservedIsClean(observed)
    await context.close()
  }

  return results
}

async function captureThemeShots(browser, baseUrl) {
  const shots = []

  for (const viewport of THEME_VIEWPORTS) {
    for (const theme of THEME_REGISTRY) {
      const fixture = buildThemeFixture(theme.id)
      const context = await browser.newContext({
        viewport: {
          width: viewport.width,
          height: viewport.height,
        },
      })
      const observed = createObserved(`themes:${viewport.slug}:${theme.id}`)
      await context.addInitScript(createInitScript(), { fixture })
      const page = await context.newPage()
      attachPageGuards(page, observed)

      try {
        for (const route of THEME_ROUTES) {
          await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded' })
          await waitForRoute(page, route)
          const metrics = await collectPageMetrics(page, viewport)
          assertPageMetrics(route, viewport, metrics)
          const filePath = path.join(REVIEW_ROOT, 'themes', `${viewport.slug}-${route.slug}-${theme.id}.png`)
          await page.screenshot({ path: filePath, fullPage: true })
          shots.push({
            metrics,
            output: relativeToReviewRoot(filePath),
            route: route.path,
            themeId: theme.id,
            themeName: theme.name,
            viewport: viewport.slug,
          })
        }
      } finally {
        assertObservedIsClean(observed)
        await context.close()
      }
    }
  }

  return shots
}

async function captureDetailShots(browser, baseUrl, summary) {
  const details = []

  const desktopContext = await browser.newContext({
    viewport: {
      width: VIEWPORTS[0].width,
      height: VIEWPORTS[0].height,
    },
  })
  const desktopObserved = createObserved('details:desktop')
  await desktopContext.addInitScript(createInitScript(), { fixture: buildThemeFixture(DEFAULT_THEME_ID) })
  const desktopPage = await desktopContext.newPage()
  attachPageGuards(desktopPage, desktopObserved)

  try {
    await desktopPage.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' })
    await waitForRoute(desktopPage, DEFAULT_ROUTE_SET.find((route) => route.path === '/settings'))
    const appearanceSection = desktopPage.locator('section, article').filter({ has: desktopPage.getByRole('heading', { name: 'Appearance' }) }).first()

    const settingsActionPath = path.join(REVIEW_ROOT, 'buttons', 'settings-actions.png')
    await desktopPage.locator('main').getByRole('button', { name: /Save changes/i }).first().screenshot({ path: settingsActionPath })
    details.push({ section: 'buttons', label: 'Settings save action', output: relativeToReviewRoot(settingsActionPath) })

    const themeTilesPath = path.join(REVIEW_ROOT, 'cards', 'settings-theme-tiles.png')
    await appearanceSection.screenshot({ path: themeTilesPath })
    details.push({ section: 'cards', label: 'Theme tiles', output: relativeToReviewRoot(themeTilesPath) })

    const settingsFormPath = path.join(REVIEW_ROOT, 'forms', 'settings-appearance.png')
    await appearanceSection.screenshot({ path: settingsFormPath })
    details.push({ section: 'forms', label: 'Settings appearance controls', output: relativeToReviewRoot(settingsFormPath) })

    await desktopPage.goto(`${baseUrl}/plans`, { waitUntil: 'domcontentloaded' })
    await waitForRoute(desktopPage, DEFAULT_ROUTE_SET.find((route) => route.path === '/plans'))
    const plansSection = desktopPage.locator('section, article').filter({ has: desktopPage.getByRole('searchbox', { name: 'Search plans' }) }).first()

    const planFiltersPath = path.join(REVIEW_ROOT, 'buttons', 'plans-status-filters.png')
    await desktopPage.getByRole('group', { name: 'Status filter' }).screenshot({ path: planFiltersPath })
    details.push({ section: 'buttons', label: 'Plans status filters', output: relativeToReviewRoot(planFiltersPath) })

    const planSearchPath = path.join(REVIEW_ROOT, 'forms', 'plans-search-and-actions.png')
    await plansSection.screenshot({ path: planSearchPath })
    details.push({ section: 'forms', label: 'Plans search', output: relativeToReviewRoot(planSearchPath) })

    await desktopPage.goto(`${baseUrl}/gallery`, { waitUntil: 'domcontentloaded' })
    await waitForRoute(desktopPage, DEFAULT_ROUTE_SET.find((route) => route.path === '/gallery'))

    const galleryGridPath = path.join(REVIEW_ROOT, 'cards', 'gallery-grid.png')
    await desktopPage.locator('.gallery-item').first().screenshot({ path: galleryGridPath })
    details.push({ section: 'cards', label: 'Gallery grid', output: relativeToReviewRoot(galleryGridPath) })

    const galleryMediaPath = path.join(REVIEW_ROOT, 'media', 'gallery-sanitized-media-grid.png')
    await desktopPage.locator('button.gallery-media-frame').first().screenshot({ path: galleryMediaPath })
    details.push({ section: 'media', label: 'Gallery sanitized media grid', output: relativeToReviewRoot(galleryMediaPath) })

    await desktopPage.locator('button.gallery-media-frame').first().click()
    const galleryDialog = desktopPage.getByRole('dialog')
    await galleryDialog.waitFor({ state: 'visible', timeout: 5000 })
    assert.equal(await galleryDialog.locator('img, video, audio, iframe').count(), 0, 'Gallery dialog should not render private media elements.')
    const galleryDialogPath = path.join(REVIEW_ROOT, 'dialogs', 'gallery-lightbox-dialog.png')
    await galleryDialog.screenshot({ path: galleryDialogPath })
    details.push({ section: 'dialogs', label: 'Gallery lightbox dialog', output: relativeToReviewRoot(galleryDialogPath) })
    await galleryDialog.getByRole('button', { name: /close/i }).first().click({ force: true })
    await galleryDialog.waitFor({ state: 'hidden', timeout: 5000 })

    await desktopPage.goto(`${baseUrl}/timeline`, { waitUntil: 'domcontentloaded' })
    await waitForRoute(desktopPage, DEFAULT_ROUTE_SET.find((route) => route.path === '/timeline'))
    await desktopPage.getByRole('button', { name: 'View memory' }).first().click()
    const timelineDialog = desktopPage.getByRole('dialog')
    await timelineDialog.waitFor({ state: 'visible', timeout: 5000 })
    assert.equal(await timelineDialog.locator('img, video, audio, iframe').count(), 0, 'Timeline dialog should not render private media elements.')
    const timelineDialogPath = path.join(REVIEW_ROOT, 'dialogs', 'timeline-memory-dialog.png')
    await timelineDialog.screenshot({ path: timelineDialogPath })
    details.push({ section: 'dialogs', label: 'Timeline detail dialog', output: relativeToReviewRoot(timelineDialogPath) })
    await timelineDialog.getByRole('button', { name: /close/i }).first().click({ force: true })
    await timelineDialog.waitFor({ state: 'hidden', timeout: 5000 })
  } finally {
    assertObservedIsClean(desktopObserved)
    await desktopContext.close()
  }

  const mobileContext = await browser.newContext({
    viewport: {
      width: VIEWPORTS[2].width,
      height: VIEWPORTS[2].height,
    },
  })
  const mobileObserved = createObserved('details:mobile')
  await mobileContext.addInitScript(createInitScript(), { fixture: buildThemeFixture(DEFAULT_THEME_ID) })
  const mobilePage = await mobileContext.newPage()
  attachPageGuards(mobilePage, mobileObserved)

  try {
    await mobilePage.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' })
    await waitForRoute(mobilePage, DEFAULT_ROUTE_SET.find((route) => route.path === '/settings'))
    await mobilePage.getByRole('button', { name: 'Open all navigation' }).click()
    const navDialog = mobilePage.getByRole('dialog', { name: 'Navigation menu' })
    await navDialog.waitFor({ state: 'visible', timeout: 5000 })
    const mobileNavPath = path.join(REVIEW_ROOT, 'dialogs', 'mobile-navigation-sheet.png')
    await navDialog.screenshot({ path: mobileNavPath })
    details.push({ section: 'dialogs', label: 'Mobile navigation sheet', output: relativeToReviewRoot(mobileNavPath) })
    await navDialog.getByRole('button', { name: 'Close menu' }).click()
    await navDialog.waitFor({ state: 'hidden', timeout: 5000 })
  } finally {
    assertObservedIsClean(mobileObserved)
    await mobileContext.close()
  }

  summary.detailShots = details
}

function renderMarkdownSummary(summary) {
  const lines = [
    '# Couple Book owner UI review',
    '',
    `Date: ${REVIEW_DATE_LABEL}`,
    '',
    `Verdict: ${summary.verdict}`,
    '',
    '## Verified scope',
    '',
    `- Preview login smoke: ${summary.previewSmoke.length} viewport(s) on ${PREVIEW_URL}`,
    `- Local protected routes: ${DEFAULT_ROUTE_SET.length} route(s) across ${VIEWPORTS.length} viewport(s)`,
    `- Theme review: ${THEME_REGISTRY.length} theme(s) across ${THEME_VIEWPORTS.length} viewport class(es)`,
    `- Detail surfaces: ${summary.detailShots.length} targeted screenshot(s)`,
    '',
    '## Verified defect and fix',
    '',
    '- Before this rerun, `/plans` was present in the app but absent from the browser, visual, product, and performance coverage matrices.',
    '- The coverage gap is now closed, and the dedicated owner-review evidence includes `/plans` in the route matrix.',
    '',
    '## Output files',
    '',
    `- JSON summary: ${relativeToReviewRoot(SUMMARY_JSON_PATH)}`,
    `- Contact sheet: ${relativeToReviewRoot(CONTACT_SHEET_PATH)}`,
    `- PDF report: ${relativeToReviewRoot(PDF_PATH)}`,
    '',
  ]
  return `${lines.join('\n')}\n`
}

function buildHtmlSection(title, entries) {
  if (!entries.length) return ''
  const figures = entries.map((entry) => {
    const imagePath = entry.output.startsWith('..') ? entry.output : `../${entry.output}`
    return [
      '<figure class="shot">',
      `  <img alt="${entry.label || entry.route || entry.viewport}" src="${imagePath}">`,
      `  <figcaption>${entry.label || `${entry.viewport} ${entry.route}`}</figcaption>`,
      '</figure>',
    ].join('\n')
  })

  return [
    '<section class="section">',
    `  <h2>${title}</h2>`,
    '  <div class="grid">',
    figures.map((figure) => `    ${figure.replace(/\n/g, '\n    ')}`).join('\n'),
    '  </div>',
    '</section>',
  ].join('\n')
}

async function writeContactSheet(summary) {
  const desktopShots = summary.defaultMatrix.filter((entry) => entry.viewport === 'desktop').map((entry) => ({ ...entry, label: `Desktop ${entry.route}` }))
  const tabletShots = summary.defaultMatrix.filter((entry) => entry.viewport === 'tablet').map((entry) => ({ ...entry, label: `Tablet ${entry.route}` }))
  const mobileShots = summary.defaultMatrix.filter((entry) => entry.viewport === 'mobile').map((entry) => ({ ...entry, label: `Mobile ${entry.route}` }))
  const previewShots = summary.previewSmoke.map((entry) => ({ ...entry, label: `Preview ${entry.viewport}` }))
  const themeShots = summary.themeMatrix.map((entry) => ({
    ...entry,
    label: `${entry.viewport} ${entry.themeName} ${entry.route}`,
  }))

  const html = [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <title>Couple Book owner UI review contact sheet</title>',
    '  <style>',
    '    :root { color-scheme: dark; }',
    '    body { margin: 0; font-family: Arial, sans-serif; background: #151317; color: #f4eced; }',
    '    main { padding: 32px; }',
    '    h1, h2 { margin: 0 0 16px; }',
    '    p { margin: 0 0 24px; color: #d5cad0; }',
    '    .section { margin-bottom: 40px; }',
    '    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }',
    '    .shot { margin: 0; background: #221822; border: 1px solid rgba(210, 124, 153, 0.2); border-radius: 8px; overflow: hidden; }',
    '    .shot img { display: block; width: 100%; height: auto; background: #0f0d12; }',
    '    .shot figcaption { padding: 10px 12px 14px; font-size: 13px; line-height: 1.4; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <main>',
    '    <h1>Couple Book owner UI review</h1>',
    `    <p>${REVIEW_DATE_LABEL}. Preview smoke, protected route matrices, theme coverage, and targeted detail captures.</p>`,
    buildHtmlSection('Preview smoke', previewShots),
    buildHtmlSection('Desktop route matrix', desktopShots),
    buildHtmlSection('Tablet route matrix', tabletShots),
    buildHtmlSection('Mobile route matrix', mobileShots),
    buildHtmlSection('Theme comparisons', themeShots),
    buildHtmlSection('Detail captures', summary.detailShots),
    '  </main>',
    '</body>',
    '</html>',
    '',
  ].join('\n')

  await fsp.writeFile(CONTACT_SHEET_PATH, html, 'utf8')
}

async function writeSummaryFiles(summary) {
  await fsp.writeFile(SUMMARY_JSON_PATH, JSON.stringify(summary, null, 2), 'utf8')
  await fsp.writeFile(SUMMARY_MD_PATH, renderMarkdownSummary(summary), 'utf8')
}

function buildPdfPages(summary) {
  const desktopDashboard = summary.defaultMatrix.find((entry) => entry.viewport === 'desktop' && entry.route === '/dashboard')
  const desktopGallery = summary.defaultMatrix.find((entry) => entry.viewport === 'desktop' && entry.route === '/gallery')
  const desktopPlans = summary.defaultMatrix.find((entry) => entry.viewport === 'desktop' && entry.route === '/plans')
  const desktopSettings = summary.defaultMatrix.find((entry) => entry.viewport === 'desktop' && entry.route === '/settings')
  const mobilePlans = summary.defaultMatrix.find((entry) => entry.viewport === 'mobile' && entry.route === '/plans')
  const tabletContract = summary.defaultMatrix.find((entry) => entry.viewport === 'tablet' && entry.route === '/contract')
  const previewDesktop = summary.previewSmoke.find((entry) => entry.viewport === 'desktop')
  const previewMobile = summary.previewSmoke.find((entry) => entry.viewport === 'mobile')

  const themeDashboardShots = THEME_REGISTRY.map((theme) => summary.themeMatrix.find((entry) => entry.viewport === 'desktop' && entry.route === '/dashboard' && entry.themeId === theme.id)).filter(Boolean)
  const themeSettingsShots = THEME_REGISTRY.map((theme) => summary.themeMatrix.find((entry) => entry.viewport === 'mobile' && entry.route === '/settings' && entry.themeId === theme.id)).filter(Boolean)

  return [
    {
      title: 'Preview smoke',
      subtitle: 'Signed-out preview channel confirmation',
      images: [previewDesktop, previewMobile].filter(Boolean),
    },
    {
      title: 'Protected route matrix',
      subtitle: 'Representative desktop and responsive routes',
      images: [desktopDashboard, desktopGallery, desktopPlans, desktopSettings].filter(Boolean),
    },
    {
      title: 'Responsive continuity',
      subtitle: 'Tablet and mobile route proof',
      images: [tabletContract, mobilePlans].filter(Boolean),
    },
    {
      title: 'Theme comparison',
      subtitle: 'Dashboard across Midnight Rose, Paper Hearts, and Moonlit',
      images: themeDashboardShots,
    },
    {
      title: 'Theme controls on mobile',
      subtitle: 'Settings route across all supported themes',
      images: themeSettingsShots,
    },
    {
      title: 'Detail surfaces',
      subtitle: 'Dialogs, forms, cards, and buttons',
      images: summary.detailShots.slice(0, 4),
    },
  ].map((section) => ({
    ...section,
    images: section.images.map((entry) => ({
      caption: entry.label || `${entry.viewport || ''} ${entry.route || ''}`.trim(),
      path: path.join(REVIEW_ROOT, entry.output),
    })),
  }))
}

function buildSummaryShape(baseUrl, issueNotes) {
  return {
    generatedAt: new Date().toISOString(),
    issueNotes,
    localBaseUrl: baseUrl,
    previewUrl: PREVIEW_URL,
    reviewDateLabel: REVIEW_DATE_LABEL,
    verdict: 'PASS',
    detailShots: [],
    previewSmoke: [],
    defaultMatrix: [],
    themeMatrix: [],
    pdfPath: relativeToReviewRoot(PDF_PATH),
    summaryMarkdown: relativeToReviewRoot(SUMMARY_MD_PATH),
    summaryJson: relativeToReviewRoot(SUMMARY_JSON_PATH),
    contactSheet: relativeToReviewRoot(CONTACT_SHEET_PATH),
  }
}

async function createPdf(summary) {
  const payloadPath = path.join(REVIEW_ROOT, 'owner-ui-review-pdf-payload.json')
  summary.pdfPages = buildPdfPages(summary)
  const payload = {
    pdfPath: PDF_PATH,
    reviewDateLabel: REVIEW_DATE_LABEL,
    summary,
  }
  await fsp.writeFile(payloadPath, JSON.stringify(payload, null, 2), 'utf8')
  execFileSync(PYTHON_COMMAND, [PYTHON_HELPER_PATH, payloadPath], {
    cwd: APP_ROOT,
    stdio: 'inherit',
  })
}

async function run() {
  await ensureOutputTree()
  const issueNotes = await writeIssueNotes()
  const { baseUrl, server } = await createLocalServer()
  const summary = buildSummaryShape(baseUrl, issueNotes)
  const browser = await launchBrowser()

  try {
    log(`Running Couple Book owner UI review against local ${baseUrl} and preview ${PREVIEW_URL}`)
    await capturePreviewSmoke(browser, summary)

    for (const viewport of VIEWPORTS) {
      const results = await captureViewportMatrix(browser, baseUrl, viewport, DEFAULT_THEME_ID)
      summary.defaultMatrix.push(...results)
    }

    summary.themeMatrix = await captureThemeShots(browser, baseUrl)
    await captureDetailShots(browser, baseUrl, summary)
    await writeContactSheet(summary)
    await createPdf(summary)
    await writeSummaryFiles(summary)
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
