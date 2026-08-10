# QA

## Primary Commands

- `npm run docs:check`
- `npm --prefix app-v2 run lint`
- `npm --prefix app-v2 test`
- `npm --prefix app-v2 run test:rules`
- `npm --prefix app-v2 run test:storage-rules`
- `npm --prefix app-v2 run test:media-mapping`
- `npm --prefix app-v2 run build`
- `npm --prefix app-v2 run test:browser`
- `npm run product:qa`
- `npm run product:audit`

## Rules Coverage

Firestore rules tests run against `firestore.rules`.

Storage rules tests run against `storage.app-v2.rules`.

Rules coverage includes signed-out denial, active-member access, pending and inactive denial, cross-couple denial, private settings boundaries, schema validation, revision conflicts, contract acceptance preservation, and blocked raw/private media paths.

## Browser Coverage

Browser checks are local app-v2 checks. Authenticated production browser checks require explicit authorization and a signed-in session.

Automated browser checks use fixture-based auth through `window.__COUPLEBOOK_BROWSER_TEST__`. They must not commit Playwright auth-state files, passwords, browser profiles, traces, videos, or private screenshots. Manual real-owner acceptance is separate from fixture-based automation and must be reported as manual, read-only or write-authorized, and production or local.

The current local browser scripts use Chromium through Playwright. Cross-browser support is available through Playwright dependencies, but Firefox and WebKit are not part of the default fast QA command.

## Reporting Standard

Always report:

- command run
- pass/fail result
- relevant failure output
- whether the check was local, emulator, or production
- whether production was read-only or mutated
