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

Do not use generic `firebase deploy` for normal Couple Book releases. Roll back Hosting from the Firebase Hosting release history for `couplebook-97830` to the last verified good version.

## V1.2 Preview Workflow

V1.2 app-experience work may deploy Hosting preview channels only:

```powershell
npx -y firebase-tools@latest hosting:channel:deploy v1-2-app-experience --project couplebook-97830 --expires 14d
```

Do not deploy V1.2 Hosting live or Firestore rules live until owner review explicitly approves that release step.
