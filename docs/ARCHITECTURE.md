# Architecture

## Active Layout

- `app-v2/src/app`: routes and route metadata
- `app-v2/src/auth`: auth provider, protected route, authorization gate
- `app-v2/src/features`: page read models and feature UI
- `app-v2/src/layout`: protected shell
- `app-v2/src/lib`: Firebase client and config
- `app-v2/src/services`: Firestore paths, reads, writes, auth resolution
- `app-v2/src/styles`: current visual system and faithful legacy style bridge
- `app-v2/src/test`: Node, rules, media, browser-facing tests
- `app-v2/scripts`: QA, migration, media, and emulator helpers
- `docs`: current operating docs
- `docs/archive`: historical docs and audit evidence

## Routing

`app-v2/src/app/routes.jsx` defines the browser routes. `app-v2/src/app/routeConfig.js` is the route metadata source for protected navigation.

## Firebase

`app-v2/src/lib/firebaseConfig.js` reads Vite Firebase environment variables and resolves hosted auth domains. `app-v2/src/lib/firebaseClient.js` initializes Firebase Auth and Firestore once, with persistent local cache outside test/browser-test mode.

## Data Access

Read models convert Firestore/compatibility data into page-specific UI state. Writes go through `app-v2/src/services/firestoreWrites.js`; components should not bypass this service for mutable app-v2 Firestore writes.
