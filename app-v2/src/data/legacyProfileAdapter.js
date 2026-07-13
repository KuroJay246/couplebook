/**
 * @typedef {Object} NormalizedProfileState
 * @property {Record<string, unknown>} profilesByUsername
 * @property {string[]} participantOrder
 * @property {'local-storage' | 'firestore' | 'hybrid'} source
 */

export const legacyProfileAdapterBoundary = Object.freeze({
  adapter: 'legacyProfileAdapter',
  currentSources: [
    'localStorage: memorybook_profiles',
    'Firestore: users/{uid}.profile',
  ],
  expectedNormalizedOutput:
    'NormalizedProfileState for the shared relationship profile surface without mutating legacy sources.',
  mode: 'read-only',
  futureOwner: 'R3 compatibility mapping before profile domain service extraction',
})

/**
 * Read-only compatibility boundary for legacy profiles.
 *
 * The future implementation must read the active and partner profile documents narrowly and
 * preserve the current shared couple projection before any schema cleanup begins.
 *
 * @returns {Promise<NormalizedProfileState>}
 */
export async function readLegacyProfiles() {
  throw new Error('legacyProfileAdapter remains a read-only stub until R3 compatibility mapping begins.')
}
