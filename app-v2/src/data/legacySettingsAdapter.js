import {
  LEGACY_LOCAL_STORAGE_SOURCE,
  createCompatibilityResult,
  isPlainObject,
  normalizeBoolean,
  parseStoredJson,
  pickObjectEntries,
  readStorageValue,
  resolveStorage,
  toTrimmedString,
} from './adapterUtils.js'

const SETTINGS_KEY_PREFIX = 'memorybook_settings_'
const THEME_KEY_PREFIX = 'memorybook_theme_'
const GLOBAL_THEME_KEY = 'memorybook_theme'

/**
 * @typedef {Object} NormalizedSettingsState
 * @property {string} username
 * @property {string | null} theme
 * @property {boolean} usedGlobalThemeFallback
 * @property {{ anniversaryConfig: string | null, privacyToggles: { localOnlyMode: boolean, hideOfflineWarning: boolean, unknownFields: Record<string, unknown> }, unknownFields: Record<string, unknown> }} settings
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
    'CompatibilityResult<NormalizedSettingsState> for one approved user without modifying theme or settings persistence.',
  mode: 'read-only',
  futureOwner: 'R3 compatibility mapping before settings domain service extraction',
})

function createEmptySettingsState(username) {
  return {
    username,
    theme: null,
    usedGlobalThemeFallback: false,
    settings: {
      anniversaryConfig: null,
      privacyToggles: {
        localOnlyMode: true,
        hideOfflineWarning: false,
        unknownFields: {},
      },
      unknownFields: {},
    },
  }
}

function normalizeSettingsObject(rawSettings) {
  if (!isPlainObject(rawSettings)) {
    return {
      anniversaryConfig: null,
      privacyToggles: {
        localOnlyMode: true,
        hideOfflineWarning: false,
        unknownFields: {},
      },
      unknownFields: {},
    }
  }

  const privacyToggles = isPlainObject(rawSettings.privacyToggles) ? rawSettings.privacyToggles : {}

  return {
    anniversaryConfig: toTrimmedString(rawSettings.anniversaryConfig) || null,
    privacyToggles: {
      localOnlyMode: normalizeBoolean(privacyToggles.localOnlyMode, true),
      hideOfflineWarning: normalizeBoolean(privacyToggles.hideOfflineWarning, false),
      unknownFields: pickObjectEntries(privacyToggles, ['localOnlyMode', 'hideOfflineWarning']),
    },
    unknownFields: pickObjectEntries(rawSettings, ['anniversaryConfig', 'privacyToggles', 'theme']),
  }
}

export async function readLegacySettings(options = {}) {
  const username = toTrimmedString(options.username)
  if (!username) {
    return createCompatibilityResult({
      status: 'invalid',
      source: LEGACY_LOCAL_STORAGE_SOURCE,
      warnings: ['An approved username is required before reading legacy settings.'],
    })
  }

  const warnings = []
  const storage = resolveStorage(options.storage)

  if (!storage) {
    return createCompatibilityResult({
      status: 'unavailable',
      source: LEGACY_LOCAL_STORAGE_SOURCE,
      warnings: ['Browser storage is unavailable for legacy settings.'],
    })
  }

  const settingsKey = `${SETTINGS_KEY_PREFIX}${username}`
  const themeKey = `${THEME_KEY_PREFIX}${username}`
  const settingsResult = parseStoredJson(readStorageValue(storage, settingsKey, warnings), settingsKey, warnings)
  const scopedTheme = toTrimmedString(readStorageValue(storage, themeKey, warnings))
  const globalTheme = toTrimmedString(readStorageValue(storage, GLOBAL_THEME_KEY, warnings))

  let status = 'empty'
  const normalized = createEmptySettingsState(username)

  if (!settingsResult.missing) {
    if (!settingsResult.ok || !isPlainObject(settingsResult.value)) {
      status = 'invalid'
    } else {
      normalized.settings = normalizeSettingsObject(settingsResult.value)
      status = 'ready'
    }
  }

  if (scopedTheme) {
    normalized.theme = scopedTheme
    status = status === 'empty' ? 'ready' : status
  } else if (globalTheme) {
    normalized.theme = globalTheme
    normalized.usedGlobalThemeFallback = true
    warnings.push(`Legacy settings for ${username} fell back to the shared memorybook_theme value.`)
    status = status === 'empty' ? 'ready' : status
  }

  if (settingsResult.ok && isPlainObject(settingsResult.value) && typeof settingsResult.value.theme === 'string' && !normalized.theme) {
    normalized.theme = toTrimmedString(settingsResult.value.theme) || null
  }

  return createCompatibilityResult({
    status,
    source: LEGACY_LOCAL_STORAGE_SOURCE,
    data: normalized,
    warnings,
  })
}
