# Event Hub Alignment Standard

Last updated: 2026-08-14

This file records how Couple Book may use Gather & Savor Event Hub as an engineering workflow reference. It does not copy Gather product behavior, data, Firebase setup, routes, or UI.

## Reference Snapshot

- Reference repo: `C:\Users\Jaylan\Documents\gathetr`
- Inspected commit: `18af96a8d5b714d44cb04ab924fbbedc2bb94f9b`
- Reference mode: read-only workflow reference
- Couple Book repo: `C:\Users\Jaylan\Documents\couplebook`
- Couple Book Firebase project: `couplebook-97830`
- Prohibited project in Couple Book: `gathervibeshub`

## Borrowed Workflow Patterns

- Start every run with branch, HEAD, remote, and working-tree checks.
- Keep one current handoff/status document that reflects implemented, deployed, held, and deferred work honestly.
- Treat Firebase project identity as a release gate.
- Keep synthetic QA markers controlled, reversible, and cleaned up.
- Verify production data before and after any approved production write.
- Keep app source, rules, tests, docs, and product QA aligned when behavior changes.
- Use emulator-backed QA without nested emulator ownership conflicts.
- Deploy only the Firebase targets that were intentionally changed and validated.
- End release work with validation evidence, Git state, and explicit deploy/merge status.

## Prohibited Copy Targets

Do not copy these Gather-specific items into Couple Book:

- Event operations product model.
- Organizer route map.
- Gather Firestore schema.
- Gather Firebase project or access-control records.
- Gather QR ticket payloads.
- Gather private event or payment data.
- Gather UI text, event terminology, or product navigation as Couple Book content.

## V1.2 Application Use

For V1.2, the alignment standard means Couple Book should behave like a complete private memory-book application:

- The first screen after login should make the private relationship archive clear.
- Navigation should follow Couple Book tasks: home, story, gallery, favorites, profiles, settings, contract, and special moments.
- Editing flows should be obvious, reversible, and protected by the existing write-mode guardrails.
- Empty, loading, error, and permission states should look intentional.
- Browser QA must exercise real routes and responsive layouts, not just static build success.
- V1.2 deploys to preview Hosting only unless the user separately approves production.

## Drift Check

Run this before using Gather as a reference:

```powershell
npm run alignment:check
```

If the Gather commit changed, re-read the active Gather docs, update `config/event-hub-reference.json`, and rerun the check.
