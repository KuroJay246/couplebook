Legacy compatibility adapters live here.

Current boundary rules:

- document real legacy sources only
- define normalized output contracts for the routed shell
- stay read-only first
- do not read or write production Firestore yet
- do not mutate localStorage or `core/memories.json`

Current stubs:

- `legacyMemoryAdapter.js`
- `legacyFavoritesAdapter.js`
- `legacyProfileAdapter.js`
- `legacySettingsAdapter.js`
- `legacyContractAdapter.js`
