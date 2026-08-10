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
