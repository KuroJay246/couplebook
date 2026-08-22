# Release And Deployment

Last updated: 2026-08-22

## Current Release Mode

The distinct-product-identity branch is preview-only until owner review approves a production release.

## Required Local Gates

Run:

```powershell
npm run eventhub:review
npm run docs:check
npm run alignment:check
npm run identity:check
npm --prefix app-v2 run lint
npm --prefix app-v2 test
npm --prefix app-v2 run test:rules
npm --prefix app-v2 run test:storage-rules
npm --prefix app-v2 run test:media-mapping
npm --prefix app-v2 run test:media-workflows
npm --prefix app-v2 run build
npm --prefix app-v2 run test:browser
npm --prefix app-v2 run test:product
npm --prefix app-v2 run test:visual
npm --prefix app-v2 run test:performance
npm --prefix app-v2 run health:react
npm run product:qa
npm run product:audit
npm run release:preflight
npm run check:all
git diff --check
```

## Preview Deploy

```powershell
firebase hosting:channel:deploy couplebook-distinct-identity --project couplebook-97830
```

## Evidence Boundary

Evidence belongs outside the repo under `C:\Users\Jaylan\Documents\couplebook.visual-review\distinct-product-identity\`.
