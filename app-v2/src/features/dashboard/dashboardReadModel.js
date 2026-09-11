import { normalizeTimelineMemories } from '../memories/memoryNormalizer.js'
import { selectTimelineDisplayMemories } from '../memories/memorySelectors.js'
import { selectOnThisDayMemory } from '../timeline/onThisDay.js'
import { calculateBirthdayCountdown } from '../../../../packages/core/src/dates.js'

const SPECIAL_MOMENT_PATHS = ['/birthday', '/valentine', '/confession']
const SUPPORTING_ROUTE_PATHS = ['/timeline', '/gallery', '/profile', '/favorites', '/settings', '/contract']
const SOURCE_ORDER = ['profile', 'settings', 'favorites', 'contract', 'memories']

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

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatClockLabel(now) {
  return now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatLongDateLabel(now) {
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function calculateDurationSince(startDateValue, nowValue) {
  const start = createDateAtNoon(startDateValue)
  const now = new Date(nowValue)

  if (!start || Number.isNaN(now.getTime()) || now < start) {
    return {
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalDays: 0,
    }
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
    const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    days += previousMonth.getDate()
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  return {
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
    totalDays,
  }
}

function calculateBirthdayDetails(birthdayValue, nowValue) {
  return calculateBirthdayCountdown(birthdayValue, nowValue)
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

  if (participants.length > 0) {
    return participants
  }

  const approvedName = toTrimmedString(approvedUser?.profileName) || toTrimmedString(approvedUser?.username)
  if (!approvedName) return []

  return [
    {
      username: toTrimmedString(approvedUser?.username) || approvedName,
      displayName: approvedName,
      shortName: approvedName.split(/\s+/)[0] || approvedName,
      bio: '',
      avatar: '',
      anniversaryView: null,
      joinedDate: null,
      birthday: null,
    },
  ]
}

function buildHeroSection({ approvedUser, participants, recentMemories, sourceState, now }) {
  const readerName =
    toTrimmedString(approvedUser?.profileName) || toTrimmedString(approvedUser?.username) || 'the two of you'
  const participantCount = participants.length
  const memoryCount = recentMemories.totalCount
  const unavailableCount = sourceState.totals.unavailable

  let description = 'Recent memories, upcoming dates, and plans.'

  if (recentMemories.state === 'unavailable') {
    description = 'Connect the memory archive to show recent memories.'
  } else if (memoryCount > 0) {
    description = `${memoryCount} ${pluralize(memoryCount, 'memory')} ready to reopen.`
  }

  return {
    eyebrow: 'Private home',
    title: `Open to the page ${readerName} left waiting.`,
    description,
    timestampLabel: formatClockLabel(now),
    dateLabel: formatLongDateLabel(now),
    actions: [
      { href: '/timeline', label: 'Continue the story' },
      { href: '/gallery', label: 'Open gallery', tone: 'secondary' },
    ],
    notes: [
      participantCount >= 2 ? `${participantCount} voices in view` : 'Shared profile still pending',
      `${unavailableCount} ${pluralize(unavailableCount, 'source')} still pending`,
      'Approved archive access only',
    ],
  }
}

function normalizeInlineCopy(value, maxLength = 72) {
  const trimmed = toTrimmedString(value).replace(/\s+/g, ' ')
  if (!trimmed) return ''

  const sentence = trimmed.split(/(?<=[.!?])\s+/)[0] || trimmed
  const normalizedSentence = sentence.replace(/[.!?]+$/, '').trim()
  if (normalizedSentence.length <= maxLength) return normalizedSentence

  return `${normalizedSentence.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function selectDashboardFallbackLabel(memory) {
  if (memory.specialMoment?.isSpecial) {
    const labelByRoute = {
      '/birthday': 'Birthday chapter',
      '/valentine': 'Valentine chapter',
      '/confession': 'Confession chapter',
    }

    const routeLabel = labelByRoute[memory.specialMoment.route]
    if (routeLabel) return routeLabel
  }

  const meaningfulTag = (memory.tags || []).find((tag) => tag?.label && tag.label.length > 2 && tag.key !== 'auto-import')
  if (meaningfulTag) {
    return meaningfulTag.label
  }

  if (memory.displayDate) {
    if (memory.media.kind === 'video') return `Video kept from ${memory.displayDate}`
    if (memory.media.kind === 'image') return `Memory from ${memory.displayDate}`
    return `Memory from ${memory.displayDate}`
  }

  if (memory.media.kind === 'video') return 'Saved video memory'
  if (memory.media.kind === 'image') return 'Saved photo memory'
  return 'Saved memory'
}

function selectDashboardCardTitle(memory) {
  if (memory.titleKind === 'authored' && memory.title) return memory.title

  const descriptionTitle = normalizeInlineCopy(memory.description)
  if (memory.descriptionKind === 'authored' && descriptionTitle) return descriptionTitle

  return selectDashboardFallbackLabel(memory)
}

function selectDashboardCardDescription(memory, title) {
  if (memory.descriptionKind === 'authored' && memory.description && normalizeInlineCopy(memory.description) !== title) {
    return memory.description
  }

  if (memory.displayDate && !title.includes(memory.displayDate)) {
    return `Saved on ${memory.displayDate}.`
  }

  return memory.media.hasReference ? 'Original media stays outside this shell.' : 'A preserved text memory.'
}

function buildRecentMemoriesSection(memorySource) {
  const state = memorySource?.status || 'empty'
  const normalizedMemories = normalizeTimelineMemories(memorySource?.data?.memories || [])
  const displayMemories = selectTimelineDisplayMemories(normalizedMemories)
  const items = displayMemories.slice(0, 3).map((memory) => {
    const title = selectDashboardCardTitle(memory)
    return {
      id: memory.id,
      title,
      description: selectDashboardCardDescription(memory, title),
    dateLabel: memory.displayDate,
    mediaKind: memory.media.kind || 'unknown',
    source: memory.source?.type || 'unknown',
    mediaLabel: memory.media.hasReference ? 'Original media stays outside this shell.' : 'Text-only memory card.',
    }
  })

  let emptyTitle = 'No recent memories yet.'
  let emptyDescription = 'Connect the archive or add a memory.'

  if (state === 'empty') {
    emptyTitle = 'No recent memories yet.'
    emptyDescription = 'Add a memory to start the story.'
  }

  if (state === 'invalid') {
    emptyTitle = 'Recent memory data needs attention before it can be shown.'
    emptyDescription = 'Some saved memories could not be read right now.'
  }

  if (state === 'ready' && items.length === 0) {
    emptyTitle = 'No recent memories yet.'
    emptyDescription = 'Add a memory to start the story.'
  }

  return {
    eyebrow: 'Recent memories',
    title: 'The latest pages worth reopening',
    description: 'Recent saved memories.',
    state,
    source: memorySource?.source || 'unknown',
    totalCount: displayMemories.length,
    items,
    action: { href: '/timeline', label: 'Open story' },
    emptyState: {
      title: emptyTitle,
      description: emptyDescription,
    },
  }
}

function buildOnThisDaySection(memorySource, now) {
  const normalizedMemories = normalizeTimelineMemories(memorySource?.data?.memories || [])
  const displayMemories = selectTimelineDisplayMemories(normalizedMemories)
  const memory = selectOnThisDayMemory(displayMemories, now)
  return {
    eyebrow: 'On this day',
    memory: memory
      ? {
          id: memory.id,
          title: memory.displayTitle,
          description: memory.displayDescription,
          dateLabel: memory.displayDate,
          typeLabel: memory.typeLabel,
        }
      : null,
    emptyState: {
      title: 'No memory matches this date yet.',
      description: 'Add dated memories to use On This Day.',
    },
  }
}

function filterAnniversaryParticipants(participants, settingsSource) {
  const preference = toTrimmedString(settingsSource?.data?.settings?.anniversaryConfig).toLowerCase()
  if (preference === 'jaylan' || preference === 'omia') {
    return participants.filter((participant) => participant.username.toLowerCase() === preference)
  }

  return participants
}

function buildMilestonesSection({ participants, settingsSource, now }) {
  const anniversaryParticipants = filterAnniversaryParticipants(participants, settingsSource)
  const anniversaryCards = anniversaryParticipants
    .flatMap((participant) => {
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

  const birthdayCards = participants
    .flatMap((participant) => {
      if (!participant.birthday) return []

      const details = calculateBirthdayDetails(participant.birthday, now)

      return [{
        id: `${participant.username.toLowerCase()}-birthday`,
        label: `${participant.shortName}'s birthday`,
        dateLabel: formatDateLabel(participant.birthday),
        countdownLabel: details.isToday
          ? 'Today'
          : `${details.days}d ${details.hours}h ${details.minutes}m ${details.seconds}s`,
        ageLabel: details.nextAge ? `Turning ${details.nextAge}` : 'Birthday not available',
        isToday: details.isToday,
      }]
    })

  return {
    eyebrow: 'Milestones',
    title: 'Dates worth holding close',
    description: 'Anniversaries and birthdays from Us.',
    anniversaryCards,
    birthdayCards,
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
    title: 'Private pages',
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
  const titleMap = {
    profile: 'Profiles',
    settings: 'Settings',
    favorites: 'Favorites',
    contract: 'Contract',
    memories: 'Memories',
  }

  const status = source?.status || 'empty'
  const warningCount = Array.isArray(source?.warnings) ? source.warnings.length : 0

  let summary = 'Nothing is saved here yet.'
  if (status === 'ready') summary = 'Read-only compatibility data is available for this surface.'
  if (status === 'unavailable') summary = 'These details are not available on this device right now.'
  if (status === 'invalid') summary = 'Some saved details could not be read right now.'

  return {
    key,
    title: titleMap[key] || key,
    status,
    sourceLabel: source?.source || 'unknown',
    warningCount,
    summary,
  }
}

function buildSourceStateSection(snapshot) {
  const items = SOURCE_ORDER.map((key) => summarizeSourceState(key, snapshot?.sources?.[key]))
  const warnings = Array.isArray(snapshot?.warnings) ? snapshot.warnings : []
  const totals = items.reduce(
    (summary, item) => {
      summary[item.status] = (summary[item.status] || 0) + 1
      return summary
    },
    { ready: 0, empty: 0, unavailable: 0, invalid: 0 },
  )

  return {
    eyebrow: 'Source state',
    title: 'Compatibility reads stay explicit',
    description: 'Dashboard is reading only from the approved compatibility inputs and still refusing any silent write-back.',
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
    description: 'Favorites, settings, and private pages.',
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

function buildTodayInUsSection({ milestones, recentMemories }) {
  const anniversary = milestones.anniversaryCards[0] || null
  const featured = recentMemories.items[0] || null
  return {
    eyebrow: 'Today in us',
    daysTogether: anniversary?.duration?.totalDays || 0,
    currentMilestone: anniversary
      ? `${anniversary.label}: ${anniversary.totalDaysLabel}`
      : 'Add a relationship date in Us.',
    featured,
  }
}

export function buildDashboardReadModel({
  approvedUser = null,
  compatibilitySnapshot = null,
  memorySource = null,
  profileSource = null,
  settingsSource = null,
  now = new Date(),
  routeMeta = [],
} = {}) {
  const snapshot = compatibilitySnapshot || {
    status: 'empty',
    sources: {},
    warnings: [],
  }
  const resolvedProfileSource = profileSource || snapshot.sources?.profile
  const resolvedSettingsSource = settingsSource || snapshot.sources?.settings
  const resolvedMemorySource = memorySource || snapshot.sources?.memories
  const snapshotWithDomainSources = {
    ...snapshot,
    sources: {
      ...(snapshot.sources || {}),
      memories: resolvedMemorySource,
      profile: resolvedProfileSource,
      settings: resolvedSettingsSource,
    },
  }
  const participants = normalizeParticipants(resolvedProfileSource, approvedUser)
  const recentMemories = buildRecentMemoriesSection(resolvedMemorySource)
  const sourceState = buildSourceStateSection(snapshotWithDomainSources)
  const milestones = buildMilestonesSection({
    participants,
    settingsSource: resolvedSettingsSource,
    now,
  })

  return {
    hero: buildHeroSection({
      approvedUser,
      participants,
      recentMemories,
      sourceState,
      now,
    }),
    todayInUs: buildTodayInUsSection({ milestones, recentMemories }),
    onThisDay: buildOnThisDaySection(resolvedMemorySource, now),
    recentMemories,
    milestones,
    specialMoments: buildSpecialMomentsSection(routeMeta),
    sourceState,
    supportingNavigation: buildSupportingNavigation(routeMeta),
  }
}
