import { LEGACY_LOCAL_DEV_SOURCE, toTrimmedString } from '../../data/adapterUtils.js'

const LEGACY_THEME_LABELS = Object.freeze({
  dark: 'Glassmorphism dark',
  light: 'Crisp light',
  sunset: 'Warm sunset',
  kuromi: 'Kuromi gothic',
})

const ANNIVERSARY_VIEW_LABELS = Object.freeze({
  dual: 'Both perspectives',
  jaylan: 'Jaylan perspective',
  omia: 'Omia perspective',
})

const COMPATIBILITY_ITEM_LABELS = Object.freeze({
  settings: 'Personal preferences',
  profile: 'Shared profile context',
  favorites: 'Shared favorites context',
  contract: 'Contract context',
  memories: 'Local memory bridge',
})

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function toTitleCaseWords(value) {
  const normalized = toTrimmedString(value)
  if (!normalized) return ''

  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function formatThemeLabel(theme) {
  const normalizedTheme = toTrimmedString(theme).toLowerCase()
  if (!normalizedTheme) return 'No saved preference yet'
  return LEGACY_THEME_LABELS[normalizedTheme] || toTitleCaseWords(normalizedTheme)
}

function formatAnniversaryViewLabel(value) {
  const normalizedValue = toTrimmedString(value).toLowerCase()
  if (!normalizedValue) return 'Not saved yet'
  return ANNIVERSARY_VIEW_LABELS[normalizedValue] || toTitleCaseWords(normalizedValue)
}

function formatDateLabel(value) {
  const normalizedValue = toTrimmedString(value)
  if (!normalizedValue) return 'Not available yet'

  const parsedDate = new Date(normalizedValue)
  if (Number.isNaN(parsedDate.getTime())) return 'Not available yet'

  return DATE_LABEL_FORMATTER.format(parsedDate)
}

function getAccountName(approvedUser, authUser) {
  return approvedUser?.displayName || approvedUser?.username || authUser?.displayName || 'Approved account'
}

export function selectSettingsAccount({ approvedUser = null, authUser = null } = {}) {
  return {
    displayName: getAccountName(approvedUser, authUser),
    email: toTrimmedString(authUser?.email) || 'Not available yet',
    username: toTrimmedString(approvedUser?.username) || 'Not available yet',
    details: [
      {
        key: 'display-name',
        label: 'Signed-in name',
        value: getAccountName(approvedUser, authUser),
      },
      {
        key: 'email',
        label: 'Email',
        value: toTrimmedString(authUser?.email) || 'Not available yet',
      },
      {
        key: 'book-name',
        label: 'Name in the book',
        value: toTrimmedString(approvedUser?.username) || 'Not available yet',
      },
      {
        key: 'last-sign-in',
        label: 'Last sign-in',
        value: formatDateLabel(authUser?.metadata?.lastSignInTime),
      },
    ],
    items: [
      {
        label: 'Approved access',
        description: 'This page stays available only after Firebase sign-in succeeds and the approved account check passes.',
        meta: 'Private',
      },
      {
        label: 'Identity source',
        description: 'The visible account details come from the signed-in Firebase session and the approved account record, never from browser storage.',
        meta: 'Verified',
      },
      {
        label: 'Sign-out location',
        description: 'Sign out remains a shell-level action so this utility page does not become a second account console.',
        meta: 'Shell owned',
      },
    ],
    note: 'Account details remain quiet and read-only here.',
  }
}

export function selectSettingsAppearance(settingsSource) {
  const settingsData = settingsSource?.data
  const savedTheme = toTrimmedString(settingsData?.theme)
  const anniversaryView = toTrimmedString(settingsData?.settings?.anniversaryConfig)
  const privacyToggles = settingsData?.settings?.privacyToggles || {}

  let preservedThemeOrigin = 'No saved value'
  if (savedTheme) {
    preservedThemeOrigin = settingsData?.usedGlobalThemeFallback ? 'Shared legacy fallback' : 'Scoped legacy preference'
  }

  return {
    runtimeTheme: {
      label: 'Editorial paper and ink',
      description: 'The routed shell now keeps one calm paper-and-ink reading direction instead of switching visual systems page by page.',
      meta: 'Current shell',
    },
    preservedTheme: {
      label: formatThemeLabel(savedTheme),
      value: savedTheme || 'paper',
      description: savedTheme
        ? 'A preserved legacy preference is still visible here for reference, but it does not take over the routed shell.'
        : 'No preserved theme preference is stored here yet.',
      origin: preservedThemeOrigin,
    },
    anniversaryView: {
      label: formatAnniversaryViewLabel(anniversaryView),
      value: anniversaryView || 'dual',
      description: anniversaryView
        ? 'The old dashboard anniversary preference is preserved for reference until editing returns in a later phase.'
        : 'No anniversary preference is stored here yet.',
      meta: anniversaryView ? 'Preserved setting' : 'Not set',
    },
    privacy: {
      localOnlyMode: privacyToggles.localOnlyMode === true,
      reducedMotion: privacyToggles.reducedMotion === true,
    },
    revision: Number.isInteger(settingsData?.revision) && settingsData.revision > 0 ? settingsData.revision : 0,
    items: [
      {
        label: 'Current routed theme',
        description: 'This React shell keeps the approved Couple Book look while saving your preference.',
        meta: 'Fixed',
      },
      {
        label: 'Preserved appearance preference',
        description: savedTheme
          ? 'Your saved appearance preference is available here.'
          : 'The page can stay calm and complete even when no legacy appearance preference exists.',
        meta: preservedThemeOrigin,
      },
      {
        label: 'Saving preference',
        description: 'Display preferences save to your approved account.',
        meta: 'Owner only',
      },
    ],
  }
}

export function selectSettingsPrivacy() {
  return {
    items: [
      {
        label: 'Approved accounts only',
        description: 'Access remains limited to approved Couple Book accounts after sign-in succeeds.',
        meta: 'Core rule',
      },
      {
        label: 'Identity comes from sign-in',
        description: 'Firebase sign-in establishes identity here before the approved account check confirms access.',
        meta: 'Verified',
      },
      {
        label: 'Browser storage is not authentication',
        description: 'Saved browser values can support compatibility reads later, but they do not prove who is signed in.',
        meta: 'Required',
      },
      {
        label: 'Private media stays outside app-v2',
        description: 'Sensitive legacy media is not bundled into this routed shell during the current migration phase.',
        meta: 'Protected',
      },
      {
        label: 'No Firebase Storage rollout',
        description: 'Firebase Storage is still disabled for this project, and app-v2 has not replaced the production Hosting baseline.',
        meta: 'Current boundary',
      },
    ],
  }
}

function getCompatibilityStatusLabel(key, source) {
  if (key === 'memories') return 'Development only'
  if (source?.status === 'ready') return 'Available'
  if (source?.status === 'empty') return 'Awaiting migration'
  if (source?.status === 'unavailable') return 'Not connected'
  if (source?.status === 'invalid') return 'Needs review'
  return 'Awaiting migration'
}

function getCompatibilitySummary(key, source) {
  const status = source?.status || 'empty'

  if (key === 'settings') {
    if (status === 'ready') return 'Preserved appearance and privacy preferences are available for this approved account.'
    if (status === 'empty') return 'This approved account has no preserved settings values stored here yet.'
    if (status === 'unavailable') return 'The preserved settings record is not connected on this origin yet.'
    if (status === 'invalid') return 'The preserved settings record needs review before it can be shown safely.'
  }

  if (key === 'profile') {
    if (status === 'ready') return 'Shared profile context is available for names and relationship details.'
    if (status === 'empty') return 'Shared profile context is ready, but no preserved profile details are visible here yet.'
    if (status === 'unavailable') return 'Shared profile context has not connected on this origin yet.'
    if (status === 'invalid') return 'Shared profile context needs review before it can support this page safely.'
  }

  if (key === 'favorites') {
    if (status === 'ready') return 'The migrated Favorites route can already supply preserved shared-preference context.'
    if (status === 'empty') return 'Favorites are ready in the routed shell even while preserved values stay quiet.'
    if (status === 'unavailable') return 'Shared favorites remain safely outside this settings summary on this origin.'
    if (status === 'invalid') return 'The preserved favorites summary needs review before it can be shown here safely.'
  }

  if (key === 'contract') {
    if (status === 'ready') return 'Preserved contract acceptance context is available without exposing any destructive controls.'
    if (status === 'empty') return 'The contract route remains protected even when no preserved contract details are visible here yet.'
    if (status === 'unavailable') return 'Protected contract context has not connected to this utility page on this origin yet.'
    if (status === 'invalid') return 'Protected contract context needs review before it can be summarized here safely.'
  }

  if (key === 'memories') {
    if (status === 'ready') return 'The local memory bridge is available only for approved local development work.'
    if (status === 'invalid') return 'The local memory bridge needs review before it can be used safely in development.'
    return 'The local memory bridge stays blocked outside approved development conditions and never replaces protected routed reads.'
  }

  return 'This compatibility source is still awaiting migration.'
}

export function selectSettingsCompatibility(snapshot) {
  const sourceOrder = ['settings', 'profile', 'favorites', 'contract', 'memories']
  const items = sourceOrder.map((key) => {
    const source = snapshot?.sources?.[key] || null
    const sourceName = source?.source || ''

    return {
      key,
      label: COMPATIBILITY_ITEM_LABELS[key] || toTitleCaseWords(key),
      status: source?.status || 'empty',
      statusLabel: getCompatibilityStatusLabel(key, source),
      summary: getCompatibilitySummary(key, source),
      sourceName: key === 'memories' && sourceName === LEGACY_LOCAL_DEV_SOURCE ? 'Local development only' : '',
    }
  })

  return {
    items,
    notes: [
      'Settings stay tied to the approved signed-in account.',
      'No browser storage value can sign you in or override the approved account check.',
    ],
  }
}

export function selectSettingsMigrationProgress(migrationStatus, smokeGate) {
  return {
    completed: migrationStatus.completed.map((entry) => ({
      ...entry,
      meta: 'Complete',
    })),
    pending: migrationStatus.pending.map((entry) => ({
      ...entry,
      meta: 'Pending',
    })),
    smokeGate: {
      jaylan: smokeGate.jaylan,
      partner: smokeGate.partner,
      overall: smokeGate.overall,
    },
    note: 'Real partner-account smoke remains a separate manual gate before cutover, static rollback replacement, or higher-risk Firebase synchronization work.',
  }
}

export function selectSettingsAdvanced({ runtimeMode, compatibilitySnapshot }) {
  const settingsWarnings = compatibilitySnapshot?.sources?.settings?.warnings?.length || 0

  return {
    items: [
      {
        label: 'Runtime mode',
        description:
          runtimeMode === 'production'
            ? 'This routed shell is running in a production-style build with the same read-only safety boundary.'
            : 'This routed shell is running in local development for migration work and browser regression checks.',
        meta: runtimeMode === 'production' ? 'Production-safe' : 'Local only',
      },
      {
        label: 'Compatibility refresh',
        description: settingsWarnings > 0 ? 'Preserved settings reads stayed explicit and surfaced review notes safely.' : 'Preserved settings reads stayed quiet with no extra review notes.',
        meta: settingsWarnings > 0 ? `${settingsWarnings} notes` : 'Quiet',
      },
      {
        label: 'Sync boundary',
        description: 'Device and session management stay separate from these display preferences.',
        meta: 'Protected',
      },
    ],
  }
}

export function selectSettingsDangerZone() {
  return {
    items: [
      {
        label: 'Destructive controls stay unavailable',
        description: 'Delete, reset, revoke, export, and remote-device actions remain intentionally absent from this routed page.',
        meta: 'No actions',
      },
      {
        label: 'No browser cleanup tools',
        description: 'Any future destructive workflow must be reviewed separately instead of quietly returning as a browser utility.',
        meta: 'Deferred',
      },
      {
        label: 'Safe preferences only',
        description: 'This page saves display preferences and keeps destructive account actions unavailable.',
        meta: 'Owner only',
      },
    ],
  }
}

export function deriveSettingsStatus(settingsSource) {
  const status = settingsSource?.status || 'empty'

  if (status === 'invalid') return 'invalid'
  if (status === 'unavailable') return 'unavailable'
  if (status === 'ready') return 'ready'
  return 'empty'
}

export function describeSettingsOpening(model) {
  const completedCount = model.migration.completed.length
  const pendingCount = model.migration.pending.length

  return [
    model.account.email !== 'Not available yet' ? 'Approved identity restored' : 'Approved identity remains quiet',
    model.appearance.preservedTheme.label !== 'No saved preference yet'
      ? `Preserved theme noted: ${model.appearance.preservedTheme.label}`
      : 'Using the default editorial shell',
    `${completedCount} routed pages complete, ${pendingCount} still pending`,
  ]
}
