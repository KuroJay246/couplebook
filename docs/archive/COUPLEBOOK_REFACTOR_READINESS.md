# CoupleBook Refactor Readiness

Date: 2026-07-08

This project is ready for the next refactor batch only within the safety boundaries below. The live Firestore rules are now deployed, but approved-account browser smoke is still pending and must be treated as the immediate gating lane.

## Lane A - Required Manual Smoke

- Jaylan approved-account login smoke
- Partner approved-account login smoke
- Normal signed-in navigation through dashboard, memories, gallery, profile, favorites, and settings
- Explicit check for `permission-denied` errors during approved-user flows
- Confirmation that guest access stays blocked
- Confirmation that signup stays hidden
- Confirmation that username login stays disabled
- Confirmation that destructive browser admin tools stay disabled

## Lane B - Architecture Cleanup

- Inventory every direct Firestore read and write still performed from browser modules
- Propose a service-layer boundary so feature pages stop importing Firebase access patterns ad hoc
- Review [C:\Users\Jaylan\Documents\couplebook\core\firestoreSync.js](C:\Users\Jaylan\Documents\couplebook\core\firestoreSync.js) for document-shape assumptions, merge behavior, and collection-wide reads
- Map [C:\Users\Jaylan\Documents\couplebook\js\settings.js](C:\Users\Jaylan\Documents\couplebook\js\settings.js) into safe local actions, safe cloud reads, and future admin-only actions
- Identify root/public duplication that should later be removed without breaking the static runtime

## Lane C - UI/Layout Refinement

- Dashboard redesign goals
- Navigation cleanup and route consistency
- Memories timeline usability pass
- Gallery/media UX cleanup
- Profile, favorites, and settings usability cleanup
- No implementation until the approved-account smoke lane is complete

## Lane D - Media/Storage

- Decide whether Firebase Storage should be initialized for this project
- Keep [C:\Users\Jaylan\Documents\couplebook\storage.rules.private-draft](C:\Users\Jaylan\Documents\couplebook\storage.rules.private-draft) future-only until Storage is intentionally enabled
- Convert the existing media migration notes into a concrete path-by-path migration plan
- Do not upload any private media yet

## Lane E - Automation

- Run `npm run check:all` before pushes that touch routes, privacy, or Firebase rules
- Keep route checks current as pages move or split
- Keep safety checks current if new sensitive filenames or backup artifacts appear
- Keep Firestore rules dry-run validation in place for future rule edits
- Add a future browser smoke checklist execution note once approved-account credentials/session are available
