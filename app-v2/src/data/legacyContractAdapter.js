/**
 * @typedef {Object} NormalizedContractState
 * @property {boolean} accepted
 * @property {Record<string, unknown> | null} activeSignature
 * @property {Record<string, unknown>} signaturesByUsername
 * @property {'local-storage' | 'firestore' | 'hybrid'} source
 */

export const legacyContractAdapterBoundary = Object.freeze({
  adapter: 'legacyContractAdapter',
  currentSources: [
    'localStorage: memorybook_contract_accepted_{username}',
    'localStorage: memorybook_contract_signatures',
    'Firestore: users/{uid}.contractAccepted',
    'Firestore: users/{uid}.signature',
  ],
  expectedNormalizedOutput:
    'NormalizedContractState for the approved active user without treating localStorage as auth proof.',
  mode: 'read-only',
  futureOwner: 'R3 compatibility mapping before contract domain service extraction',
})

/**
 * Read-only compatibility boundary for legacy contract state.
 *
 * The future bridge may read acceptance and signature history, but it must not grant route access,
 * rewrite signatures, or delete any existing contract records during the first compatibility pass.
 *
 * @returns {Promise<NormalizedContractState>}
 */
export async function readLegacyContractState() {
  throw new Error('legacyContractAdapter remains a read-only stub until R3 compatibility mapping begins.')
}
