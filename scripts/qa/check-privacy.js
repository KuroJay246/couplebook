const { chromium } = require('playwright');
const { fail, log, withServer } = require('./lib');

const BASE_URL = 'http://127.0.0.1:3000';
const SPOOFED_SESSION = {
  memorybook_active_session: 'Jaylan',
  memorybook_active_user: 'Jaylan',
  memorybook_active_uid: 'spoofed-local-only'
};

const SPECIAL_ROUTE_EXPECTATIONS = [
  {
    route: '/confession',
    forbiddenText: ['For Mara', 'Can I be your boyfriend?', 'Omia']
  },
  {
    route: '/valentine',
    forbiddenText: ['Will you be my Valentine?', 'No is not an option ml', 'Omia']
  },
  {
    route: '/birthday',
    forbiddenText: ['Happy Birthday Omia', 'With all my heart', 'Omia']
  }
];

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function openWithStorage(browser, route, storageState = null) {
  const context = await browser.newContext();
  const page = await context.newPage();

  if (storageState) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.evaluate((entries) => {
      localStorage.clear();
      for (const [key, value] of Object.entries(entries)) {
        localStorage.setItem(key, value);
      }
    }, storageState);
  }

  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
  return { context, page };
}

async function assertSignedOutContractRedirect(browser) {
  const { context, page } = await openWithStorage(browser, '/contract');
  try {
    expect(page.url().endsWith('/login'), 'Signed-out contract access should redirect to login.');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.includes('Sign in'), 'Signed-out contract access should land on the login screen.');
    log('Privacy OK: signed-out contract access redirects to login.');
  } finally {
    await context.close();
  }
}

async function assertSpoofedContractRedirect(browser) {
  const { context, page } = await openWithStorage(browser, '/contract', SPOOFED_SESSION);
  try {
    expect(page.url().endsWith('/login'), 'Spoofed localStorage must not unlock contract access.');
    const bodyText = await page.locator('body').innerText();
    expect(!bodyText.includes('Initialize MemoryBook'), 'Contract wizard should not render for spoofed localStorage.');
    log('Privacy OK: spoofed localStorage does not unlock the contract.');
  } finally {
    await context.close();
  }
}

async function assertSpecialRouteBlocked(browser, route, forbiddenText, storageState = null) {
  const { context, page } = await openWithStorage(browser, route, storageState);
  try {
    const title = await page.title();
    const bodyText = await page.locator('body').innerText();

    expect(title.includes('Couple Book') || title.includes('Vite'), `${route} should keep the app shell title.`);
    expect(page.url().endsWith('/login'), `${route} should fail closed for signed-out access.`);

    for (const text of forbiddenText) {
      expect(!bodyText.includes(text), `${route} leaked retired sensitive text: ${text}`);
    }
  } finally {
    await context.close();
  }
}

async function assertLegacyWrapperRedirect(browser) {
  const { context, page } = await openWithStorage(
    browser,
    '/confession',
    SPOOFED_SESSION
  );
  try {
    expect(page.url().endsWith('/login'), 'Spoofed localStorage must not unlock protected routes.');
    log('Privacy OK: spoofed localStorage does not unlock protected routes.');
  } finally {
    await context.close();
  }
}

async function maybeCheckAuthorizedPath(browser) {
  const email = process.env.MEMORYBOOK_TEST_EMAIL;
  const password = process.env.MEMORYBOOK_TEST_PASSWORD;

  if (!email || !password) {
    log('Privacy note: approved-user special-route path was not exercised because no safe local test credentials were provided.');
    return;
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByLabel('Account Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForLoadState('networkidle');
    await page.goto(`${BASE_URL}/confession`, { waitUntil: 'networkidle' });

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.includes('Private Moment Temporarily Unavailable'), 'Authorized path should show the protected placeholder state.');
    log('Privacy OK: approved-user placeholder path verified with provided local credentials.');
  } finally {
    await context.close();
  }
}

async function run() {
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    fail(`Privacy check failed to launch Chromium: ${error.message}`);
    process.exit(1);
    return;
  }

  try {
    await assertSignedOutContractRedirect(browser);
    await assertSpoofedContractRedirect(browser);

    for (const expectation of SPECIAL_ROUTE_EXPECTATIONS) {
      await assertSpecialRouteBlocked(browser, expectation.route, expectation.forbiddenText);
      await assertSpecialRouteBlocked(browser, expectation.route, expectation.forbiddenText, SPOOFED_SESSION);
      log(`Privacy OK: ${expectation.route} exposes only the neutral placeholder.`);
    }

    await assertLegacyWrapperRedirect(browser);
    await maybeCheckAuthorizedPath(browser);
    log('Privacy check passed.');
  } finally {
    await browser.close();
  }
}

withServer(() => run()).catch((error) => {
  fail(`Privacy check crashed: ${error.message}`);
  process.exit(1);
});
