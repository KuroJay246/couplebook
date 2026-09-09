# Couple Book Phase 1B Memory Domain Continuation

Date: 2026-09-08
Base checkpoint: `ac53e6ec2ac2b9ac84868da0833ab930e381aa25`

## memorySource Trace

Previous Album trace was PARTIAL:

`CompatibilityProvider -> loadCompatibilitySnapshot -> sources.memories -> useGalleryData -> buildGalleryReadModel -> GalleryView`

Current memory trace:

`Firebase/legacy bridge -> services/memoryService.js -> features/memories/useMemorySource.js -> feature read model -> route view`

Route consumers:

- Home: `useDashboardModel -> useMemorySource -> buildDashboardReadModel({ memorySource }) -> DashboardView`
- Story: `useTimelineData -> useMemorySource -> buildTimelineReadModel({ memorySource }) -> TimelineView`
- Album: `useGalleryData -> useMemorySource -> buildGalleryReadModel({ memorySource }) -> GalleryView`

Answers:

- memorySource originates in `useMemorySource`, not the normal compatibility aggregate.
- Normal production memorySource is no longer sourced from `CompatibilityProvider`.
- There is no Firestore subscription; the current implementation performs one-shot `getDocs(collection(couples/{coupleId}/memories))` through `readCollection`.
- `services/memoryService.js` normalizes Firestore memory documents into the stable memory source shape.
- `features/memories/memoryNormalizer.js` normalizes display memory records for Home, Story, and Album selectors.
- `useMemorySource` owns memory loading/error/refresh state.
- `useMemorySource` keys loaded memory state to the current auth/data-source/couple/user identity so a stale previous-user memory source is not rendered during auth or membership transitions.
- Album now has a direct memory-domain read contract through `useMemorySource`.
- Duplicate memory loading across Home/Story/Album is reduced at the ownership level, but each route still performs its own one-shot read on navigation. A shared cache is not introduced yet.

## Memory Ownership Map

| File | Responsibility | Data Source | Consumers | Duplicate | Action |
| --- | --- | --- | --- | --- | --- |
| `services/memoryService.js` | Memory data access and Firestore memory validation | legacy bridge or `couples/{coupleId}/memories` | `useMemorySource`, tests | No | KEEP |
| `features/memories/useMemorySource.js` | Route-level memory read hook, state, refresh, localhost fixture bridge | `memoryService`, localhost-only fixture | Home, Story, Album | New authoritative path | KEEP |
| `features/memories/memoryNormalizer.js` | Stable app memory normalization | Memory source data | Home, Story, Album | Shared | KEEP |
| `features/memories/memorySelectors.js` | Timeline/domain selectors | Normalized memories | Home, Story, Album | Shared | KEEP |
| `features/timeline/timelineReadModel.js` | Story read model | `memorySource` | Story | No longer compatibility-owned | KEEP |
| `features/gallery/galleryReadModel.js` | Album read model | `memorySource` | Album | No longer compatibility-owned | KEEP |
| `features/dashboard/dashboardReadModel.js` | Home read model | `memorySource` plus non-memory compatibility sources | Home | No longer memory-compatible | KEEP |
| `features/compatibility/CompatibilityProvider.jsx` | Non-memory compatibility state | legacy/Firestore compatibility services | Settings/Profile/Favorites/Contract/Special Moments | Previously owned memories | MIGRATED |
| `features/compatibility/compatibilityService.js` | Non-memory legacy compatibility aggregate | legacy adapters except memories | CompatibilityProvider | Memory removed | KEEP SMALLER |
| `features/compatibility/firestoreCompatibilityService.js` | Non-memory Firestore compatibility aggregate | targeted Firestore services except memories | CompatibilityProvider | Memory removed | KEEP SMALLER |
| `data/legacyMemoryAdapter.js` | Legacy local memory bridge | localhost-only legacy data | `memoryService` | Legacy-only | KEEP isolated |
| `features/timeline/memorySourceMerge.js` | Legacy memory merge helper | legacy adapter inputs | legacy adapter/tests | Legacy-only | KEEP isolated |

## CompatibilityProvider Before/After

Before `sources`:

- `favorites`
- `profile`
- `settings`
- `contract`
- `memories`
- `specialMoments`

After `sources`:

- `favorites`
- `profile`
- `settings`
- `contract`
- `specialMoments`

Moved:

- `sources.memories` moved to `useMemorySource`.

Temporarily retained:

- Browser compatibility fixture may still contain `snapshot.sources.memories`, but only `useMemorySource` consumes that localhost-only fixture. It is not part of the normal production compatibility read.

## Home Story Album Consistency

The same memory source now flows into:

- Home recent memories and On This Day cards.
- Story chronological chapters, year/month grouping, filters, archived list.
- Album photo/video/special collections and verified media removal.

The common interpretation is:

- identity: `memory.id`
- title/caption: normalized by `memoryNormalizer` and feature selectors
- date: normalized once, then formatted per feature
- media identity: `media.id`, `media.kind`, `storage-verified` or `drive-verified`

## Test Fixture Boundary

The authenticated browser fixture remains localhost-only. Memory fixture data is now read by `useMemorySource` directly from the frozen browser-test compatibility fixture when present.

This keeps deterministic browser tests without requiring production routes to depend on normal `CompatibilityProvider.sources.memories`.

Regression fixed during this batch:

- Story initially rendered the browser fixture as empty because the `useMemorySource` return expression treated a truthy fixture as the conditional predicate instead of returning it as the source.
- The hook now returns the fixture source directly and keeps the stale-owner guard for non-fixture production reads.
- `npm run test:browser` proves Story year navigation and detail actions are present again.

## Firestore Reads

Current client read map:

| File | Path | Domain | Trigger | Cleanup | Consumers | Duplicate | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `userService.js` | `users/{uid}` | auth approval | auth state change | auth listener cleanup in `AuthProvider` | all protected routes | no broad user read | keep |
| `coupleService.js` | `couples/{coupleId}` | couple meta | compatibility load | one-shot | non-memory compatibility | no | keep |
| `coupleService.js` | `couples/{coupleId}/members/{uid}` | membership | auth/write/compatibility | one-shot | auth/write/rules tests | yes, repeated for write assertions | keep until shared auth context expands |
| `profileService.js` | `couples/{coupleId}/profiles` | Us/Profile | compatibility load | one-shot | Dashboard/Profile/Favorites labels | no listener duplicate | future domain hook candidate |
| `favoritesService.js` | `couples/{coupleId}/favorites` | Favorites | compatibility load | one-shot | Favorites/Settings | no listener duplicate | future domain hook candidate |
| `settingsService.js` | `couples/{coupleId}/settings/shared` | shared settings | compatibility load | one-shot | Settings/theme summary | no | keep |
| `settingsService.js` | `couples/{coupleId}/settings/{uid}` | private settings | compatibility load/theme load | one-shot | Settings/ThemeProvider | duplicate with ThemeProvider | later consolidate |
| `contractService.js` | `couples/{coupleId}/contracts/current` | contract | compatibility load | one-shot | Contract/Settings | no | future domain hook candidate |
| `memoryService.js` | `couples/{coupleId}/memories` | memories | `useMemorySource` route load/refresh | one-shot | Home/Story/Album | route-level duplicate reads remain | keep, later cache if needed |
| `planService.js` | `couples/{coupleId}/plans` | plans | Plans route load/refresh | one-shot | Plans | no | keep |
| `specialMomentService.js` | `couples/{coupleId}/specialMoments/{birthday|valentine|confession}` | special moments | compatibility load | one-shot | special routes/settings links | no | keep for now |

No `onSnapshot` memory/profile/plan listeners are currently present.

## Writes

All write paths go through `useOwnerWrite -> firestoreWrites.js -> assertWriteContext`, which requires explicit Firestore write mode, signed-in approved user, active couple membership, schema validation, and audit writing.

| Action | UI | Validation | Database | Audit | Rollback/Refresh |
| --- | --- | --- | --- | --- | --- |
| Create/edit text memory | QuickAdd/Story writer path | `buildMemoryDocument` | `couples/{coupleId}/memories/{memoryId}` | `memory.updated` | route refresh |
| Archive memory | Story archived action | active membership + revision | patch status archived | `memory.archived` | Story/Album refresh |
| Restore memory | Story archived list | archived-only + revision | patch status active | `memory.restored` | Story refresh |
| Upload media | Album add flow | file type/size/hash + Drive provider | memory doc with verified Drive metadata | `media.finalized` | queue rollback/orphan states |
| Remove media association | Album remove | verified media only | archive memory, remove media from active view | `memory.archived` | Album refresh |
| Delete Drive original | not exposed | not supported in UI | no client database delete | none | not implemented |
| Create/edit plan | Plans form | title/status/category/date | `couples/{coupleId}/plans/{planId}` | `plan.updated` or `plan.completed` | Plans refresh |
| Cancel plan | Plans status change | status enum | plan status archived/cancelled equivalent if UI sets archived | `plan.updated` | Plans refresh |
| Profile update | Us/Profile edit dialog | own profile only | `couples/{coupleId}/profiles/{uid}` | `profile.updated` | Profile refresh |
| Favorites update | Favorites edit | own favorites only | `couples/{coupleId}/favorites/{uid}` | `favorites.updated` | Favorites refresh |
| Contract accept | Contract page | active member | merge `contracts/current` | `contract.accepted` | Contract refresh |
| Settings/theme update | Settings | supported theme + privacy booleans | `couples/{coupleId}/settings/{uid}` | `settings.updated` | Settings refresh/theme commit |
| Special moment update | SpecialMomentFrame edit | approved key + section schema | `couples/{coupleId}/specialMoments/{key}` | `special_moment.updated` | special route refresh |

## Settings

Settings section classification:

- PROFILE: account details and identity summary.
- APPEARANCE: theme, relationship date view, reduced motion.
- RELATIONSHIP: contract and special moment links.
- MEDIA: private folder concepts and preview persistence boundary.
- PRIVACY: account and browser-storage boundaries.
- ACCOUNT: sign out.
- DEVELOPER/DIAGNOSTIC: Advanced system health.
- LEGACY: compatibility status only inside Advanced.
- MISPLACED: none found in normal Settings after memory compatibility row removal.

`MediaSettingsSection` was extracted from `SettingsView` as an actual feature section, not a wrapper.

## MediaPreview Adoption

- USE SHARED MEDIAPREVIEW: Album lightbox, upload queue previews, Drive folder previews.
- KEEP SPECIALIZED: Birthday cake animation, Valentine button/heart interaction.
- MIGRATE TECHNICAL BEHAVIOR ONLY: Confession image/video candidate previews and closing video should eventually reuse the small image/video failure behavior without taking Album layout.
- KEEP SPECIALIZED: special moment audio, because `MediaPreview` intentionally does not own audio.

## Video Findings

- Album/Drive videos use `controls`, `muted`, `playsInline`, `preload="metadata"`, and pause on unmount through `MediaPreview`.
- Videos do not aggressively preload full files in the shared preview primitive.
- Browser-provided fullscreen remains available through native controls where supported.
- Unavailable video previews render a non-technical fallback and, where Drive supports it, an `Open original` action.
- Real mobile playback against owner Drive media remains NOT TESTED in this batch.

## JadenCreates Reference

Reopened:

- `lib/media.ts`: safe URL normalization and default controls.
- `components/VideoPlayer.tsx`: video pause on unmount, metadata preload, failed fallback.
- `components/GalleryGrid.tsx`: image-first card hierarchy, contained lightbox, escape close, body scroll lock.

Adapted:

- Keep media safety and rendering behavior centralized.
- Keep route-specific presentation outside the primitive.
- Preserve object-contain in detail views and object-cover in gallery cards.

Not copied:

- Sanity, Supabase, business portfolio data model, public project gallery language.

## Special Moments

Birthday:

- Preserved: cake reveal intent, confetti, celebratory title/subtitle.
- Lost/different: legacy SVG cake details are now CSS-built layers; exact cake gradients/sprinkles are not identical.
- Media: no external media in legacy birthday source.
- Pacing: current route is shorter and more integrated into Couple Book shell.

Valentine:

- Preserved: yes/no interaction, moving/teasing No button, floral/heart identity, playful acceptance.
- Lost/different: legacy canvas-confetti dependency and optional local audio are not fully restored in app-v2.
- Media: audio intentionally absent in current route.
- Pacing: current copy is calmer and less playful than the original.

Confession:

- Preserved: private opening gate, letter presentation, closing video/audio slots, mapped local owner panel.
- Missing: exact password-screen flow, floating blossoms/hearts/kisses/fireworks/flowers density, top/cheesy/outside note positioning, exact meme/photo rhythm, exact long-form letter pacing, background audio behavior, and complete mapped-media integration.
- Mapping exists for `top-note-photo`, `cheesy-note-image`, `outside-note-photo`, `inline-meme-image`, `closing-video`, and `background-audio`.
- `ConfessionPage.jsx` still fetches owner-state in an effect from a local private-media API. That should move into a special-moment/media resolver boundary, not a new data library.

## Accessibility And Modals

Existing custom dialogs:

- `ConfirmDialog.jsx`
- Gallery lightbox
- Timeline detail/archive dialogs
- SpecialMomentFrame edit dialog
- Favorites/Profile/QuickAdd/AppShell modals

Most have `role="dialog"` and `aria-modal`. Gaps to fix next:

- one authoritative shared dialog primitive;
- consistent Escape close;
- focus trap and restore focus;
- body scroll lock;
- mobile overflow constraints.

## Security

Built artifact BaaS warnings are Firebase client SDK/app chunks, not privileged admin authority by themselves.

Targeted source/config scan found:

- public Firebase browser config references;
- emulator/test passwords and fake OAuth test tokens;
- no service-account JSON private key marker;
- no `client_secret`;
- no service-role key;
- no admin credential in frontend source.

Public Firebase web config must remain protected by Auth, Firestore Rules, Storage Rules, App Check/security headers where applicable, and couple membership checks. It is not a server secret.

## React Doctor

Previous baseline: 36 warnings.

Current accepted checkpoint before this migration: 37 warnings.

The new warning was `no-high-complexity-react-function` for `MediaPreview.jsx`; it was introduced by the shared media primitive and is low-risk because the component is intentionally small and bounded. Settings remains a legitimate complexity warning; this batch extracted `MediaSettingsSection` as a first real-responsibility reduction.

## CSS Ownership

- GLOBAL: `styles/index.css` route/shared app styles.
- THEME TOKENS: `themeRegistry.js` and CSS variables.
- FEATURE: route classes such as Album, Timeline, Settings, special moments.
- SPECIAL MOMENT: dedicated Birthday/Valentine/Confession class families.
- INLINE: theme swatches and small dynamic token use.
- OBSOLETE: old normal Settings memory compatibility row removed from selectors.

No broad CSS rewrite was performed.

## Test Concurrency

Reliable order remains serial for browser-heavy checks:

1. `npm test`
2. `npm run lint`
3. `npm run build`
4. `npm run test:rules`
5. `npm run test:storage-rules`
6. `npm run test:browser`
7. `npm run test:product`
8. `npm run test:media-workflows`
9. `npm run test:performance`
10. `npm run test:visual`
11. `npm run health:react`

Shared resources: Vite ports, Firebase emulator ports, Playwright browser processes, and `.visual-audit/*-current` evidence directories.
