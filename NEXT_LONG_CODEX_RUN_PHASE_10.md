# Next Long Codex Run: Phase 10

Use this as the ready-to-paste prompt for the next long autonomous run.

```text
Continue the private Couple Book project with the next long autonomous run using the workstream model.

Run up to 60 minutes maximum.

Primary priorities by track:
1. Phase 9 track: keep QA/runtime/docs safety clean and close the approved-account smoke gate if a real authenticated browser session or human-entered credentials are available.
2. Phase 10 track: only if approved-account smoke passes, implement the smallest safe document-scoped live sync read replacement.
3. Phase 11 track: if smoke is still unavailable, continue with non-live UI implementation planning and checklist refinement only.

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

Phase 9A:
- confirm repo clean and main matches origin/main
- run npm run check:all
- review APPROVED_ACCOUNT_SMOKE_STATUS.md and APPROVED_ACCOUNT_SMOKE_RUNBOOK.md
- if a real approved authenticated browser session is available, run Jaylan and partner smoke honestly
- update smoke docs only with real observed evidence
- run npm run check:all
- commit/push only if smoke docs changed

Phase 10A:
- proceed only if approved-account smoke passes
- replace only the active-user collection read branch in core/firestoreSync.js using the documented sync helpers
- keep listener and write branches unchanged unless separately approved
- keep root/public mirrors aligned
- run npm run check:all
- commit/push if safe

Phase 11A:
- if smoke is still HOLD, or after Phase 10A if time remains, continue low-risk UI planning only
- no live UI replacement
- no deploy
- no Storage
- keep work inside master docs when possible

Parallel rule:
- Phase 9 may run beside Phase 10 or Phase 11 only when it is not reporting a serious safety/runtime failure.
- If Phase 9 finds a serious safety/runtime failure, pause Phase 10 and Phase 11 until fixed.

Final report should be grouped by track:
- Phase 9 track
- Phase 10 track
- Phase 11 track

Before every commit:
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
