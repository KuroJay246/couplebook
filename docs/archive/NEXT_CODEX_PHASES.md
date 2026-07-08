# Next Codex Phases

Date: 2026-07-08
Scope: practical next 3-phase batches for Couple Book after the audit/compare/plan work

## Batch 1

```text
/goal

Continue the private couple memory book project.

Close the approved-account smoke gate and preserve a verified live baseline before architecture or redesign work begins.

/context

Current state:

* Couple Book audit, Gather Savor comparison, and redesign master plan are complete.
* The app remains a static multi-page HTML/CSS/JS app with runtime under public/.
* Live Firestore rules are strict and approved-user-only.
* Hosting publishes only public/.
* Private media remains local-only.
* Approved-account smoke is still pending and is the main remaining live-verification gap.

/rules

Do not redesign the UI yet.
Do not refactor architecture yet unless a smoke blocker requires a minimal safe fix and you stop to report first.
Do not deploy Hosting.
Do not deploy Storage.
Do not deploy Firestore indexes.
Do not move media to Firebase Storage.
Do not add private media.
Do not commit credentials, tokens, passwords, or session exports.

/phases

Phase A:
- Run `npm run check:all`
- Confirm repo status is clean
- Review `APPROVED_ACCOUNT_SMOKE_CHECKLIST.md` and `APPROVED_ACCOUNT_SMOKE_RUNBOOK.md`
- Prepare a results file template or status artifact if needed, but do not invent fake results

Phase B:
- Use a real browser session only if approved-account credentials/session are available to the human operator
- Smoke the Jaylan approved account:
  - login
  - dashboard
  - timeline
  - media
  - profile
  - favorites
  - settings
  - watch for `permission-denied`
- Smoke the partner approved account with the same checks if credentials/session are available
- Verify blocked behavior:
  - guest access blocked
  - signup hidden/disabled
  - username login disabled
  - destructive browser admin tools disabled

Phase C:
- If both approved accounts pass, create/update a real smoke status artifact
- Run `npm run check:all` again
- Commit only the smoke-result documentation artifacts
- Push only if the smoke result is honestly recorded and checks pass

/stop_conditions

Stop if:

* either approved account gets `permission-denied`
* credentials are not available and no saved authenticated session exists
* guest access enters the app
* signup or username login reappears
* destructive browser admin tools become active again

/final_report

Report:

* whether Jaylan was tested
* whether partner was tested
* whether smoke passed, held, or was blocked by missing credentials
* whether blocked behavior stayed correct
* files changed
* commit hash and push status if any
```

## Batch 2

```text
/goal

Continue the private couple memory book project.

Build the first safe service-layer foundation and reduce direct Firestore coupling without changing the product UI.

/context

Current state:

* The redesign master plan recommends service/sync cleanup before major UI rebuild.
* `core/firestoreSync.js` remains the biggest architecture risk.
* Root/public duplication still exists and must remain aligned.
* The app is still localStorage-first and must stay stable.

/rules

Do not redesign the UI.
Do not migrate to React/Vite yet.
Do not broaden Firestore permissions.
Do not change Firebase Hosting.
Do not deploy.
Do not touch private media.
Mirror any runtime-safe source changes between root and public if both trees still require it.

/phases

Phase A:
- Inspect current Firebase-touching modules:
  - `firebase/firebase-config.js`
  - `js/auth.js`
  - `js/settings.js`
  - `core/firestoreSync.js`
  - `core/healthCheck.js`
  - public mirrors where applicable
- Produce or update a concrete touch-point inventory if needed

Phase B:
- Introduce a thin shared Firebase client/service wrapper layer only
- Start with read-oriented helpers for:
  - current user doc
  - devices
  - safe diagnostics/status reads
- Do not change user-facing behavior

Phase C:
- Repoint the smallest safe call sites first, such as diagnostics/auth verification/settings reads
- Run `npm run check:all`
- If checks pass, commit only the service-layer foundation files and exact mirrored runtime changes
- Push only after verification

/stop_conditions

Stop if:

* route checks fail
* rules checks fail
* any change broadens reads/writes
* root/public parity becomes unclear
* approved-user auth flow regresses

/final_report

Report:

* files changed
* which Firestore touch points were centralized
* whether `core/firestoreSync.js` was reduced or only prepared
* route/rules/public safety results
* commit hash and push status
```

## Batch 3

```text
/goal

Continue the private couple memory book project.

Create the future protected shell blueprint and product-domain map so redesign work is constrained before implementation.

/context

Current state:

* Audits and master plan are complete.
* The next design risk is page-by-page redesign without a shell/system blueprint.
* Special pages are emotionally strongest but structurally isolated.

/rules

Do not do the visual redesign yet.
Do not migrate frameworks yet unless the batch explicitly becomes planning-only for migration.
Do not deploy.
Do not touch private media.
Do not change Firestore rules.

/phases

Phase A:
- Inspect current nav, page, and special-page entry points
- Map current page roles and overlap
- Define future shell zones:
  - primary nav
  - page header
  - story/home hero
  - private health/status area
  - special-page access model

Phase B:
- Create a concrete future page/component/domain map
- Define which current features become:
  - preserved domain
  - redesigned domain
  - deferred domain
- Define how birthday, Valentine’s, and confession fit the future architecture

Phase C:
- Write a shell blueprint artifact and a UI-system readiness artifact
- Run `npm run check:all`
- Commit only the planning docs
- Push after checks pass

/stop_conditions

Stop if:

* the work starts turning into actual runtime redesign instead of blueprinting
* any app files change unintentionally
* checks fail

/final_report

Report:

* blueprint files created
* future shell decision
* special-page integration strategy
* what remains blocked on approved-account smoke or service cleanup
* commit hash and push status
```

## Recommended Order

1. Batch 1 first if real approved-account testing can be performed now
2. Batch 2 next to reduce architecture risk
3. Batch 3 after the service foundation is clearer

## Why This Order

- It closes the live-auth uncertainty before deeper changes
- It reduces data/sync fragility before any redesign work
- It prevents a visual overhaul from landing on top of the current weakest structure
