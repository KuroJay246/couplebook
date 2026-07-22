import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'

const LIVE_SHARED_ALBUM_URL = 'https://www.icloud.com/photos/#/sa,20BC8532-D41C-4AB3-9C83-B05458C10B78/'
const FILTERS = [
  { key: 'all', label: 'All Media' },
  { key: 'photos', label: '📷 Photos' },
  { key: 'videos', label: '🎥 Videos' },
]

function allGalleryItems(model) {
  const byKey = new Map()
  const collections = Array.isArray(model.collections) ? model.collections : Object.values(model.collections || {})
  for (const item of [...(model.photos || []), ...(model.videos || []), ...collections.flatMap((collection) => collection.items || [])]) {
    byKey.set(item.key || item.id, item)
  }
  return [...byKey.values()].sort((left, right) => {
    if (left.sort?.timestamp !== null && right.sort?.timestamp !== null && left.sort?.timestamp !== right.sort?.timestamp) {
      return right.sort.timestamp - left.sort.timestamp
    }
    return (left.sort?.ordinal || 0) - (right.sort?.ordinal || 0)
  })
}

function matchesFilter(item, filter) {
  if (filter === 'photos') return item.media.kind === 'image'
  if (filter === 'videos') return item.media.kind === 'video'
  return true
}

function mediaStatus(item) {
  if (item.media.status === 'storage-verified') return item.media.kind === 'video' ? 'Verified private video' : 'Verified private photo'
  if (item.media.kind === 'video') return 'Private video stored safely'
  if (item.media.kind === 'image') return 'Private image stored safely'
  if (item.specialMoment.isSpecial) return 'Protected special page'
  return 'Saved memory'
}

function GalleryTile({ item, onSelect }) {
  return (
    <article className={`gallery-item ${item.specialMoment.isSpecial ? 'gallery-item--special' : ''} ${item.media.status !== 'storage-verified' ? 'gallery-item--unavailable' : ''}`}>
      <button className="gallery-media-frame" onClick={() => onSelect(item)} type="button">
        <div className="gallery-img" />
        <span className="gallery-media-status">{mediaStatus(item)}</span>
        {item.media.kind === 'video' ? <span className="gallery-item-video-icon">▶</span> : null}
      </button>
      <div className="gallery-card-body">
        <div className="gallery-card-meta">
          <span className="gallery-card-chip">{item.typeLabel}</span>
          <span className="gallery-item-date">{item.displayDate || 'Date review'}</span>
        </div>
        <h3 className="gallery-item-title">{item.title}</h3>
        <p className="gallery-card-support">{item.description}</p>
        {item.specialMoment.route ? <Link className="btn btn-secondary timeline-action-link" to={item.specialMoment.route}>Open Page</Link> : null}
      </div>
    </article>
  )
}

function LiveAlbumTile() {
  return (
    <a className="gallery-item faithful-live-album-tile" href={LIVE_SHARED_ALBUM_URL} rel="noopener noreferrer" target="_blank">
      <div className="gallery-media-frame"><span>Us</span></div>
      <div className="gallery-card-body">
        <div className="gallery-card-meta">
          <span className="gallery-card-chip">Live album</span>
          <span className="gallery-item-date">iCloud</span>
        </div>
        <h3 className="gallery-item-title">Our Live Album</h3>
        <p className="gallery-card-support">Open the shared iCloud album for the newest photos and videos added outside Couple Book.</p>
      </div>
    </a>
  )
}

function GalleryLightbox({ item, onClose }) {
  if (!item) return null
  const isVideo = item.media.kind === 'video'
  return createPortal(
    isVideo ? (
      <div className="modal-overlay active" role="presentation">
        <div aria-modal="true" className="modal-container" role="dialog" style={{ maxWidth: '700px', background: '#000000', borderColor: 'rgba(255,255,255,0.15)' }}>
          <div className="modal-header" style={{ background: '#0d0f14', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="modal-title" style={{ color: 'white' }}>{item.title}</h3>
            <button className="modal-close" onClick={onClose} style={{ color: 'white' }} type="button">×</button>
          </div>
          <div className="modal-body" style={{ padding: 0, lineHeight: 0, background: '#000000' }}>
            <div className="gallery-video-unavailable">
              <div className="gallery-video-unavailable-copy">
                <p className="gallery-video-unavailable-label">Private video stored safely</p>
                <h4 className="gallery-video-unavailable-title">This video remains protected.</h4>
                <p className="gallery-video-unavailable-text">The story stays visible here without copying private media into the public app.</p>
              </div>
            </div>
          </div>
          <div className="modal-footer" style={{ background: '#0d0f14', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="gallery-video-status">{item.displayDate || 'Date review'}</span>
            <button className="btn btn-secondary" onClick={onClose} type="button">Close</button>
          </div>
        </div>
      </div>
    ) : (
      <div className="lightbox-overlay active" role="dialog" aria-modal="true">
        <button className="lightbox-close" onClick={onClose} type="button">×</button>
        <div className="lightbox-content gallery-video-unavailable">
          <div className="gallery-video-unavailable-copy">
            <p className="gallery-video-unavailable-label">Private image stored safely</p>
            <h4 className="gallery-video-unavailable-title">{item.title}</h4>
            <p className="gallery-video-unavailable-text">{item.description}</p>
          </div>
        </div>
        <div className="lightbox-caption-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <div className="lightbox-caption">{item.displayDate || 'Date review'}</div>
          <div className="gallery-lightbox-status">Story preserved. Image stays private.</div>
        </div>
      </div>
    ),
    document.body,
  )
}

export function GalleryView({ model }) {
  const [filter, setFilter] = useState('all')
  const [selectedItem, setSelectedItem] = useState(null)
  const items = useMemo(() => allGalleryItems(model), [model])
  const filtered = items.filter((item) => matchesFilter(item, filter))

  return (
    <section className="gallery-page">
      <header className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Gallery</p>
          <h1 className="page-title">🖼️ Our Shared Gallery</h1>
          <p className="page-subtitle">Browse photos and video clips from your special moments without changing the private media boundaries.</p>
        </div>
      </header>

      <section className="glass-card gallery-story-entrance">
        <div className="gallery-story-copy">
          <p className="gallery-story-label">Our visual archive</p>
          <h2 className="gallery-story-title">Moments we kept close</h2>
          <p className="gallery-story-text">Photos, videos, and private keepsakes from your story stay visible here, even when the original media lives only on the original device.</p>
        </div>
        <div className="gallery-story-stats">
          <div className="gallery-story-stat"><span className="gallery-story-stat-value">{model.summary.totalMemories}</span><span className="gallery-story-stat-label">moments with media</span></div>
          <div className="gallery-story-stat"><span className="gallery-story-stat-value">{model.summary.photos}</span><span className="gallery-story-stat-label">photos</span></div>
          <div className="gallery-story-stat"><span className="gallery-story-stat-value">{model.summary.videos}</span><span className="gallery-story-stat-label">video memories</span></div>
        </div>
      </section>

      <section className="glass-card gallery-toolbar">
        <div className="gallery-toolbar-copy">
          <p className="gallery-toolbar-label">Collection view</p>
          <h2 className="gallery-filter-summary">{filter === 'all' ? 'All visual memories' : filter === 'photos' ? 'Photo memories' : 'Video memories'}</h2>
          <p className="gallery-filter-detail">Photos, videos and private memories from your story.</p>
        </div>
        <div className="media-tabs" aria-label="Gallery filters">
          {FILTERS.map((entry) => (
            <button className={`tab-btn ${filter === entry.key ? 'active' : ''}`} key={entry.key} onClick={() => setFilter(entry.key)} type="button">
              {entry.label}
            </button>
          ))}
        </div>
      </section>

      <div className="gallery-grid">
        <LiveAlbumTile />
        {filtered.length > 0 ? filtered.map((item) => (
          <GalleryTile item={item} key={item.key || item.id} onSelect={setSelectedItem} />
        )) : (
          <div className="gallery-empty-state glass-card">
            <h3 className="gallery-empty-state-title">No Gallery entries match this view.</h3>
            <p className="gallery-empty-state-copy">Try another tab or return to all media.</p>
          </div>
        )}
      </div>
      <GalleryLightbox item={selectedItem} onClose={() => setSelectedItem(null)} />
    </section>
  )
}
