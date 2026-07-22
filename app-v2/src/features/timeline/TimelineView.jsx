import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'

function allMemories(model) {
  return (model.chapters || []).flatMap((chapter) => chapter.groups.flatMap((group) => group.memories))
}

function mediaLabel(memory) {
  if (memory.media.kind === 'video') return 'Video memory'
  if (memory.media.kind === 'image') return 'Photo memory'
  if (memory.specialMoment.isSpecial) return 'Special moment'
  return 'Saved memory'
}

function TimelineCard({ memory, onSelect }) {
  return (
    <article className={`timeline-card glass-card card-story ${memory.media.status !== 'storage-verified' ? 'timeline-card--media-unavailable' : ''}`}>
      <div className="timeline-dot" aria-hidden="true" />
      <div className="timeline-card-header">
        <h3 className="timeline-card-title">{memory.displayTitle}</h3>
        <time className="timeline-card-date">{memory.displayDate || 'Date review'}</time>
      </div>
      <div className="timeline-card-meta">
        <div className="timeline-card-status">
          <span className="timeline-card-chip">{mediaLabel(memory)}</span>
          {memory.tags.slice(0, 2).map((tag) => <span className="timeline-card-chip timeline-card-chip--muted" key={tag.key}>{tag.label}</span>)}
        </div>
      </div>
      <p className="timeline-card-desc">{memory.displayDescription}</p>
      {memory.media.hasReference ? (
        <button className="timeline-media-preview" onClick={() => onSelect(memory)} type="button">
          <div className="timeline-media" />
          <span className="timeline-media-status">{memory.media.status === 'storage-verified' ? 'Private media' : 'Private media stays protected'}</span>
          <span className="timeline-media-preview-icon" aria-hidden="true">{memory.media.kind === 'video' ? '▶' : '🖼️'}</span>
        </button>
      ) : null}
      <div className="timeline-card-actions">
        {memory.specialMoment.route ? <Link className="btn btn-secondary timeline-action-link" to={memory.specialMoment.route}>Open Page</Link> : null}
        <button className="btn btn-secondary timeline-action-link" onClick={() => onSelect(memory)} type="button">View memory</button>
      </div>
    </article>
  )
}

function DetailModal({ memory, onClose }) {
  const closeRef = useRef(null)
  useEffect(() => {
    if (memory) closeRef.current?.focus()
  }, [memory])

  if (!memory) return null
  return createPortal(
    <div className="modal-overlay active" role="presentation">
      <div aria-labelledby="detail-title" aria-modal="true" className="modal-container" role="dialog" style={{ maxWidth: '600px' }}>
        <div className="modal-header" style={{ borderBottom: 'none' }}>
          <h3 className="modal-title" id="detail-title" style={{ fontSize: '1.4rem' }}>{memory.displayTitle}</h3>
          <button aria-label="Close memory details" className="modal-close" onClick={onClose} ref={closeRef} type="button">×</button>
        </div>
        <div className="modal-body" style={{ paddingTop: 0 }}>
          <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem', border: '1px solid var(--border-glass)' }}>
            <div className="gallery-video-unavailable">
              <div className="gallery-video-unavailable-copy">
                <p className="gallery-video-unavailable-label">Private media protected</p>
                <h4 className="gallery-video-unavailable-title">{mediaLabel(memory)}</h4>
                <p className="gallery-video-unavailable-text">The story is visible here without copying the original private file into the app bundle.</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>{memory.displayDate || 'Date review'}</span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {memory.tags.slice(0, 4).map((tag) => <span className="badge badge-tag" key={tag.key}>{tag.label}</span>)}
            </div>
          </div>
          <p style={{ color: 'var(--color-secondary-text)', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{memory.displayDescription}</p>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="btn btn-secondary" type="button">✏️ Edit</button>
            <button className="btn btn-danger" type="button">Archive</button>
          </div>
          <button className="btn btn-secondary" onClick={onClose} type="button">Close</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function TimelineView({ model }) {
  const [selectedTag, setSelectedTag] = useState('all')
  const [selectedMemory, setSelectedMemory] = useState(null)
  const memories = useMemo(() => allMemories(model), [model])
  const filtered = selectedTag === 'all' ? memories : memories.filter((memory) => memory.tags.some((tag) => tag.key === selectedTag))
  const tags = model.filters.availableTags || []

  return (
    <section className="timeline-page">
      <header className="page-header page-header--split">
        <div className="page-heading">
          <p className="page-eyebrow">Story Lane</p>
          <h1 className="page-title">📖 Our Story</h1>
          <p className="page-subtitle">A quieter chronology of milestones, saved clips, and little moments that still shape this relationship.</p>
        </div>
        <div className="page-actions">
          <span className="utility-chip">Story order</span>
          <button className="btn btn-primary" type="button">+ Add Memory</button>
        </div>
      </header>

      <div className="glass-card card-utility filter-toolbar timeline-filter-toolbar">
        <span className="filter-toolbar-label">Browse by tag:</span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className={`tab-btn ${selectedTag === 'all' ? 'active' : ''}`} onClick={() => setSelectedTag('all')} type="button">All</button>
          {tags.map((tag) => (
            <button className={`tab-btn ${selectedTag === tag.key ? 'active' : ''}`} key={tag.key} onClick={() => setSelectedTag(tag.key)} type="button">
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <div className="timeline-container">
        <div className="timeline-line" />
        <div>
          {filtered.length > 0 ? filtered.map((memory) => (
            <TimelineCard key={memory.id} memory={memory} onSelect={setSelectedMemory} />
          )) : (
            <p className="timeline-empty-state">No memories match this tag.</p>
          )}
        </div>
      </div>
      <DetailModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
    </section>
  )
}
