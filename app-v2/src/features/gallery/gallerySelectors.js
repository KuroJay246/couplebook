import { deepFreeze, freezeClone } from '../../data/adapterUtils.js'
import { selectTimelineDisplayMemories } from '../memories/memorySelectors.js'

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

function matchesGalleryFilter(item, filter) {
  if (filter === 'photos') return item.media.kind === 'image'
  if (filter === 'videos') return item.media.kind === 'video'
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

export function selectGalleryItems(memories = []) {
  const displayMemories = selectTimelineDisplayMemories(memories)
  return deepFreeze(sortByNewest(displayMemories).map((memory, index) => buildGalleryItem(memory, index)))
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
    ['special', { key: 'special', label: 'Special moments', count: 0 }],
    ['unavailable', { key: 'unavailable', label: 'Unavailable media', count: 0 }],
  ])

  for (const item of items) {
    if (item.date.year !== null) {
      const yearKey = String(item.date.year)
      if (!yearMap.has(yearKey)) {
        yearMap.set(yearKey, { key: yearKey, label: yearKey, count: 0 })
      }
      yearMap.get(yearKey).count += 1
    }

    if (item.media.kind === 'image') typeMap.get('photos').count += 1
    if (item.media.kind === 'video') typeMap.get('videos').count += 1
    if (item.specialMoment.isSpecial) typeMap.get('special').count += 1
    if (['private-legacy-reference', 'unavailable', 'invalid'].includes(item.media.status)) {
      typeMap.get('unavailable').count += 1
    }
  }

  return freezeClone({
    availableTypes: [...typeMap.values()].filter((type) => type.key === 'all' || type.count > 0),
    availableYears: [...yearMap.values()].sort((left, right) => Number(right.key) - Number(left.key)),
  })
}
