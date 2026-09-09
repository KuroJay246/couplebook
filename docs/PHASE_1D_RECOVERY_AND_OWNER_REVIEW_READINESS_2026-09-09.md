# Couple Book Phase 1D Recovery And Owner Review Readiness

Date: 2026-09-09

Branch: `feature/couplebook-web-mobile-unified-system`

Firebase project boundary: `couplebook-97830`

## Current Recovery Model

Couple Book treats Firestore metadata and Google Drive originals as separate sources of truth.

| Area | Source of truth | Back up | Verify | Restore |
| --- | --- | --- | --- | --- |
| Couple membership | Firestore `couples/{coupleId}/members/{uid}` and approved `users/{uid}` records | Firestore export or redacted JSON backup from the existing backup tooling | Rules emulator permission matrix and targeted owner account smoke | Restore into a staging/emulator project first, then apply targeted document restore only after review |
| Memories and plans | Firestore couple-scoped documents | Firestore export or redacted backup package | Read-model tests, browser product workflow, revision checks | Restore documents by couple path; never rename/delete production collections during recovery |
| Media metadata | Firestore memory media fields using stable provider IDs | Include stable `driveFileId`, provider, MIME type, dimensions/duration if known, created timestamps, captions, and revision | Confirm no object URLs, OAuth tokens, signed URLs, or raw local paths are present | Rehydrate metadata from backup and relink against Drive IDs |
| Original photos/videos | Google Drive folder `17Ar4UK5_puORz9TE1dijIk2-qHgh7oIa` | Google Drive folder copy/export owned by `jaylanspencer99@gmail.com` | Compare manifest counts, file IDs, MIME types, and checksums where available | Restore files to Drive, keep old file IDs when possible, otherwise update Firestore through a reviewed metadata migration |
| Special moments | App source plus fixed Firestore special-moment content records when present | Git plus Firestore special-moment metadata/content backup | Runtime route review for Birthday, Valentine, Confession | Restore source from Git and content from the couple-scoped backup |
| Audit events | Firestore `couples/{coupleId}/auditEvents/{auditId}` | Firestore export/redacted backup | Ensure append-only, privacy-minimal schema | Restore append-only records only when needed for investigation continuity |

## Zero-Cost Backup Procedure

1. Run the existing local backup tooling from `app-v2` with production credentials only when explicitly authorized by the owner:

   ```powershell
   npm run production:backup
   ```

2. Store generated backup packages outside web assets and outside commits.

3. Review the backup report for redaction failures before sharing or committing any release evidence.

4. Export or copy the canonical Drive folder from the owner Google account. Keep the folder ID and file IDs in the private recovery notes.

5. Test restore only against Firebase emulators or a staging project. Do not restore directly into production as a first step.

## Restore Drill

Use this order for a no-damage restore test:

1. Start Firebase emulators for Auth, Firestore, and Storage with `firebase.app-v2.json`.
2. Seed the approved test couple and members.
3. Import redacted Firestore metadata into emulator paths.
4. Rebuild read models through the app-v2 Firestore source mode.
5. Verify Home, Story, Album, Plans, Us, Settings, and Special Moments against emulator data.
6. Verify Drive metadata references without opening or persisting temporary Drive preview URLs.
7. Run rules, storage rules, media workflow, browser, product, visual, performance, lint, build, and React Doctor gates.

## Rollback Procedure

Rollback is document-scoped:

1. Identify the bad release commit and the affected Firestore document paths.
2. Stop further preview or owner-review changes.
3. Restore Git to the last reviewed feature checkpoint in a new branch or worktree.
4. Restore only affected Firestore documents from backup after emulator rehearsal.
5. Leave audit events append-only; add a new remediation event rather than rewriting history.
6. Re-run the permission matrix and affected product workflow before owner review resumes.

## Known Readiness Gaps

- Real Google OAuth cannot be proven until the Google Cloud OAuth client has the exact local or preview origins registered.
- `http://127.0.0.1:5173` and `http://localhost:5173` are different OAuth origins. Register both for local review if both browser forms will be used.
- App Check is not initialized in app-v2. Do not claim App Check enforcement until a reviewed site key, localhost/debug-token behavior, preview behavior, and rollout plan are in place.
- Firebase Hosting has basic low-risk security headers in `firebase.json`; CSP remains a separate hardening task because an incorrect policy can break Firebase Auth or Google Drive OAuth.

