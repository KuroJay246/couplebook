/**
 * @typedef {Object} NormalizedSettingsState
 * @property {Record<string, unknown>} settings
 * @property {string | null} theme
 * @property {'local-storage' | 'firestore' | 'hybrid'} source
 */

export const legacySettingsAdapterBoundary = Object.freeze({
  adapter: 'legacySettingsAdapter',
  currentSources: [
    'localStorage: memorybook_settings_{username}',
    'localStorage: memorybook_theme_{username}',
    'localStorage: memorybook_theme',
    'Firestore: users/{uid}.settings',
    'Firestore: users/{uid}.theme',
  ],
  expectedNormalizedOutput:
    'NormalizedSettingsState for one approved user without modifying theme or settings persistence.',
  mode: 'read-only',
  futureOwner: 'R3 compatibility mapping before settings domain service extraction',
})

/**
 * Read-only compatibility boundary for legacy settings.
 *
 * The future implementation must prefer explicit active-user scope, preserve the current
 * username-suffixed local keys, and avoid any write-back side effects during the first bridge pass.
 *
 * @returns {Promise<NormalizedSettingsState>}
 */
export async function readLegacySettings() {
  throw new Error('legacySettingsAdapter remains a read-only stub until R3 compatibility mapping begins.')
}
