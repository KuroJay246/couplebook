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

  const date = new Date(dateLike)
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
  const birthday = createDateAtNoon(birthdayValue)
  const now = new Date(nowValue)

  if (!birthday || Number.isNaN(now.getTime())) {
    return {
      nextAge: null,
      isToday: false,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    }
  }

  const nextBirthday = new Date(now.getFullYear(), birthday.getMonth(), birthday.getDate(), 0, 0, 0, 0)
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)

  if (currentDay > nextBirthday) {
    nextBirthday.setFullYear(now.getFullYear() + 1)
  }

  const isToday = birthday.getMonth() === now.getMonth() && birthday.getDate() === now.getDate()
  const nextAge = nextBirthday.getFullYear() - birthday.getFullYear()

  if (isToday) {
    return {
      nextAge,
      isToday: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    }
  }

  const diffMs = nextBirthday.getTime() - now.getTime()

  return {
    nextAge,
    isToday: false,
    days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diffMs % (1000 * 60)) / 1000),
  }
}

function normalizeParticipants(profileSource, approvedUser) {
  const data = profileSource?.data
  const order = Array.isArray(data?.participantOrder)
    ? data.participantOrder.filter(Boolean)
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

  let description =
    'Recent memories stay first, milestones stay close, and every lower-priority surface remains one deliberate step down.'

  if (recentMemories.state === 'unavailable') {
    description =
      'The editorial shell is ready, but the legacy archive still needs a narrow read-only bridge before recent memories can open here honestly.'
  } else if (memoryCount > 0) {
    description = `${memoryCount} ${pluralize(
      memoryCount,
      'memory',
    )} are ready to reopen first, with milestones and special pages kept close behind.`
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

function buildRecentMemoriesSection(memorySource) {
  const state = memorySource?.status || 'empty'
  const memories = Array.isArray(memorySource?.data?.memories) ? memorySource.data.memories : []
  const items = memories.slice(0, 3).map((memory) => ({
    id: memory.id,
    title: toTrimmedString(memory.title) || 'Untitled memory',
    description:
      toTrimmedString(memory.description) || 'A preserved archive entry is ready to be reopened once the full story surface lands.',
    dateLabel: formatDateLabel(memory.dateLabel),
    mediaKind: memory.mediaKind || 'unknown',
    source: memory.source || 'unknown',
    mediaLabel: memory.mediaPath ? 'Original media stays outside this shell.' : 'Text-only memory card.',
  }))

  let emptyTitle = 'This chapter is still waiting on its archive.'
  let emptyDescription = 'Recent memories will appear here once the routed shell has a safe read-only path to them.'

  if (state === 'empty') {
    emptyTitle = 'No recent memories are stored for this view yet.'
    emptyDescription = 'The dashboard frame is ready, but the shared archive has not placed a latest chapter here yet.'
  }

  if (state === 'invalid') {
    emptyTitle = 'Recent memory data needs attention before it can be shown.'
    emptyDescription = 'The routed shell is refusing to trust malformed legacy memory data.'
  }

  if (state === 'ready' && items.length === 0) {
    emptyTitle = 'The archive responded, but no recent memory cards were available.'
    emptyDescription = 'This route stays honest about the missing cards instead of inventing a story opening.'
  }

  return {
    eyebrow: 'Recent memories',
    title: 'The latest pages worth reopening',
    description: 'The story should open on what still feels closest, not on admin counters or utility surfaces.',
    state,
    source: memorySource?.source || 'unknown',
    totalCount: memories.length,
    items,
    action: { href: '/timeline', label: 'Open story' },
    emptyState: {
      title: emptyTitle,
      description: emptyDescription,
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
    .filter((participant) => participant.joinedDate)
    .map((participant) => {
      const duration = calculateDurationSince(participant.joinedDate, now)

      return {
        id: `${participant.username.toLowerCase()}-anniversary`,
        label: `${participant.shortName}'s view`,
        dateLabel: formatDateLabel(participant.joinedDate),
        duration,
        totalDaysLabel: `${duration.totalDays} ${pluralize(duration.totalDays, 'day')} together`,
      }
    })

  const birthdayCards = participants
    .filter((participant) => participant.birthday)
    .map((participant) => {
      const details = calculateBirthdayDetails(participant.birthday, now)

      return {
        id: `${participant.username.toLowerCase()}-birthday`,
        label: `${participant.shortName}'s birthday`,
        dateLabel: formatDateLabel(participant.birthday),
        countdownLabel: details.isToday
          ? 'Today'
          : `${details.days}d ${details.hours}h ${details.minutes}m ${details.seconds}s`,
        ageLabel: details.nextAge ? `Turning ${details.nextAge}` : 'Birthday not available',
        isToday: details.isToday,
      }
    })

  return {
    eyebrow: 'Milestones',
    title: 'Relationship time stays close at hand',
    description: 'Anniversary counters and birthdays remain supporting context instead of trying to become the whole page.',
    anniversaryCards,
    birthdayCards,
    hasContent: anniversaryCards.length > 0 || birthdayCards.length > 0,
    emptyState: {
      title: 'Milestones are waiting on the profile migration.',
      description: 'Joined dates and birthdays will appear once the shared profile read model is fully connected.',
    },
  }
}

function buildSpecialMomentsSection(routeMeta) {
  const descriptions = {
    '/birthday': 'The protected birthday page stays close without resurfacing public entry points.',
    '/valentine': 'A quieter special route, still private and still separate from the main archive flow.',
    '/confession': 'The preserved confession route remains protected while its content waits behind the new shell.',
  }

  return {
    eyebrow: 'Special moments',
    title: 'Pages with their own private chapter',
    description: 'The dedicated moment routes stay near the front without taking over the main reading order.',
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

  let summary = 'No legacy value is currently stored for this surface.'
  if (status === 'ready') summary = 'Read-only compatibility data is available for this surface.'
  if (status === 'unavailable') summary = 'This source remains intentionally disconnected until its read path is approved.'
  if (status === 'invalid') summary = 'The routed shell refused malformed legacy data for this surface.'

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
    title: 'Everything else stays one step down',
    description: 'Secondary routes remain reachable without competing with the story opening.',
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

export function buildDashboardReadModel({ approvedUser = null, compatibilitySnapshot = null, now = new Date(), routeMeta = [] } = {}) {
  const snapshot = compatibilitySnapshot || {
    status: 'empty',
    sources: {},
    warnings: [],
  }
  const participants = normalizeParticipants(snapshot.sources?.profile, approvedUser)
  const recentMemories = buildRecentMemoriesSection(snapshot.sources?.memories)
  const sourceState = buildSourceStateSection(snapshot)

  return {
    hero: buildHeroSection({
      approvedUser,
      participants,
      recentMemories,
      sourceState,
      now,
    }),
    recentMemories,
    milestones: buildMilestonesSection({
      participants,
      settingsSource: snapshot.sources?.settings,
      now,
    }),
    specialMoments: buildSpecialMomentsSection(routeMeta),
    sourceState,
    supportingNavigation: buildSupportingNavigation(routeMeta),
  }
}
