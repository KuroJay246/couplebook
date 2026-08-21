# Event Hub Alignment Standard

Last updated: 2026-08-21

This file records how Couple Book may use Gather & Savor Event Hub as a direct reusable engineering and interface-system reference. It does not copy Gather product behavior, data, Firebase project identity, routes, or event-specific workflows.

## Reference Snapshot

- Reference repo: `C:\Users\Jaylan\Documents\gathetr`
- Inspected commit: `1baf2796f4c5be143bc1f8f242546ebc2c155e1d`
- Reference mode: read-only workflow reference
- Couple Book repo: `C:\Users\Jaylan\Documents\couplebook`
- Couple Book Firebase project: `couplebook-97830`
- Prohibited project in Couple Book: `gathervibeshub`

## Current Port Scope

The active rebuild branch is `rebuild/couplebook-eventhub-system-port`.

As of Friday, August 21, 2026, Couple Book is directly using Event Hub as the source application for:

- app-shell structure
- desktop navigation rail
- mobile bottom navigation and More pattern
- top app bar and route title treatment
- token-driven global styling entry
- shared loading, empty, error, dialog, tabs, and status UI patterns
- Firebase initialization shape
- runtime shell validation discipline

These are adapted to Couple Book’s routes, private relationship scope, and `couplebook-97830` Firebase project.

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

For V1.2, the alignment standard means Couple Book should behave like a complete private memory-book application inside the same application family as Event Hub:

- The first screen after login should make the private relationship archive clear.
- Navigation should follow Couple Book tasks: Home, Story, Album, Us, Plans, and More.
- Editing flows should be obvious, reversible, and protected by the existing write-mode guardrails.
- Empty, loading, error, and permission states should look intentional.
- Browser QA must exercise real routes and responsive layouts, not just static build success.
- V1.2 deploys to preview Hosting only unless the user separately approves production.

For new persistent V1.2 workflows, adapt only these Event Hub engineering patterns: narrow services, allowed fields, integer revisions, protected immutable fields, emulator rules tests, explicit deployment guards, and runtime validation scripts. Do not copy Gather collections, routes, roles, IDs, finance logic, QR logic, or Firebase targets.

## Drift Check

Run this before using Gather as a reference:

```powershell
npm run alignment:check
```

If the Gather commit changed, re-read the active Gather shell, styling, auth, and QA files, update `config/event-hub-reference.json`, and rerun the check.
