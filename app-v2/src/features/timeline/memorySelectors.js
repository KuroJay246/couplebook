import { freezeClone } from '../../data/adapterUtils.js'

function sortMemories(memories = []) {
  return [...memories].sort((left, right) => {
    if (left.sort.timestamp !== null && right.sort.timestamp !== null && left.sort.timestamp !== right.sort.timestamp) {
      return right.sort.timestamp - left.sort.timestamp
    }

    if (left.sort.timestamp !== null && right.sort.timestamp === null) return -1
    if (left.sort.timestamp === null && right.sort.timestamp !== null) return 1

    return left.sort.ordinal - right.sort.ordinal
  })
}

export function formatTimelineDate(dateValue, locale = 'en-US') {
  if (dateValue?.status !== 'valid' || dateValue.timestamp === null) return null

  return new Date(dateValue.timestamp).toLocaleDateString(locale, {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function selectTimelineDisplayTitle(memory) {
  if (memory.titleKind === 'authored' && memory.title) {
    return memory.title
  }

  const displayDate = formatTimelineDate(memory.date)
  if (memory.titleKind === 'generated-video' || memory.media.kind === 'video') {
    return displayDate ? `A video memory from ${displayDate}` : 'A video memory'
  }

  if (memory.titleKind === 'generated-photo' || memory.media.kind === 'image') {
    return displayDate ? `A photo from ${displayDate}` : 'A photo memory'
  }

  return displayDate ? `A moment from ${displayDate}` : 'A preserved memory'
}

export function selectTimelineDisplayDescription(memory) {
  if (memory.descriptionKind === 'authored' && memory.description) {
    return memory.description
  }

  return 'A moment preserved in the legacy book.'
}

export function selectTimelineTypeLabel(memory) {
  if (memory.specialMoment.isSpecial) return 'Special moment'
  if (memory.media.kind === 'video') return 'Video memory'
  if (memory.media.kind === 'image') return 'Photo memory'
  return 'Saved memory'
}

export function selectTimelineDisplayMemories(memories = []) {
  return freezeClone(
    sortMemories(memories).map((memory) => ({
      id: memory.id,
      title: memory.title,
      description: memory.description,
      displayTitle: selectTimelineDisplayTitle(memory),
      displayDescription: selectTimelineDisplayDescription(memory),
      displayDate: formatTimelineDate(memory.date),
      date: memory.date,
      tags: memory.tags,
      media: memory.media,
      specialMoment: memory.specialMoment,
      source: memory.source,
      warnings: memory.warnings,
      sort: memory.sort,
      typeLabel: selectTimelineTypeLabel(memory),
    })),
  )
}

export function buildTimelineSummary(memories = []) {
  return freezeClone(
    memories.reduce(
      (summary, memory) => {
        summary.totalMemories += 1
        if (memory.date.status === 'valid') {
          summary.datedMemories += 1
        } else {
          summary.undatedMemories += 1
        }

        if (memory.specialMoment.isSpecial) summary.specialMoments += 1
        if (memory.media.hasReference) summary.mediaReferences += 1
        if (memory.media.status === 'private-legacy-reference') summary.unavailableMedia += 1
        if (memory.media.status === 'invalid-reference') summary.invalidMedia += 1
        if (memory.media.kind === 'video') summary.videoMemories += 1
        if (memory.media.kind === 'image') summary.photoMemories += 1
        return summary
      },
      {
        totalMemories: 0,
        datedMemories: 0,
        undatedMemories: 0,
        specialMoments: 0,
        mediaReferences: 0,
        unavailableMedia: 0,
        invalidMedia: 0,
        videoMemories: 0,
        photoMemories: 0,
      },
    ),
  )
}

export function buildTimelineFilters(memories = []) {
  const tagMap = new Map()
  const yearMap = new Map()
  const typeMap = new Map()

  for (const memory of memories) {
    for (const tag of memory.tags) {
      if (!tagMap.has(tag.key)) {
        tagMap.set(tag.key, { key: tag.key, label: tag.label, count: 0 })
      }

      tagMap.get(tag.key).count += 1
    }

    if (memory.date.year !== null) {
      const yearKey = String(memory.date.year)
      if (!yearMap.has(yearKey)) {
        yearMap.set(yearKey, { key: yearKey, label: yearKey, count: 0 })
      }

      yearMap.get(yearKey).count += 1
    }

    const typeKeys = new Set()
    if (memory.specialMoment.isSpecial) typeKeys.add('special')
    if (memory.media.kind === 'image') typeKeys.add('photo')
    if (memory.media.kind === 'video') typeKeys.add('video')
    if (memory.media.status === 'none' || memory.media.status === 'special-route-only') typeKeys.add('no-media')

    for (const typeKey of typeKeys) {
      if (!typeMap.has(typeKey)) {
        const labels = {
          special: 'Special moments',
          photo: 'Photos',
          video: 'Videos',
          'no-media': 'No media',
        }

        typeMap.set(typeKey, { key: typeKey, label: labels[typeKey], count: 0 })
      }

      typeMap.get(typeKey).count += 1
    }
  }

  return freezeClone({
    availableTags: [...tagMap.values()].sort((left, right) => left.label.localeCompare(right.label)),
    availableTypes: [...typeMap.values()].sort((left, right) => left.label.localeCompare(right.label)),
    availableYears: [...yearMap.values()].sort((left, right) => Number(right.key) - Number(left.key)),
  })
}

function createMonthLabel(year, month) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  })
}

function buildMonthGroups(memories, year) {
  const monthMap = new Map()

  for (const memory of memories) {
    const monthKey = `${year}-${String(memory.date.month).padStart(2, '0')}`
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, [])
    }

    monthMap.get(monthKey).push(memory)
  }

  return [...monthMap.entries()]
    .sort(([leftKey], [rightKey]) => rightKey.localeCompare(leftKey))
    .map(([monthKey, monthMemories]) => ({
      id: `month:${monthKey}`,
      label: createMonthLabel(year, monthMemories[0].date.month),
      kind: 'month',
      memories: monthMemories,
    }))
}

function buildYearChapter(year, yearMemories) {
  const specialMemories = yearMemories.filter((memory) => memory.specialMoment.isSpecial)
  const regularMemories = yearMemories.filter((memory) => !memory.specialMoment.isSpecial)
  const groups = []

  if (specialMemories.length > 0) {
    groups.push({
      id: `year:${year}:special`,
      label: 'Special moments',
      kind: 'special',
      memories: specialMemories,
    })
  }

  if (regularMemories.length > 0) {
    const monthGroups = buildMonthGroups(regularMemories, year)
    if (regularMemories.length <= 3 || monthGroups.length <= 1) {
      groups.push({
        id: `year:${year}:everyday`,
        label: 'Everyday memories',
        kind: 'regular',
        memories: regularMemories,
      })
    } else {
      groups.push(...monthGroups)
    }
  }

  return {
    id: `year:${year}`,
    label: String(year),
    kind: 'year',
    period: {
      type: 'year',
      year,
    },
    memories: yearMemories,
    groups,
  }
}

function buildUndatedChapter(memories) {
  const missingDateMemories = memories.filter((memory) => memory.date.status === 'missing')
  const invalidDateMemories = memories.filter((memory) => memory.date.status === 'invalid')
  const groups = []

  if (missingDateMemories.length > 0) {
    groups.push({
      id: 'undated:missing',
      label: 'Undated memories',
      kind: 'undated',
      memories: missingDateMemories,
    })
  }

  if (invalidDateMemories.length > 0) {
    groups.push({
      id: 'undated:invalid',
      label: 'Needs date review',
      kind: 'invalid-date',
      memories: invalidDateMemories,
    })
  }

  if (groups.length === 0) return null

  return {
    id: 'undated',
    label: 'Undated memories',
    kind: 'undated',
    period: {
      type: 'undated',
      year: null,
    },
    memories,
    groups,
  }
}

export function buildTimelineChapters(memories = []) {
  const displayMemories = selectTimelineDisplayMemories(memories)
  const datedMemories = displayMemories.filter((memory) => memory.date.status === 'valid')
  const undatedMemories = displayMemories.filter((memory) => memory.date.status !== 'valid')
  const yearMap = new Map()

  for (const memory of datedMemories) {
    const year = memory.date.year
    if (!yearMap.has(year)) {
      yearMap.set(year, [])
    }

    yearMap.get(year).push(memory)
  }

  const chapters = [...yearMap.entries()]
    .sort(([leftYear], [rightYear]) => Number(rightYear) - Number(leftYear))
    .map(([year, yearMemories]) => buildYearChapter(year, yearMemories))

  const undatedChapter = buildUndatedChapter(undatedMemories)
  if (undatedChapter) {
    chapters.push(undatedChapter)
  }

  return freezeClone(chapters)
}
