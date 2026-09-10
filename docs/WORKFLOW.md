# Workflow

## Local Development

Use the app-v2 workflow for current work:

```powershell
npm run app:v2:dev
```

Equivalent direct command:

```powershell
npm --prefix app-v2 run dev
```

## Standard Checks

```powershell
npm run docs:check
npm run alignment:check
npm --prefix app-v2 run lint
npm --prefix app-v2 test
npm --prefix app-v2 run test:rules
npm --prefix app-v2 run build
```

## Product QA

```powershell
npm run product:qa
```

This runs the docs guard, app lint, Node tests, Firestore rules tests, production build, and browser regression check.

## Full Local Audit

```powershell
npm run product:audit
```

This runs product QA plus Storage rules tests, media mapping tests, product interaction checks, performance checks, and visual regression checks.

## Release Boundary

`npm run release:preflight` verifies the Firebase project guard and current docs. It does not deploy. Deployment requires a separate explicit user approval.

Approved deployment commands must name the target project:

```powershell
firebase deploy --only hosting --project couplebook-97830
```

Deploy Firestore rules only when `firestore.rules` changed, rules tests passed, and the deployment was explicitly approved:

```powershell
firebase deploy --only firestore:rules --project couplebook-97830
```

Before and after a rules-only deployment, check deployed-rule drift:

```powershell
npm run rules:drift
```

If this reports missing media-index coverage, Album cannot read `couples/{coupleId}/mediaItems` in production even when local emulator rules pass. The fix is an explicitly approved Firestore rules-only deployment, not a frontend fallback or a weakened rule.

For the broader Drive media backend boundary, run:

```powershell
npm run media:backend:readiness
```

This is a read-only gate. A nonzero result is expected until both the live Firestore rules include media-index coverage and the owner approves a trusted backend deployment plan for persistent Drive OAuth, Drive Changes processing, thumbnails, streaming, and partner uploads. The command must not print `.env` values or OAuth credentials.

Do not use generic `firebase deploy` for normal Couple Book releases. Roll back Hosting from the Firebase Hosting release history for `couplebook-97830` to the last verified good version.

## V1.2 Preview Workflow

V1.2 app-experience work may deploy Hosting preview channels only:

```powershell
npx -y firebase-tools@latest hosting:channel:deploy v1-2-app-experience --project couplebook-97830 --expires 14d
```

Do not deploy V1.2 Hosting live or Firestore rules live until owner review explicitly approves that release step.

## Distinct Identity Update

For `design/couplebook-distinct-product-identity`, add:

```powershell
npm run eventhub:review
npm run identity:check
firebase hosting:channel:deploy couplebook-distinct-identity --project couplebook-97830
```
