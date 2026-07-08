# Next 1 Hour Codex Run

Use this as the next long-run prompt skeleton.

```text
Continue the private Couple Book project.

Run up to 60 minutes maximum.

Goal:
Convert approved-account smoke from HOLD to a real verified result if credentials/session are available, then continue the safest next architecture step only if smoke passes.

Do not redesign production pages yet.
Do not deploy Hosting.
Do not deploy Storage.
Do not deploy indexes.
Do not initialize Firebase Storage.
Do not add private media.
Do not touch Gather Savor.
Do not broaden Firestore permissions.
Do not change UID allowlist.
Do not continue past the approved phases if smoke fails.

Phase 1:
- confirm repo clean and main matches origin/main
- run npm run check:all
- review APPROVED_ACCOUNT_SMOKE_STATUS.md and APPROVED_ACCOUNT_SMOKE_RUNBOOK.md
- if an authenticated browser session is available, test Jaylan approved flow and partner approved flow honestly
- update APPROVED_ACCOUNT_SMOKE_STATUS.md only with real observed results
- run npm run check:all
- commit and push only if the smoke status file changed

Phase 2:
- only if approved-account smoke passes
- replace one small document-scoped read/listener branch inside core/firestoreSync.js using the Phase 8 boundary map and syncReadService helpers
- keep behavior minimal and mirrored between root and public
- no writes/deletes expansion
- run npm run check:all
- commit and push if safe

Phase 3:
- update closeout docs with what changed, what remains risky, and the next queue
- run npm run check:all
- commit and push docs only if changed

Stop immediately if:
- approved-account smoke fails
- npm run check:all fails and cannot be fixed safely
- private media appears in tracked files or public/
- a change would broaden auth/rules/privacy boundaries
- firestoreSync replacement is no longer clearly behavior-identical

Final report must include:
- total runtime used
- starting commit
- ending commit
- smoke status PASS/HOLD/FAIL
- whether Jaylan was actually tested
- whether partner was actually tested
- files changed
- commit hashes and push status
- whether repo is clean
- whether main matches origin/main
- remaining risks
```
