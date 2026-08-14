# Docs Index

Date: 2026-07-12

## Master Docs

| File | What it contains |
| --- | --- |
| `PROJECT_STATUS_AND_PHASES.md` | repo status, smoke status, deploy status, gates, workstream phase model, recent phase summaries, next queue |
| `FIREBASE_SYNC_AND_SERVICE_LAYER.md` | Firestore surface, service-layer status, sync boundary, sync replacement plan, sync testing, remaining Firestore risks |
| `UI_REDESIGN_AND_PROTOTYPE_MASTER.md` | redesign direction, shell blueprint, component map, prototype rules, production implementation checklist, live redesign batches |
| `MEMORY_MEDIA_AND_STORAGE_MASTER.md` | memory dataset state, future memory/gallery/favorites model, storage decision, media migration plan, curation checklist |
| `QA_AUTOMATION.md` | all QA scripts, failure meanings, manual gaps, long-run safety support |

The 2026-07-12 recovery audit baseline, migration recommendation, verified auth/runtime risks, and media-boundary findings are now folded back into these same master docs instead of being split into new audit files.

## Standalone Docs Kept On Purpose

| File | Why it remains standalone |
| --- | --- |
| `APPROVED_ACCOUNT_SMOKE_STATUS.md` | live gate record that changes independently of broader handbook docs |
| `APPROVED_ACCOUNT_SMOKE_RUNBOOK.md` | human test procedure to copy/paste and execute directly |
| `APPROVED_ACCOUNT_SMOKE_RESULTS_TEMPLATE.md` | fill-in template for real smoke evidence |
| `PROJECT_CLEANUP_NOTES.md` | privacy and Git/media cleanup history worth keeping distinct |
| `firestore.rules.audit.local.md` | specific local rules audit reference |
| `prototypes/couplebook-shell/README.md` | local boundary notice for the non-live prototype folder |

## Consolidated Legacy Docs

| Old file | Topic | Action | Target master doc |
| --- | --- | --- | --- |
| `SYSTEM_HEALTH_AUDIT.md` | repo/runtime health | archive | `PROJECT_STATUS_AND_PHASES.md` |
| `SERVICE_LAYER_MIGRATION_STATUS.md` | sync/service status | archive | `FIREBASE_SYNC_AND_SERVICE_LAYER.md` |
| `FIRESTORE_SERVICE_LAYER_INVENTORY.md` | Firestore inventory | archive | `FIREBASE_SYNC_AND_SERVICE_LAYER.md` |
| `FIRESTORE_SERVICE_LAYER_PLAN.md` | service plan | archive | `FIREBASE_SYNC_AND_SERVICE_LAYER.md` |
| `FIRESTORE_SYNC_BOUNDARY_MAP.md` | sync boundary | archive | `FIREBASE_SYNC_AND_SERVICE_LAYER.md` |
| `FIRESTORE_SYNC_REPLACEMENT_DESIGN.md` | sync replacement design | archive | `FIREBASE_SYNC_AND_SERVICE_LAYER.md` |
| `FIRESTORE_SYNC_TEST_PLAN.md` | sync test plan | archive | `FIREBASE_SYNC_AND_SERVICE_LAYER.md` |
| `COUPLEBOOK_REDESIGN_MASTER_PLAN.md` | redesign roadmap | archive | `UI_REDESIGN_AND_PROTOTYPE_MASTER.md` |
| `PROTECTED_SHELL_BLUEPRINT.md` | shell blueprint | archive | `UI_REDESIGN_AND_PROTOTYPE_MASTER.md` |
| `COUPLEBOOK_DESIGN_SYSTEM_BLUEPRINT.md` | design system | archive | `UI_REDESIGN_AND_PROTOTYPE_MASTER.md` |
| `COUPLEBOOK_COMPONENT_MAP.md` | component map | archive | `UI_REDESIGN_AND_PROTOTYPE_MASTER.md` |
| `PRODUCTION_SHELL_IMPLEMENTATION_CHECKLIST.md` | production shell checklist | archive | `UI_REDESIGN_AND_PROTOTYPE_MASTER.md` |
| `LIVE_UI_REDESIGN_PHASE_PLAN.md` | live UI redesign batches | archive | `UI_REDESIGN_AND_PROTOTYPE_MASTER.md` |
| `COUPLEBOOK_FULL_PRODUCT_AUDIT.md` | product audit | archive | `UI_REDESIGN_AND_PROTOTYPE_MASTER.md` |
| `COUPLEBOOK_IMPLEMENTATION_QUEUE.md` | implementation queue | archive | `PROJECT_STATUS_AND_PHASES.md` |
| `MEMORY_DOMAIN_MODEL_PLAN.md` | future memory model | archive | `MEMORY_MEDIA_AND_STORAGE_MASTER.md` |
| `MEMORY_CONTENT_CURATION_CHECKLIST.md` | curation checklist | archive | `MEMORY_MEDIA_AND_STORAGE_MASTER.md` |
| `MEDIA_MIGRATION_PLAN.md` | media migration | archive | `MEMORY_MEDIA_AND_STORAGE_MASTER.md` |
| `STORAGE_INITIALIZATION_DECISION.md` | storage decision | archive | `MEMORY_MEDIA_AND_STORAGE_MASTER.md` |
| `PHASE_8_AUTOMATION_CLOSEOUT.md` | phase summary | archive | `PROJECT_STATUS_AND_PHASES.md` |
| `PHASE_9_AUTOMATION_CLOSEOUT.md` | phase summary | archive | `PROJECT_STATUS_AND_PHASES.md` |
| `NEXT_LONG_CODEX_RUN_PHASE_10.md` | next run prompt | keep and update | standalone next-run prompt |

## Other Docs Archived As Historical / Superseded

These are no longer primary reading surfaces after consolidation and should live under `docs/archive/`:

- `APPROVED_ACCOUNT_SMOKE_CHECKLIST.md`
- `COUPLEBOOK_REFACTOR_READINESS.md`
- `COUPLEBOOK_VS_GATHER_SAVOR_GAP_ANALYSIS.md`
- `FIRESTORE_RULES_DEPLOYMENT_CLOSEOUT.md`
- `NEXT_1_HOUR_CODEX_RUN.md`
- `NEXT_CODEX_PHASES.md`
- `project_audit.md`

## Reading Order For The Human Owner

1. `PROJECT_STATUS_AND_PHASES.md`
2. `FIREBASE_SYNC_AND_SERVICE_LAYER.md`
3. `UI_REDESIGN_AND_PROTOTYPE_MASTER.md`
4. `MEMORY_MEDIA_AND_STORAGE_MASTER.md`
5. `QA_AUTOMATION.md`

Use the standalone smoke docs only when preparing or recording real approved-account smoke.

## app-v2 Version 0.99 Release Candidate - 2026-07-21

Release-candidate updates were added to:

- `PROJECT_STATUS_AND_PHASES.md`
- `UI_REDESIGN_AND_PROTOTYPE_MASTER.md`
- `FIREBASE_SYNC_AND_SERVICE_LAYER.md`
- `MEMORY_MEDIA_AND_STORAGE_MASTER.md`
- `QA_AUTOMATION.md`

## Couple Book Version 1.0 - Admin Surprise Mode Released - 2026-07-22

The final Version 1.0 release record is recorded in `PROJECT_STATUS_AND_PHASES.md`.

Release facts:

- Production URL: https://couplebook-97830.web.app
- Release commit: `7f739b07b3854186b3381ed73162ea1a05aae398`
- Release tag: `couplebook-v1.0-admin-surprise`
- Hosting release: `projects/couplebook-97830/sites/couplebook-97830/channels/live/releases/1784691939089000`
- Jaylan live authentication, protected routes, direct reload, sign-out, and browser-storage spoof protection passed.
- Firestore migration and production rules are complete.
- Partner remains pending.
- Static rollback is preserved.
- Firebase Storage/private media remains deferred.
