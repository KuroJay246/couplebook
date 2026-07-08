# Next Long Codex Run: Phase 10

Use this as the ready-to-paste prompt for the next long autonomous run.

```text
Continue the private Couple Book project with the next long autonomous run.

Run up to 60 minutes maximum.

Primary priorities:
1. Close the approved-account smoke gate if a real authenticated browser session or human-entered credentials are available.
2. Only if approved-account smoke passes, implement the smallest safe document-scoped live sync read replacement.
3. If smoke is still unavailable, continue with non-live UI implementation planning, mirror safety, and QA improvements only.

Do not deploy Hosting.
Do not deploy Firestore rules.
Do not deploy Storage.
Do not deploy indexes.
Do not initialize Firebase Storage.
Do not add private media.
Do not move media.
Do not rewrite Git history.
Do not modify Gather Savor.
Do not change the UID allowlist.
Do not broaden Firestore permissions.
Do not replace the live UI shell unless explicitly approved in a later batch.

Phase 10A:
- confirm repo clean and main matches origin/main
- run npm run check:all
- review APPROVED_ACCOUNT_SMOKE_STATUS.md and APPROVED_ACCOUNT_SMOKE_RUNBOOK.md
- if a real approved authenticated browser session is available, run Jaylan and partner smoke honestly
- update smoke docs only with real observed evidence
- run npm run check:all
- commit/push only if smoke docs changed

Phase 10B:
- proceed only if approved-account smoke passes
- replace only the active-user collection read branch in core/firestoreSync.js using the documented sync helpers
- keep listener and write branches unchanged unless separately approved
- keep root/public mirrors aligned
- run npm run check:all
- commit/push if safe

Phase 10C:
- if smoke is still HOLD, or after 10B if time remains, continue low-risk docs/QA/planning work only
- no live UI replacement
- no deploy
- no Storage
- run npm run check:all before each commit

Stop immediately if:
- approved-account smoke fails
- permission-denied appears during approved flow
- npm run check:all fails and cannot be fixed safely
- private media appears in tracked files or public/
- a live sync change broadens behavior or becomes hard to revert

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
