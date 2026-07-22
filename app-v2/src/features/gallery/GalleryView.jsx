import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { EditorialEmptyState, EditorialSection, QuietStatus, SharedSpaceHeader } from '../../components/PageLayout'
import { resolveMediaUrl } from '../../services/mediaService'

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
  if (item.media.status === 'storage-verified') {
    return item.media.kind === 'video' ? 'Verified private video' : 'Verified private photo'
  }

  if (item.media.status === 'private-legacy-reference') {
    return item.media.kind === 'video' ? 'Private video remains in the legacy book' : 'Private photo remains in the legacy book'
  }

  if (item.media.status === 'invalid') return 'Media reference held for review'
  if (item.media.status === 'unavailable') return 'Media unavailable in this build'
  if (item.media.status === 'special-route-only') return 'Protected special route'
  if (item.media.status === 'available-local-reference') return 'Local reference not previewed'
  return 'No media preview'
}

function getPreviewStoragePath(item) {
  if (item.media.status !== 'storage-verified') return ''
  return item.media.thumbnailPath || item.media.posterPath || (item.media.kind === 'image' ? item.media.storagePath : '')
}

function SecureMediaPreview({ item, mode = 'card' }) {
  const [state, setState] = useState({ status: 'idle', path: '', url: '' })
  const storagePath = mode === 'detail' ? item.media.storagePath : getPreviewStoragePath(item)

  useEffect(() => {
    let active = true
    if (!storagePath) {
      return () => {
        active = false
      }
    }

    resolveMediaUrl(storagePath)
      .then((url) => {
        if (active) setState({ status: 'ready', path: storagePath, url })
      })
      .catch(() => {
        if (active) setState({ status: 'error', path: storagePath, url: '' })
      })

    return () => {
      active = false
    }
  }, [storagePath])

  const status = storagePath ? (state.path === storagePath ? state.status : 'loading') : 'unavailable'

  if (status === 'ready' && state.url) {
    if (mode === 'detail' && item.media.kind === 'video') {
      return <video className="gallery-secure-media gallery-secure-media-video" controls preload="metadata" src={state.url} />
    }

    return <img alt="" className="gallery-secure-media" loading="lazy" src={state.url} />
  }

  const label = status === 'loading' ? 'Loading private media' : status === 'error' ? 'Private media failed to load' : item.media.kind === 'video' ? 'Private video' : 'Private media'
  return (
    <div className={`gallery-secure-media-fallback gallery-secure-media-fallback-${status}`} aria-label={label}>
      <span>{label}</span>
    </div>
  )
}

function GalleryDetailDialog({ item, onClose }) {
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)

  useEffect(() => {
    if (!item || !dialogRef.current) return
    if (!dialogRef.current.open) {
      dialogRef.current.showModal()
    }
    closeButtonRef.current?.focus()
  }, [item])

  if (!item) return null

  const typeMark = item.media.kind === 'video' ? 'Motion' : item.specialMoment.isSpecial ? 'Special' : 'Image'

  return createPortal(
    <dialog aria-labelledby="gallery-detail-title" className="gallery-detail-dialog" onClose={onClose} ref={dialogRef}>
      <button aria-label="Close visual detail" className="gallery-detail-close" onClick={onClose} ref={closeButtonRef} type="button">
        Close
      </button>
      <div className="gallery-detail-frame" aria-hidden={item.media.status === 'storage-verified' ? undefined : true}>
        {item.media.status === 'storage-verified' ? <SecureMediaPreview item={item} mode="detail" /> : <span>{typeMark}</span>}
      </div>
      <div className="gallery-detail-copy">
        <span className="folio-mark">{item.typeLabel}</span>
        <h2 id="gallery-detail-title">{item.title}</h2>
        <p>{item.description}</p>
        <dl className="gallery-detail-list">
          <div>
            <dt>Date</dt>
            <dd>{item.displayDate || item.monthLabel || 'Date to review'}</dd>
          </div>
          <div>
            <dt>Media</dt>
            <dd>{mediaStatusLabel(item)}</dd>
          </div>
          <div>
            <dt>Boundary</dt>
            <dd>Read-only protected metadata</dd>
          </div>
        </dl>
        {item.tags.length > 0 ? (
          <ul className="gallery-detail-tags" aria-label="Gallery detail tags">
            {item.tags.slice(0, 6).map((tag) => (
              <li key={tag.key}>{tag.label}</li>
            ))}
          </ul>
        ) : null}
        {item.specialMoment.route ? (
          <Link className="gallery-special-link" onClick={onClose} to={item.specialMoment.route}>
            Open protected moment
          </Link>
        ) : null}
      </div>
    </dialog>,
    document.body,
  )
}

function OpeningNote({ model }) {
  return (
    <QuietStatus
      className="gallery-opening-note"
      description="Gallery reads safe metadata only. Private media previews, uploads, video playback, and synchronization stay outside this route."
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

function GalleryItem({ item, onSelect }) {
  const typeMark = item.media.kind === 'video' ? 'Motion' : item.specialMoment.isSpecial ? 'Special' : 'Image'

  return (
    <article className={`gallery-item-card gallery-item-card-${item.media.status}`}>
      <div className="gallery-item-frame" aria-hidden="true">
        {item.media.status === 'storage-verified' ? <SecureMediaPreview item={item} /> : <span>{typeMark}</span>}
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
        <button className="gallery-detail-trigger" onClick={() => onSelect(item)} type="button">
          View details
        </button>
        {item.specialMoment.route ? (
          <Link className="gallery-special-link" to={item.specialMoment.route}>
            Open protected moment
          </Link>
        ) : null}
      </div>
    </article>
  )
}

function GalleryCollection({ collection, expandedCollections, onSelect, onToggle }) {
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
          <GalleryItem item={item} key={item.key} onSelect={onSelect} />
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

function GalleryCollections({ collections, onSelect }) {
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
          onSelect={onSelect}
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
  const [selectedItem, setSelectedItem] = useState(null)
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
        description="Photo, video, and special-route references stay grouped as a private collection with safe detail views and without loading private media."
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
          <GalleryCollections collections={collections} onSelect={setSelectedItem} />
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
      <GalleryDetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} />
    </section>
  )
}
