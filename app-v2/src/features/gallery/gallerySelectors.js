import { deepFreeze, freezeClone } from '../../data/adapterUtils.js'
import { selectTimelineDisplayMemories } from '../memories/memorySelectors.js'

const INDEXED_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric',
})

function sortByNewest(items = []) {
  return items.toSorted((left, right) => {
    if (left.sort.timestamp !== null && right.sort.timestamp !== null && left.sort.timestamp !== right.sort.timestamp) {
      return right.sort.timestamp - left.sort.timestamp
    }

    if (left.sort.timestamp !== null && right.sort.timestamp === null) return -1
    if (left.sort.timestamp === null && right.sort.timestamp !== null) return 1

    return left.sort.ordinal - right.sort.ordinal
  })
}

function createMonthLabel(date) {
  if (date.status !== 'valid') return 'Date to review'

  return new Date(Date.UTC(date.year, date.month - 1, 1)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  })
}

function createDayLabel(date) {
  if (date.status !== 'valid') return 'Needs date review'

  return new Date(Date.UTC(date.year, date.month - 1, date.day || 1)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
  })
}

function normalizeIndexedDate(value) {
  const original = String(value || '').trim()
  if (!original) {
    return {
      original: null,
      status: 'missing',
      precision: 'none',
      timestamp: null,
      year: null,
      month: null,
      day: null,
    }
  }

  const timestamp = Date.parse(original)
  if (Number.isNaN(timestamp)) {
    return {
      original,
      status: 'invalid',
      precision: 'invalid',
      timestamp: null,
      year: null,
      month: null,
      day: null,
    }
  }

  const date = new Date(timestamp)
  return {
    original,
    status: 'valid',
    precision: original.length <= 10 ? 'date-only' : 'date-time',
    timestamp,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

function formatIndexedDate(date) {
  if (date.status !== 'valid') return ''
  return INDEXED_DATE_FORMATTER.format(new Date(date.timestamp))
}

function matchesGalleryFilter(item, filter) {
  if (filter === 'photos') return item.media.kind === 'image'
  if (filter === 'videos') return item.media.kind === 'video'
  if (filter === 'favorites') return item.media.favorite === true
  if (filter === 'unlinked') return (item.media.kind === 'image' || item.media.kind === 'video') && !item.memoryId && !item.media.linkedMemoryId
  return true
}

function matchesGalleryYear(item, year) {
  if (year === 'all') return true
  return String(item.date?.year || '') === year
}

function matchesGallerySearch(item, search) {
  const normalizedSearch = String(search || '').trim().toLowerCase()
  if (!normalizedSearch) return true

  return [item.title, item.description, item.displayDate, ...(item.tags || []).map((tag) => tag.label)]
    .join(' ')
    .toLowerCase()
    .includes(normalizedSearch)
}

export function classifyGalleryMediaStatus(media) {
  if (media?.status === 'storage-verified') return 'storage-verified'
  if (media?.status === 'drive-verified') return 'drive-verified'
  if (media?.status === 'drive-indexed') return 'drive-indexed'
  if (media?.isAvailableInApp === true) return 'available-local-reference'
  if (media?.status === 'private-legacy-reference') return 'private-legacy-reference'
  if (media?.status === 'special-route-only') return 'special-route-only'
  if (media?.status === 'invalid-reference') return 'invalid'
  if (media?.status === 'unavailable') return 'unavailable'
  if (media?.hasReference === true) return 'unavailable'
  return 'no-media'
}

function buildGalleryItem(memory, index) {
  const mediaStatus = classifyGalleryMediaStatus(memory.media)
  const media = memory.media || {}
  const mediaKind = media.kind === 'image' || media.kind === 'video' ? media.kind : 'none'

  const galleryItem = {
    key: `gallery-item-${String(index + 1).padStart(4, '0')}`,
    title: memory.displayTitle,
    description: memory.displayDescription,
    displayDate: memory.displayDate,
    date: {
      status: memory.date.status,
      year: memory.date.year,
      month: memory.date.month,
    },
    monthLabel: createMonthLabel(memory.date),
    typeLabel: memory.specialMoment.isSpecial ? 'Special moment' : mediaKind === 'video' ? 'Video memory' : mediaKind === 'image' ? 'Photo memory' : 'Saved memory',
    media: {
      id: media.id || '',
      kind: mediaKind,
      type: media.type || mediaKind,
      status: mediaStatus,
      provider: media.provider || '',
      providerFileId: media.providerFileId || '',
      hasReference: media.hasReference,
      isAvailableInApp: media.isAvailableInApp === true,
      storagePath: media.storagePath || '',
      thumbnailPath: media.thumbnailPath || '',
      posterPath: media.posterPath || '',
      driveFileId: media.driveFileId || '',
      driveFolderId: media.driveFolderId || '',
      contentType: media.contentType || '',
      mimeType: media.mimeType || media.contentType || '',
      sizeBytes: media.sizeBytes || 0,
    },
    specialMoment: {
      isSpecial: memory.specialMoment.isSpecial,
      route: memory.specialMoment.route,
      routeStatus: memory.specialMoment.routeStatus,
    },
    tags: memory.tags,
    sort: memory.sort,
  }

  Object.defineProperties(galleryItem, {
    memoryId: {
      value: memory.id,
      enumerable: true,
      writable: false,
    },
    memoryRevision: {
      value: memory.revision,
      enumerable: true,
      writable: false,
    },
  })

  return galleryItem
}

function buildMediaIndexGalleryItem(record, index) {
  const mediaType = record.mediaType === 'video' ? 'video' : 'image'
  const dateSource = record.capturedAt
    ? 'captured'
    : record.createdTime
      ? 'drive-created'
      : record.modifiedTime
        ? 'drive-modified'
        : 'missing'
  const date = normalizeIndexedDate(record.capturedAt || record.createdTime || record.modifiedTime)
  const title = record.caption || record.fileName || (mediaType === 'video' ? 'Drive video' : 'Drive photo')
  const description = record.caption
    ? `Indexed from the private Google Drive folder as ${record.fileName || 'private media'}.`
    : 'Indexed from the private Google Drive folder for fast Album browsing.'

  const galleryItem = {
    key: `media-index-${record.mediaId || String(index + 1).padStart(4, '0')}`,
    title,
    description,
    displayDate: formatIndexedDate(date),
    date,
    monthLabel: createMonthLabel(date),
    typeLabel: mediaType === 'video' ? 'Indexed video' : 'Indexed photo',
    media: {
      id: record.mediaId || '',
      kind: mediaType,
      type: mediaType,
      status: 'drive-indexed',
      provider: 'google-drive',
      providerFileId: record.driveFileId || '',
      hasReference: true,
      isAvailableInApp: true,
      storagePath: '',
      thumbnailPath: '',
      posterPath: '',
      driveFileId: record.driveFileId || '',
      driveFolderId: record.driveFolderId || '',
      contentType: record.mimeType || '',
      mimeType: record.mimeType || '',
      sizeBytes: record.sizeBytes || 0,
      width: record.width || null,
      height: record.height || null,
      durationMillis: record.durationMillis || null,
      favorite: record.favorite === true,
      caption: record.caption || '',
      linkedMemoryId: record.linkedMemoryId || record.memoryId || '',
      dateSource,
    },
    specialMoment: {
      isSpecial: false,
      route: null,
      routeStatus: 'none',
    },
    tags: [
      { key: mediaType, label: mediaType === 'video' ? 'Video' : 'Photo' },
      record.favorite === true ? { key: 'favorite', label: 'Favorite' } : null,
    ].filter(Boolean),
    sort: {
      ordinal: index,
      timestamp: date.timestamp,
    },
  }

  Object.defineProperties(galleryItem, {
    mediaIndexId: {
      value: record.mediaId || '',
      enumerable: true,
      writable: false,
    },
    memoryId: {
      value: record.linkedMemoryId || record.memoryId || '',
      enumerable: true,
      writable: false,
    },
    memoryRevision: {
      value: 0,
      enumerable: true,
      writable: false,
    },
  })

  return galleryItem
}

export function selectFilteredGalleryItems(items = [], { filter = 'all', search = '', year = 'all' } = {}) {
  return deepFreeze((Array.isArray(items) ? items : []).filter((item) => (
    matchesGalleryFilter(item, filter)
    && matchesGalleryYear(item, year)
    && matchesGallerySearch(item, search)
  )))
}

export function groupGalleryItemsByYear(items = []) {
  const map = new Map()
  for (const item of Array.isArray(items) ? items : []) {
    const key = item.date?.year ? String(item.date.year) : 'Date review'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(item)
  }

  return freezeClone([...map.entries()]
    .sort(([left], [right]) => {
      if (left === 'Date review') return 1
      if (right === 'Date review') return -1
      return Number(right) - Number(left)
    })
    .map(([yearLabel, yearItems]) => ({
      id: `album-${yearLabel}`,
      yearLabel,
      featured: yearItems[0],
      items: yearItems,
    })))
}

function dateGroupKey(item) {
  const date = item.date || {}
  if (date.status !== 'valid') return 'date-review'
  const day = String(date.day || 1).padStart(2, '0')
  return `${date.year}-${String(date.month).padStart(2, '0')}-${day}`
}

export function groupGalleryItemsByDate(items = []) {
  const map = new Map()
  for (const item of Array.isArray(items) ? items : []) {
    const key = dateGroupKey(item)
    if (!map.has(key)) {
      map.set(key, {
        id: `album-day-${key}`,
        key,
        monthLabel: item.monthLabel || createMonthLabel(item.date || {}),
        dayLabel: createDayLabel(item.date || {}),
        sortTimestamp: item.sort?.timestamp ?? null,
        dateSource: item.media?.dateSource || 'memory-date',
        items: [],
      })
    }
    map.get(key).items.push(item)
  }

  return freezeClone([...map.values()].sort((left, right) => {
    if (left.key === 'date-review') return 1
    if (right.key === 'date-review') return -1
    return (right.sortTimestamp ?? 0) - (left.sortTimestamp ?? 0)
  }))
}

export function buildMediaLibrary(items = []) {
  const visualItems = (Array.isArray(items) ? items : []).filter((item) => item.media.kind === 'image' || item.media.kind === 'video')
  const groups = groupGalleryItemsByDate(visualItems)
  return freezeClone({
    groups,
    visualCount: visualItems.length,
    favoriteCount: visualItems.filter((item) => item.media.favorite === true).length,
    unlinkedCount: visualItems.filter((item) => !item.memoryId && !item.media.linkedMemoryId).length,
  })
}

export function selectGalleryItems(memories = []) {
  const displayMemories = selectTimelineDisplayMemories(memories)
  return deepFreeze(sortByNewest(displayMemories).map((memory, index) => buildGalleryItem(memory, index)))
}

export function selectMediaIndexGalleryItems(records = []) {
  const activeRecords = (Array.isArray(records) ? records : [])
    .filter((record) => record?.deleted !== true && record?.provider === 'google-drive' && (record.mediaType === 'image' || record.mediaType === 'video'))
  return deepFreeze(sortByNewest(activeRecords.map((record, index) => buildMediaIndexGalleryItem(record, index))))
}

export function buildGallerySummary(items = []) {
  return freezeClone(
    items.reduce(
      (summary, item) => {
        summary.totalMemories += 1
        if (item.media.kind === 'image' || item.media.kind === 'video') summary.visualMemories += 1
        if (item.media.kind === 'image') summary.photos += 1
        if (item.media.kind === 'video') summary.videos += 1
        if (item.specialMoment.isSpecial) summary.specialMoments += 1
        if (item.media.status === 'private-legacy-reference' || item.media.status === 'unavailable') summary.unavailableMedia += 1
        if (item.media.status === 'invalid') summary.invalidMedia += 1
        if (item.media.status === 'no-media' || item.media.status === 'special-route-only') summary.noMedia += 1
        if (item.media.status === 'drive-indexed') summary.indexedDriveMedia += 1
        return summary
      },
      {
        totalMemories: 0,
        visualMemories: 0,
        photos: 0,
        videos: 0,
        specialMoments: 0,
        unavailableMedia: 0,
        invalidMedia: 0,
        noMedia: 0,
        indexedDriveMedia: 0,
      },
    ),
  )
}

function collection(key, label, description, items) {
  return {
    key,
    label,
    description,
    count: items.length,
    items,
  }
}

export function buildGalleryCollections(items = []) {
  const visualItems = items.filter((item) => item.media.kind === 'image' || item.media.kind === 'video')
  const photos = visualItems.filter((item) => item.media.kind === 'image')
  const videos = visualItems.filter((item) => item.media.kind === 'video')
  const specialMoments = items.filter((item) => item.specialMoment.isSpecial)
  const unavailableMedia = items.filter((item) => item.media.status === 'private-legacy-reference' || item.media.status === 'unavailable' || item.media.status === 'invalid')
  const indexedDriveMedia = items.filter((item) => item.media.status === 'drive-indexed')
  const yearMap = new Map()

  for (const item of visualItems) {
    const yearKey = item.date.year === null ? 'date-review' : String(item.date.year)
    if (!yearMap.has(yearKey)) {
      yearMap.set(yearKey, [])
    }
    yearMap.get(yearKey).push(item)
  }

  const yearCollections = [...yearMap.entries()]
    .sort(([left], [right]) => {
      if (left === 'date-review') return 1
      if (right === 'date-review') return -1
      return Number(right) - Number(left)
    })
    .map(([year, yearItems]) =>
      collection(
        `year-${year}`,
        year === 'date-review' ? 'Date review' : year,
        year === 'date-review' ? 'Visual memories waiting for date review.' : `Visual memories from ${year}.`,
        yearItems,
      ),
    )

  return freezeClone({
    featured: [
      collection('recent-visual-memories', 'Recent visual memories', 'Newest photo and video memories with safe metadata only.', visualItems.slice(0, 8)),
      collection('photos', 'Photos', 'Still visual memories without fetching image files.', photos),
      collection('videos', 'Video memories', 'Video memories without loading playback sources.', videos),
      collection('indexed-drive-media', 'Indexed Drive media', 'Fast Firestore media index records without temporary preview URLs.', indexedDriveMedia),
      collection('special-moments', 'Special moments', 'Approved special routes represented without importing special-page content.', specialMoments),
      collection('private-media-references', 'Private media references', 'Media references that stay unavailable until a safe private inventory exists.', unavailableMedia),
    ],
    years: yearCollections,
  })
}

export function buildGalleryFilters(items = []) {
  const yearMap = new Map()
  const typeMap = new Map([
    ['all', { key: 'all', label: 'All visual memories', count: items.length }],
    ['photos', { key: 'photos', label: 'Photos', count: 0 }],
    ['videos', { key: 'videos', label: 'Videos', count: 0 }],
    ['favorites', { key: 'favorites', label: 'Favorites', count: 0 }],
    ['unlinked', { key: 'unlinked', label: 'Unlinked', count: 0 }],
    ['special', { key: 'special', label: 'Special moments', count: 0 }],
    ['unavailable', { key: 'unavailable', label: 'Unavailable media', count: 0 }],
  ])
  const photoFilter = typeMap.get('photos')
  const videoFilter = typeMap.get('videos')
  const favoriteFilter = typeMap.get('favorites')
  const unlinkedFilter = typeMap.get('unlinked')
  const specialFilter = typeMap.get('special')
  const unavailableFilter = typeMap.get('unavailable')

  for (const item of items) {
    const media = item.media || {}
    if (item.date.year !== null) {
      const yearKey = String(item.date.year)
      if (!yearMap.has(yearKey)) {
        yearMap.set(yearKey, { key: yearKey, label: yearKey, count: 0 })
      }
      const yearFilter = yearMap.get(yearKey)
      yearFilter.count += 1
    }

    if (media.kind === 'image') photoFilter.count += 1
    if (media.kind === 'video') videoFilter.count += 1
    if (media.favorite === true) favoriteFilter.count += 1
    if ((media.kind === 'image' || media.kind === 'video') && !item.memoryId && !media.linkedMemoryId) {
      unlinkedFilter.count += 1
    }
    if (item.specialMoment.isSpecial) specialFilter.count += 1
    if (['private-legacy-reference', 'unavailable', 'invalid'].includes(item.media.status)) {
      unavailableFilter.count += 1
    }
  }

  return freezeClone({
    availableTypes: [...typeMap.values()].filter((type) => type.key === 'all' || type.count > 0),
    availableYears: [...yearMap.values()].sort((left, right) => Number(right.key) - Number(left.key)),
  })
}
