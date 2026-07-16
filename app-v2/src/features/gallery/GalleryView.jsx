import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EditorialEmptyState, EditorialSection, QuietStatus, SharedSpaceHeader } from '../../components/PageLayout'

const COLLECTION_LIMIT = 4
const TYPE_FILTERS = Object.freeze([
  { key: 'all', label: 'All' },
  { key: 'photos', label: 'Photos' },
  { key: 'videos', label: 'Videos' },
  { key: 'special', label: 'Special moments' },
  { key: 'private', label: 'Private media' },
])

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function renderGalleryStatusLabel(status) {
  if (status === 'ready') return 'Read-only archive'
  if (status === 'partial') return 'Partial archive'
  if (status === 'unavailable') return 'Archive unavailable'
  if (status === 'invalid') return 'Needs review'
  return 'Awaiting visual entries'
}

function renderCompatibilityStateLabel(compatibilityState) {
  if (compatibilityState === 'loading') return 'Refreshing'
  if (compatibilityState === 'error') return 'Needs review'
  if (compatibilityState === 'ready') return 'Ready'
  return 'Waiting'
}

function describeGalleryState(model) {
  if (model.status === 'ready') {
    return 'The visual archive now opens as a private, read-only collection of photo, video, and special-moment references without reopening private files.'
  }

  if (model.status === 'partial') {
    return 'Some visual references are readable here now, while unavailable media and deferred inventory stay clearly marked.'
  }

  if (model.status === 'unavailable') {
    return 'The private visual archive has not been connected to this build yet. The route stays live without pretending the archive is empty.'
  }

  if (model.status === 'invalid') {
    return 'Stored visual metadata needs review before this route can safely render the archive.'
  }

  return 'This route is ready for protected visual references, but no readable Gallery entries are available in this build yet.'
}

function getAllGalleryItems(model) {
  const byKey = new Map()
  const addItems = (items = []) => {
    for (const item of items) {
      byKey.set(item.key, item)
    }
  }

  addItems(model.photos)
  addItems(model.videos)
  addItems(model.unavailableMedia)
  addItems(model.collections.featured.find((collection) => collection.key === 'special-moments')?.items || [])

  return [...byKey.values()].sort((left, right) => {
    if (left.sort.timestamp !== null && right.sort.timestamp !== null && left.sort.timestamp !== right.sort.timestamp) {
      return right.sort.timestamp - left.sort.timestamp
    }

    if (left.sort.timestamp !== null && right.sort.timestamp === null) return -1
    if (left.sort.timestamp === null && right.sort.timestamp !== null) return 1

    return left.sort.ordinal - right.sort.ordinal
  })
}

function matchesTypeFilter(item, type) {
  if (type === 'all') return true
  if (type === 'photos') return item.media.kind === 'image'
  if (type === 'videos') return item.media.kind === 'video'
  if (type === 'special') return item.specialMoment.isSpecial
  if (type === 'private') return ['private-legacy-reference', 'unavailable', 'invalid'].includes(item.media.status)
  return true
}

function filterItems(items, filters) {
  return items.filter((item) => {
    if (!matchesTypeFilter(item, filters.type)) return false
    if (filters.year !== 'all' && String(item.date.year) !== filters.year) return false
    return true
  })
}

function groupByYear(items) {
  const yearMap = new Map()
  for (const item of items) {
    const key = item.date.year === null ? 'date-review' : String(item.date.year)
    if (!yearMap.has(key)) {
      yearMap.set(key, [])
    }
    yearMap.get(key).push(item)
  }

  return [...yearMap.entries()]
    .sort(([left], [right]) => {
      if (left === 'date-review') return 1
      if (right === 'date-review') return -1
      return Number(right) - Number(left)
    })
    .map(([key, yearItems]) => ({
      key: `year-${key}`,
      label: key === 'date-review' ? 'Date review' : key,
      description: key === 'date-review' ? 'Visual references waiting for date review.' : `Visual references from ${key}.`,
      items: yearItems,
    }))
}

function mediaStatusLabel(item) {
  if (item.media.status === 'private-legacy-reference') {
    return item.media.kind === 'video' ? 'Private video remains in the legacy book' : 'Private photo remains in the legacy book'
  }

  if (item.media.status === 'invalid') return 'Media reference held for review'
  if (item.media.status === 'unavailable') return 'Media unavailable in this build'
  if (item.media.status === 'special-route-only') return 'Protected special route'
  if (item.media.status === 'available-local-reference') return 'Local reference not previewed'
  return 'No media preview'
}

function OpeningNote({ model }) {
  return (
    <QuietStatus
      className="gallery-opening-note"
      description="Gallery reads safe metadata only. Media previews, uploads, lightboxes, video playback, and synchronization stay outside this route."
      eyebrow={renderGalleryStatusLabel(model.status)}
      items={[
        pluralize(model.summary.photos, 'photo reference'),
        pluralize(model.summary.videos, 'video reference'),
        pluralize(model.summary.unavailableMedia + model.summary.invalidMedia, 'private media item'),
      ]}
      title="The archive stays visual without exposing private files."
    />
  )
}

function GalleryFilters({ filters, model, onChange }) {
  return (
    <div className="gallery-toolbar" aria-label="Gallery filters">
      <div className="gallery-filter-group" role="group" aria-label="Visual type">
        {TYPE_FILTERS.map((filter) => {
          const active = filters.type === filter.key
          return (
            <button
              aria-pressed={active}
              className={`gallery-filter-button ${active ? 'gallery-filter-button-active' : ''}`}
              key={filter.key}
              onClick={() => onChange({ ...filters, type: filter.key })}
              type="button"
            >
              {filter.label}
            </button>
          )
        })}
      </div>
      <label className="gallery-year-filter">
        <span>Year</span>
        <select value={filters.year} onChange={(event) => onChange({ ...filters, year: event.target.value })}>
          <option value="all">All years</option>
          {model.filters.availableYears.map((year) => (
            <option key={year.key} value={year.key}>
              {year.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function GallerySummary({ model }) {
  const years = model.filters.availableYears.length

  return (
    <div className="gallery-summary-grid" aria-label="Gallery summary">
      <article>
        <strong>{model.summary.photos}</strong>
        <span>Photo references</span>
      </article>
      <article>
        <strong>{model.summary.videos}</strong>
        <span>Video references</span>
      </article>
      <article>
        <strong>{years}</strong>
        <span>{years === 1 ? 'Year represented' : 'Years represented'}</span>
      </article>
      <article>
        <strong>{model.summary.specialMoments}</strong>
        <span>Special references</span>
      </article>
    </div>
  )
}

function GalleryItem({ item }) {
  const typeMark = item.media.kind === 'video' ? 'Motion' : item.specialMoment.isSpecial ? 'Special' : 'Image'

  return (
    <article className={`gallery-item-card gallery-item-card-${item.media.status}`}>
      <div className="gallery-item-frame" aria-hidden="true">
        <span>{typeMark}</span>
      </div>
      <div className="gallery-item-copy">
        <div className="gallery-item-meta">
          <span>{item.typeLabel}</span>
          <span>{item.displayDate || 'Date to review'}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
      <div className="gallery-item-footer">
        <span className="gallery-media-status">{mediaStatusLabel(item)}</span>
        {item.specialMoment.route ? (
          <Link className="gallery-special-link" to={item.specialMoment.route}>
            Open protected moment
          </Link>
        ) : null}
      </div>
    </article>
  )
}

function GalleryCollection({ collection, expandedCollections, onToggle }) {
  const isExpandable = collection.items.length > COLLECTION_LIMIT
  const isExpanded = expandedCollections.has(collection.key)
  const visibleItems = isExpandable && !isExpanded ? collection.items.slice(0, COLLECTION_LIMIT) : collection.items

  if (collection.items.length === 0) return null

  return (
    <section className="gallery-collection" aria-labelledby={`gallery-collection-${collection.key}`}>
      <div className="gallery-collection-heading">
        <div>
          <span className="folio-mark">{pluralize(collection.items.length, 'entry')}</span>
          <h3 id={`gallery-collection-${collection.key}`}>{collection.label}</h3>
          <p>{collection.description}</p>
        </div>
      </div>
      <div className="gallery-item-grid">
        {visibleItems.map((item) => (
          <GalleryItem item={item} key={item.key} />
        ))}
      </div>
      {isExpandable ? (
        <button
          aria-expanded={isExpanded}
          className="gallery-show-more"
          onClick={() => onToggle(collection.key)}
          type="button"
        >
          {isExpanded ? 'Show less' : `Show ${collection.items.length - COLLECTION_LIMIT} more`}
        </button>
      ) : null}
    </section>
  )
}

function GalleryCollections({ collections }) {
  const [expandedCollections, setExpandedCollections] = useState(() => new Set())

  const toggleCollection = (collectionKey) => {
    setExpandedCollections((current) => {
      const next = new Set(current)
      if (next.has(collectionKey)) {
        next.delete(collectionKey)
      } else {
        next.add(collectionKey)
      }
      return next
    })
  }

  return (
    <div className="gallery-collection-stack">
      {collections.map((collection) => (
        <GalleryCollection
          collection={collection}
          expandedCollections={expandedCollections}
          key={collection.key}
          onToggle={toggleCollection}
        />
      ))}
    </div>
  )
}

function GalleryEmptyState({ model }) {
  if (model.status === 'unavailable') {
    return (
      <EditorialEmptyState
        description="The private visual archive is not connected to this build. This is a source boundary, not an empty collection."
        title="The visual archive is unavailable here."
        titleAs="h3"
      />
    )
  }

  if (model.status === 'invalid') {
    return (
      <EditorialEmptyState
        description="The page is holding back stored visual metadata until it can be reviewed safely."
        title="The visual archive needs review."
        titleAs="h3"
      />
    )
  }

  return (
    <EditorialEmptyState
      description="Try another type or year filter. Gallery keeps entries read-only and does not invent missing visuals."
      title="No Gallery entries match this view."
      titleAs="h3"
    />
  )
}

function SourceStateSection({ compatibilityError, compatibilityState, model, onRefresh }) {
  const sourceCards = [
    {
      key: 'memoryArchive',
      label: model.sourceStatus.memoryArchive.label,
      status: model.sourceStatus.memoryArchive.status,
      summary:
        model.sourceStatus.memoryArchive.status === 'ready'
          ? `${pluralize(model.sourceStatus.memoryArchive.count, 'memory record')} available as safe metadata.`
          : 'The private story archive is not connected in this build.',
    },
    {
      key: 'mediaInventory',
      label: model.sourceStatus.mediaInventory.label,
      status: model.sourceStatus.mediaInventory.status,
      summary: 'Media inventory, previews, playback, uploads, and Storage remain deferred.',
    },
    {
      key: 'bridge',
      label: 'Read bridge',
      status: model.sourceStatus.bridge.status,
      summary: `${pluralize(model.sourceStatus.bridge.warningCount, 'review note')} recorded without exposing technical details.`,
    },
  ]

  return (
    <EditorialSection
      action={{ label: 'Refresh reads', onClick: onRefresh, tone: 'secondary' }}
      className="gallery-section"
      description="Gallery reports source state without exposing storage keys, raw media values, adapter names, or old static routes."
      eyebrow="Source status"
      title="Source status stays quiet and safe."
    >
      <div className="source-status-toolbar">
        <div className="source-status-copy">
          <span className="source-status-pill">{renderCompatibilityStateLabel(compatibilityState)}</span>
          <p>Unavailable, empty, partial, and invalid states stay distinct so Gallery never becomes a broken media grid.</p>
        </div>
      </div>
      {compatibilityError ? (
        <div className="dashboard-inline-alert">
          <strong>Compatibility refresh issue</strong>
          <p>The latest protected refresh did not complete. Existing read-only Gallery metadata remains unchanged.</p>
        </div>
      ) : null}
      <div className="source-status-grid">
        {sourceCards.map((item) => (
          <article className="source-card" key={item.key}>
            <div className="source-card-header">
              <strong>{item.label}</strong>
              <span className={`source-card-status source-card-status-${item.status}`}>{item.status}</span>
            </div>
            <p>{item.summary}</p>
          </article>
        ))}
      </div>
    </EditorialSection>
  )
}

export function GalleryView({ compatibilityError, compatibilityState, model, onRefresh }) {
  const [filters, setFilters] = useState({ type: 'all', year: 'all' })
  const allItems = getAllGalleryItems(model)
  const filteredItems = filterItems(allItems, filters)
  const recentCollection = {
    key: 'recent-filtered',
    label: 'Recent visual memories',
    description: 'Newest photo, video, and protected special references with private media kept closed.',
    items: filteredItems.slice(0, 8),
  }
  const yearCollections = groupByYear(filteredItems)
  const privateCollection = {
    key: 'private-filtered',
    label: 'Private media references',
    description: 'Visual memories connected to the story while the media itself remains outside this build.',
    items: filteredItems.filter((item) => ['private-legacy-reference', 'unavailable', 'invalid'].includes(item.media.status)),
  }
  const specialCollection = {
    key: 'special-filtered',
    label: 'Special moments',
    description: 'Protected special routes represented without importing private page content.',
    items: filteredItems.filter((item) => item.specialMoment.isSpecial),
  }
  const collections = [recentCollection, ...yearCollections, privateCollection, specialCollection].filter(
    (collection) => collection.items.length > 0,
  )

  return (
    <section className="gallery-page">
      <SharedSpaceHeader
        actions={[
          { href: '/timeline', label: 'Open timeline' },
          { href: '/profile', label: 'Open profile', tone: 'secondary' },
        ]}
        aside={<OpeningNote model={model} />}
        className="gallery-hero"
        description={describeGalleryState(model)}
        eyebrow="Gallery"
        folio={renderGalleryStatusLabel(model.status)}
        title="Our visual archive"
      />

      <EditorialSection
        className="gallery-section"
        description="Photo, video, and special-route references stay grouped as a private collection without loading private media."
        eyebrow="Archive"
        title="Moments kept in pictures and motion."
      >
        <GallerySummary model={model} />
        <GalleryFilters filters={filters} model={model} onChange={setFilters} />
        {compatibilityState === 'loading' && model.summary.totalMemories === 0 ? (
          <EditorialEmptyState
            description="The protected shell is restoring read-only Gallery metadata."
            title="Restoring Gallery reads."
            titleAs="h3"
          />
        ) : collections.length > 0 ? (
          <GalleryCollections collections={collections} />
        ) : (
          <GalleryEmptyState model={model} />
        )}
      </EditorialSection>

      <SourceStateSection
        compatibilityError={compatibilityError}
        compatibilityState={compatibilityState}
        model={model}
        onRefresh={onRefresh}
      />
    </section>
  )
}
