import { toTrimmedString } from '../../data/adapterUtils.js'
import { NOTIFICATION_PREFERENCE_KEYS, normalizeNotificationPreferences } from '../../services/notificationPreferences.js'
import { findTheme, normalizeThemeId } from '../../theme/themeRegistry.js'

const LEGACY_THEME_LABELS = Object.freeze({
  'midnight-rose': 'Midnight Rose',
  'paper-hearts': 'Paper Hearts',
  moonlit: 'Moonlit',
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
})

const MIGRATION_PROGRESS_LABELS = Object.freeze({
  '/dashboard': 'Home',
  '/timeline': 'Story',
  '/gallery': 'Album',
  '/profile': 'Us',
})

const SHARED_ALBUM_HOSTS = Object.freeze(['icloud.com', 'www.icloud.com'])

const NOTIFICATION_PREFERENCE_COPY = Object.freeze({
  newMemories: {
    label: 'New memories',
    description: 'Let this device know when a new memory is added to the book.',
  },
  newMedia: {
    label: 'New photos and videos',
    description: 'Useful for new Album media after the trusted media backend is live.',
  },
  plans: {
    label: 'Plans',
    description: 'Date nights, trips, reservations, and shared plans.',
  },
  importantDates: {
    label: 'Important dates',
    description: 'Relationship dates that should not get lost in the week.',
  },
  anniversaries: {
    label: 'Anniversaries',
    description: 'Annual reminders for milestones already known inside Couple Book.',
  },
  birthdays: {
    label: 'Birthdays',
    description: 'Birthday reminders without turning special pages into alerts.',
  },
  specialMoments: {
    label: 'Special moments',
    description: 'Birthday, Valentine, Confession, and future private moment prompts.',
  },
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
  const savedTheme = toTrimmedString(settingsData?.appearanceTheme || settingsData?.theme)
  const anniversaryView = toTrimmedString(settingsData?.settings?.anniversaryConfig)
  const privacyToggles = settingsData?.settings?.privacyToggles || {}
  const themeDefinition = findTheme(savedTheme)
  const normalizedTheme = normalizeThemeId(savedTheme)

  let preservedThemeOrigin = 'No saved value'
  if (savedTheme) {
    preservedThemeOrigin = settingsData?.usedGlobalThemeFallback ? 'Shared legacy fallback' : 'Scoped legacy preference'
  }

  return {
    runtimeTheme: {
      label: themeDefinition.name,
      description: themeDefinition.description,
      meta: 'Current atmosphere',
    },
    currentTheme: {
      label: themeDefinition.name,
      value: normalizedTheme,
      description: themeDefinition.shortDescription,
    },
    preservedTheme: {
      label: formatThemeLabel(savedTheme),
      value: normalizedTheme,
      description: savedTheme
        ? 'Your saved appearance follows your approved account and restores across devices.'
        : 'No saved appearance preference is stored here yet.',
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
        label: 'Current appearance',
        description: 'The shell restores your allowed Couple Book theme before the first meaningful paint where possible.',
        meta: themeDefinition.name,
      },
      {
        label: 'Preserved appearance preference',
        description: savedTheme
          ? 'Your saved appearance preference is available here.'
          : 'Midnight Rose is used until a personal preference is saved.',
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
        description: 'Private media stays protected and appears only when it is available to your account.',
        meta: 'Protected',
      },
      {
        label: 'Private media connection',
        description: 'Private media access is kept separate from your relationship details and preferences.',
        meta: 'Current boundary',
      },
    ],
  }
}

function getNotificationPermissionState(env = {}) {
  const explicit = toTrimmedString(env.NOTIFICATION_PERMISSION || env.notificationPermission).toLowerCase()
  if (['granted', 'denied', 'default', 'unsupported'].includes(explicit)) return explicit
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return toTrimmedString(window.Notification?.permission).toLowerCase() || 'default'
  }
  return 'unsupported'
}

export function selectSettingsNotifications(settingsSource = null, env = {}) {
  const settingsData = settingsSource?.data || {}
  const stored = normalizeNotificationPreferences(settingsData.notifications || settingsData.settings?.notifications)
  const permission = getNotificationPermissionState(env)

  return {
    title: 'Notifications',
    description: 'Choose what Couple Book may notify this device about once web push is connected. Permission is requested later only from an explicit action.',
    permission,
    permissionLabel: permission === 'granted'
      ? 'Allowed on this device'
      : permission === 'denied'
        ? 'Blocked by browser'
        : permission === 'unsupported'
          ? 'Not supported here'
          : 'Not requested',
    permissionTone: permission === 'granted' ? 'success' : permission === 'denied' ? 'error' : 'warning',
    backendBoundary: 'Web push delivery requires Firebase Messaging, a registered device token, and a trusted backend path before notifications can be sent.',
    categories: NOTIFICATION_PREFERENCE_KEYS.map((key) => ({
      key,
      enabled: stored[key] === true,
      ...NOTIFICATION_PREFERENCE_COPY[key],
    })),
  }
}

export function normalizeSharedIcloudAlbumUrl(value) {
  const rawUrl = toTrimmedString(value)
  if (!rawUrl) return ''

  try {
    const url = new URL(rawUrl)
    const host = url.hostname.toLowerCase()
    if (url.protocol !== 'https:') return ''
    if (!SHARED_ALBUM_HOSTS.includes(host)) return ''
    if (!url.pathname.toLowerCase().startsWith('/sharedalbum')) return ''
    return url.href
  } catch {
    return ''
  }
}

function selectSharedAlbumConfig({ env = {}, settingsSource = null } = {}) {
  const settings = settingsSource?.data?.settings || {}
  const configuredUrl = normalizeSharedIcloudAlbumUrl(
    settings.sharedIcloudAlbumUrl
      || settings.sharedAlbumUrl
      || settings.sharedAlbum?.url
      || env.VITE_SHARED_ICLOUD_ALBUM_URL,
  )

  return {
    title: 'Shared iCloud Album shortcut',
    status: configuredUrl ? 'configured' : 'not-configured',
    statusLabel: configuredUrl ? 'Ready' : 'Not configured',
    url: configuredUrl,
    description: configuredUrl
      ? 'Opens the owner-configured iCloud shared album in a separate browser context for manual review or imports.'
      : 'Optional external shortcut for a shared iCloud album. Couple Book does not scrape iCloud, store iCloud credentials, or use this link for authorization.',
    boundary: 'Convenience link only',
  }
}

export function selectSettingsMedia(mediaSync = null, { env = {}, settingsSource = null } = {}) {
  return {
    title: 'Google Drive media provider',
    description: 'Drive authorization is managed here once for the couple. Album stays focused on browsing indexed photos and videos.',
    connectedAccount: 'jaylanspencer99@gmail.com',
    approvedFolderLabel: 'Couple Book media folder',
    backendBoundary: mediaSync?.backend?.zeroCostBoundary || 'Persistent refresh credentials, Drive Changes sync, and thumbnail delivery require an approved trusted backend before they can run for both partners automatically.',
    sharedAlbum: selectSharedAlbumConfig({ env, settingsSource }),
    items: [
      {
        label: 'Private folder',
        description: 'Original photos and videos are expected to remain in the Couple Book Google Drive folder.',
        meta: 'Owner managed',
      },
      {
        label: 'Temporary previews',
        description: 'Preview links are session-only and must not be saved into Firestore or audit events.',
        meta: 'Not persisted',
      },
      {
        label: 'Fast Album index',
        description: mediaSync?.mediaIndexPath
          ? `Stable Drive media metadata is read from ${mediaSync.mediaIndexPath}; original files stay in Google Drive.`
          : 'Stable Drive media metadata is read from a couple-scoped Firestore media index when available.',
        meta: 'Metadata only',
      },
      {
        label: 'Continuous Drive sync',
        description: 'Background Drive Changes sync, token refresh, and webhook processing require an approved trusted backend before they can run persistently.',
        meta: mediaSync?.deploymentStatus === 'owner-approval-required' ? 'Owner approval required' : 'Backend required',
      },
      {
        label: 'Album access',
        description: 'Album reads the couple-scoped Firestore media index and must not ask normal members to authorize Google Drive for browsing.',
        meta: 'Index first',
      },
    ],
  }
}

function getCompatibilityStatusLabel(key, source) {
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

  return 'This shared detail will appear here when it is available to your account.'
}

export function selectSettingsCompatibility(snapshot) {
  const sourceOrder = ['settings', 'profile', 'favorites', 'contract']
  const items = sourceOrder.map((key) => {
    const source = snapshot?.sources?.[key] || null
    const sourceName = source?.source || ''

    return {
      key,
      label: COMPATIBILITY_ITEM_LABELS[key] || toTitleCaseWords(key),
      status: source?.status || 'empty',
      statusLabel: getCompatibilityStatusLabel(key, source),
      summary: getCompatibilitySummary(key, source),
      sourceName,
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
  function toMigrationEntry(entry, meta) {
    return {
      ...entry,
      label: MIGRATION_PROGRESS_LABELS[entry.path] || entry.label,
      meta,
    }
  }

  return {
    completed: migrationStatus.completed.map((entry) => toMigrationEntry(entry, 'Complete')),
    pending: migrationStatus.pending.map((entry) => toMigrationEntry(entry, 'Pending')),
    smokeGate: {
      jaylan: smokeGate.jaylan,
      partner: smokeGate.partner,
      overall: smokeGate.overall,
    },
    note: 'Real partner-account smoke remains a separate manual gate before cutover, static rollback replacement, or higher-risk Firebase synchronization work.',
  }
}

export function selectSettingsAdvanced({ runtimeMode, compatibilitySnapshot, mediaSync = null }) {
  const settingsWarnings = compatibilitySnapshot?.sources?.settings?.warnings?.length || 0

  return {
    items: [
      {
        label: 'Runtime mode',
        description:
          runtimeMode === 'production'
            ? 'This routed shell is running in a production-style build with the same read-only safety boundary.'
            : 'This account is using the protected local preview of Couple Book.',
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
      {
        label: 'Drive media index',
        description: mediaSync?.syncStatePath
          ? `The browser can read indexed media and sync health from ${mediaSync.syncStatePath}, but cannot write backend-owned sync state.`
          : 'The browser can read indexed media when available, but cannot write backend-owned Drive sync state.',
        meta: 'Read-only',
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
    model.appearance.currentTheme?.label
      ? `Current theme: ${model.appearance.currentTheme.label}`
      : 'Using the default Couple Book shell',
    `${completedCount} routed pages complete, ${pendingCount} still pending`,
  ]
}
