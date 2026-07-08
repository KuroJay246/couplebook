# Storage Initialization Decision

Date: 2026-07-08
Project: `couplebook-97830`
Current state: Firebase Storage is not initialized for this project. No Storage deploy, initialization, or media upload occurs in this phase.

## Why Storage Is Needed

Firebase Storage becomes necessary only when the app is ready to serve private couple media across devices without keeping those files inside Git or `public/`.

It would solve these current limitations:

- local-only photos, videos, and audio do not sync across devices
- special-page companion media cannot be referenced safely from Hosting today
- raw private media must remain outside Git and outside the deploy path
- future media metadata and access control need a private backend instead of ad hoc local paths

## What Problems Storage Solves

- private media delivery without publishing repo-root or local folders
- owner/approved-user access control for uploaded media
- a clean separation between app shell code and private assets
- support for future Firestore metadata documents that reference media by path instead of local file location

## What Risks Storage Introduces

- accidental upload of private media before path/rules/metadata decisions are finalized
- bucket misconfiguration or rule mistakes exposing private media
- cost growth if large videos are uploaded without limits or lifecycle planning
- duplicate uploads or orphaned media if upload order and metadata linkage are not defined first
- future operational burden around cleanup, naming, and migration validation

## Cost And Storage Considerations

- Storage should be enabled only when there is a real need for cross-device private media access
- videos are the main cost and bandwidth risk
- uploads should later be staged in a controlled order, with validation after each batch
- large raw source backups should remain local-only even after Storage is enabled
- the project should decide later whether downscaled copies or selected media only are enough, instead of uploading every raw file by default

## Privacy Requirements Before Initialization

- the approved-user model must remain strict and limited to the two approved Firebase Auth accounts
- Storage rules must stay private-by-default and delete-blocked until a deliberate cleanup workflow exists
- no public read paths
- no anonymous upload path
- no legacy local folder exposure through Hosting
- no repo-tracked media reintroduction

## What Must Be True Before Enabling Storage

1. Approved-account live smoke has passed for both couple accounts.
2. The Firestore/service-layer cleanup has a clear owner for future media metadata access.
3. The target bucket paths are agreed and documented.
4. The upload order is agreed so the smallest and safest categories go first.
5. The “never upload” exclusions are agreed before any import begins.
6. A tester can verify uploaded media from both approved accounts without giving Codex credentials.
7. Backup/local raw media remains preserved outside the repo regardless of Storage enablement.

## Approval Checklist Before Enabling Storage

- Approved-account smoke result is `PASS`
- `npm run check:all` passes
- `public/` is still media-clean
- Storage rules draft is reviewed again against the real bucket path plan
- No private media is newly tracked by Git
- Upload candidate folders are explicitly chosen, not broad wildcard folders
- Human reviewer confirms which files are allowed to leave local-only storage

## Rollback / No-Go Conditions

Stop and do not initialize Storage if:

- approved-account smoke is still incomplete
- any `permission-denied` mismatch still exists in normal approved-user flows
- the migration path map is still ambiguous
- any step would require uploading raw backup libraries blindly
- any Storage rule review suggests public or over-broad access
- `public/` is no longer clean
- a Git/media safety check fails

## Decision Status

Current decision: hold.

Storage should remain future-only until the approved-account smoke is completed and a deliberate first-upload scope is approved.
