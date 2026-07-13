/**
 * @typedef {Object} NormalizedMemoryRecord
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string | null} dateLabel
 * @property {'image' | 'video' | 'unknown'} mediaKind
 * @property {string | null} mediaPath
 * @property {boolean} isDeleted
 * @property {'static-json' | 'local-override'} source
 */

export const legacyMemoryAdapterBoundary = Object.freeze({
  adapter: 'legacyMemoryAdapter',
  currentSources: [
    'core/memories.json',
    'localStorage: memorybook_custom_memories',
    'localStorage: memorybook_deleted_memories',
    'localStorage: memorybook_overridden_memories',
  ],
  expectedNormalizedOutput:
    'Array<NormalizedMemoryRecord> for the routed shell without mutating legacy memory state.',
  mode: 'read-only',
  futureOwner: 'R3 compatibility mapping before R4 domain services',
})

/**
 * Read-only compatibility boundary for legacy memories.
 *
 * This stub intentionally does not touch `core/memories.json`, localStorage, Firestore,
 * media paths, or the current static runtime in R2.
 *
 * @returns {Promise<NormalizedMemoryRecord[]>}
 */
export async function readLegacyMemories() {
  throw new Error('legacyMemoryAdapter remains a read-only stub until R3 compatibility mapping begins.')
}
