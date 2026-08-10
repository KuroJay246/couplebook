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

## Reporting Standard

Always report:

- command run
- pass/fail result
- relevant failure output
- whether the check was local, emulator, or production
- whether production was read-only or mutated
