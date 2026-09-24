import { calculateBirthdayCountdown } from '../../../../packages/core/src/dates.js'

const SPECIAL_MOMENT_PATHS = ['/birthday', '/valentine', '/confession']
const SUPPORTING_ROUTE_PATHS = ['/gallery', '/profile', '/favorites', '/plans', '/settings']
const SOURCE_ORDER = ['profile', 'settings', 'favorites', 'contract']

function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural
}

function createDateAtNoon(dateLike) {
  if (!dateLike) return null
  const normalized = String(dateLike).trim()
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0)
    : new Date(normalized)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(12, 0, 0, 0)
  return date
}

function formatDateLabel(dateLike) {
  const date = createDateAtNoon(dateLike)
  if (!date) return null
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatClockLabel(now) {
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatLongDateLabel(now) {
  return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function calculateDurationSince(startDateValue, nowValue) {
  const start = createDateAtNoon(startDateValue)
  const now = new Date(nowValue)
  if (!start || Number.isNaN(now.getTime()) || now < start) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, totalDays: 0 }
  }

  const diffMs = now.getTime() - start.getTime()
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  let years = now.getFullYear() - start.getFullYear()
  let months = now.getMonth() - start.getMonth()
  let days = now.getDate() - start.getDate()
  let hours = now.getHours() - start.getHours()
  let minutes = now.getMinutes() - start.getMinutes()
  let seconds = now.getSeconds() - start.getSeconds()

  if (seconds < 0) {
    minutes -= 1
    seconds += 60
  }
  if (minutes < 0) {
    hours -= 1
    minutes += 60
  }
  if (hours < 0) {
    days -= 1
    hours += 24
  }
  if (days < 0) {
    months -= 1
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  return { years, months, days, hours, minutes, seconds, totalDays }
}

function normalizeParticipants(profileSource, approvedUser) {
  const data = profileSource?.data
  const order = Array.isArray(data?.participantOrder)
    ? data.participantOrder.flatMap((entry) => (entry ? [entry] : []))
    : Object.keys(data?.profilesByUsername || {})

  const participants = order.map((username) => {
    const profile = data?.profilesByUsername?.[username] || {}
    const displayName = toTrimmedString(profile.name) || username
    return {
      username,
      displayName,
      shortName: displayName.split(/\s+/)[0] || displayName,
      bio: toTrimmedString(profile.bio),
      avatar: toTrimmedString(profile.avatar),
      anniversaryView: toTrimmedString(profile.anniversaryView) || null,
      joinedDate: toTrimmedString(profile.joinedDate) || null,
      birthday: toTrimmedString(profile.birthday) || null,
    }
  })

  if (participants.length > 0) return participants
  const approvedName = toTrimmedString(approvedUser?.profileName) || toTrimmedString(approvedUser?.username)
  if (!approvedName) return []
  return [{
    username: toTrimmedString(approvedUser?.username) || approvedName,
    displayName: approvedName,
    shortName: approvedName.split(/\s+/)[0] || approvedName,
    bio: '',
    avatar: '',
    anniversaryView: null,
    joinedDate: null,
    birthday: null,
  }]
}

function buildHeroSection({ approvedUser, participants, sourceState, now }) {
  const readerName = toTrimmedString(approvedUser?.profileName) || toTrimmedString(approvedUser?.username) || 'the two of you'
  const coupleTitle = participants.map((participant) => participant.shortName).filter(Boolean).slice(0, 2).join(' & ') || readerName
  const participantCount = participants.length
  const unavailableCount = sourceState.totals.unavailable
  return {
    eyebrow: 'Private home',
    title: `Open to the page ${readerName} left waiting.`,
    coupleTitle,
    description: 'Private photos, important dates, special moments, and plans in one warm place.',
    timestampLabel: formatClockLabel(now),
    dateLabel: formatLongDateLabel(now),
    actions: [
      { href: '/gallery', label: 'Open Album' },
      { href: '/plans', label: 'Open Plans', tone: 'secondary' },
    ],
    notes: [
      participantCount >= 2 ? `${participantCount} voices in view` : 'Shared profile still pending',
      `${unavailableCount} ${pluralize(unavailableCount, 'source')} still pending`,
      'Approved private access only',
    ],
  }
}

function filterAnniversaryParticipants(participants, settingsSource) {
  const preference = toTrimmedString(settingsSource?.data?.settings?.anniversaryConfig).toLowerCase()
  if (preference === 'jaylan' || preference === 'omia') {
    return participants.filter((participant) => participant.username.toLowerCase() === preference)
  }
  return participants
}

function buildMilestonesSection({ approvedUser, participants, settingsSource, now }) {
  const viewerNames = new Set([
    approvedUser?.username,
    approvedUser?.displayName,
    approvedUser?.profileName,
  ].map((value) => toTrimmedString(value).toLowerCase()).filter(Boolean))
  const anniversaryCards = filterAnniversaryParticipants(participants, settingsSource).flatMap((participant) => {
    if (!participant.joinedDate) return []
    const duration = calculateDurationSince(participant.joinedDate, now)
    return [{
      id: `${participant.username.toLowerCase()}-anniversary`,
      label: `${participant.shortName}'s view`,
      dateLabel: formatDateLabel(participant.joinedDate),
      duration,
      totalDaysLabel: `${duration.totalDays} ${pluralize(duration.totalDays, 'day')} together`,
    }]
  })

  const birthdayCards = participants.flatMap((participant) => {
    if (!participant.birthday) return []
    const details = calculateBirthdayCountdown(participant.birthday, now)
    return [{
      id: `${participant.username.toLowerCase()}-birthday`,
      label: `${participant.shortName}'s birthday`,
      isViewer: [participant.username, participant.displayName, participant.shortName].some((value) => viewerNames.has(toTrimmedString(value).toLowerCase())),
      dateLabel: formatDateLabel(participant.birthday),
      countdownLabel: details.isToday ? 'Today' : `${details.days}d ${details.hours}h ${details.minutes}m`,
      ageLabel: details.nextAge ? `Turning ${details.nextAge}` : 'Birthday not available',
      isToday: details.isToday,
    }]
  })

  const viewerBirthday = birthdayCards.find((card) => card.isViewer) || null

  return {
    eyebrow: 'Milestones',
    title: 'Dates worth holding close',
    description: 'Anniversaries and birthdays from Us.',
    anniversaryCards,
    birthdayCards,
    viewerBirthday,
    hasContent: anniversaryCards.length > 0 || birthdayCards.length > 0,
    emptyState: {
      title: 'No important dates yet.',
      description: 'Add birthdays and relationship dates from Us.',
    },
  }
}

function buildSpecialMomentsSection(routeMeta) {
  const descriptions = {
    '/birthday': 'Birthday letter and media.',
    '/valentine': 'Valentine keepsake.',
    '/confession': 'Private confession page.',
  }
  return {
    eyebrow: 'Special moments',
    title: 'Special moments',
    description: 'Birthday, Valentine, and Confession.',
    items: SPECIAL_MOMENT_PATHS.map((path) => {
      const meta = routeMeta.find((route) => route.path === path) || {}
      return {
        href: path,
        label: meta.label || path.replace('/', ''),
        title: meta.title || meta.label || path.replace('/', ''),
        description: descriptions[path],
      }
    }),
  }
}

function summarizeSourceState(key, source) {
  const titleMap = { profile: 'Profiles', settings: 'Settings', favorites: 'Favorites', contract: 'Contract' }
  const status = source?.status || 'empty'
  const warningCount = Array.isArray(source?.warnings) ? source.warnings.length : 0
  let summary = 'Nothing is saved here yet.'
  if (status === 'ready') summary = 'Read-only compatibility data is available for this surface.'
  if (status === 'unavailable') summary = 'These details are not available on this device right now.'
  if (status === 'invalid') summary = 'Some saved details could not be read right now.'
  return { key, title: titleMap[key] || key, status, sourceLabel: source?.source || 'unknown', warningCount, summary }
}

function buildSourceStateSection(snapshot) {
  const items = SOURCE_ORDER.map((key) => summarizeSourceState(key, snapshot?.sources?.[key]))
  const warnings = Array.isArray(snapshot?.warnings) ? snapshot.warnings : []
  const totals = items.reduce((summary, item) => {
    summary[item.status] = (summary[item.status] || 0) + 1
    return summary
  }, { ready: 0, empty: 0, unavailable: 0, invalid: 0 })
  return {
    eyebrow: 'Source state',
    title: 'Compatibility reads stay explicit',
    description: 'Home reads profile, dates, preferences, and private routing state without loading retired archive records.',
    overallStatus: snapshot?.status || 'empty',
    items,
    warnings,
    totals,
  }
}

function buildSupportingNavigation(routeMeta) {
  return {
    eyebrow: 'Supporting navigation',
    title: 'More places',
    description: 'Album, Us, Plans, Favorites, and Settings.',
    items: SUPPORTING_ROUTE_PATHS.map((path) => {
      const meta = routeMeta.find((route) => route.path === path) || {}
      return {
        href: path,
        label: meta.label || path.replace('/', ''),
        title: meta.title || meta.label || path.replace('/', ''),
        description: meta.summary || 'Protected route',
      }
    }),
  }
}

function buildTodayInUsSection({ milestones }) {
  const anniversary = milestones.anniversaryCards[0] || null
  return {
    eyebrow: 'Today in us',
    daysTogether: anniversary?.duration?.totalDays || 0,
    currentMilestone: anniversary ? `${anniversary.label}: ${anniversary.totalDaysLabel}` : 'Add a relationship date in Us.',
    featured: null,
  }
}

export function buildDashboardReadModel({
  approvedUser = null,
  compatibilitySnapshot = null,
  profileSource = null,
  settingsSource = null,
  now = new Date(),
  routeMeta = [],
} = {}) {
  const snapshot = compatibilitySnapshot || { status: 'empty', sources: {}, warnings: [] }
  const resolvedProfileSource = profileSource || snapshot.sources?.profile
  const resolvedSettingsSource = settingsSource || snapshot.sources?.settings
  const snapshotWithDomainSources = {
    ...snapshot,
    sources: {
      ...(snapshot.sources || {}),
      profile: resolvedProfileSource,
      settings: resolvedSettingsSource,
    },
  }
  const participants = normalizeParticipants(resolvedProfileSource, approvedUser)
  const sourceState = buildSourceStateSection(snapshotWithDomainSources)
  const milestones = buildMilestonesSection({ approvedUser, participants, settingsSource: resolvedSettingsSource, now })
  return {
    hero: buildHeroSection({ approvedUser, participants, sourceState, now }),
    todayInUs: buildTodayInUsSection({ milestones }),
    milestones,
    specialMoments: buildSpecialMomentsSection(routeMeta),
    sourceState,
    supportingNavigation: buildSupportingNavigation(routeMeta),
  }
}
