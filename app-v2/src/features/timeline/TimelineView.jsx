import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'

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

function memoryDateValue(memory) {
  if (typeof memory?.date?.raw === 'string') return memory.date.raw.slice(0, 10)
  if (typeof memory?.date?.value === 'string') return memory.date.value.slice(0, 10)
  if (memory?.date?.timestamp) return new Date(memory.date.timestamp).toISOString().slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

function memoryPayloadFromForm(form, fallback = {}) {
  const tags = form.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
  return {
    title: form.title,
    description: form.description,
    date: form.date,
    revision: fallback.revision || 0,
    tags,
    specialMomentType: fallback.specialMoment?.isSpecial ? fallback.specialMoment.type || 'ordinary' : 'ordinary',
    status: fallback.status || 'active',
  }
}

function sortMemories(memories, order) {
  const sorted = [...memories]
  sorted.sort((left, right) => {
    const leftTimestamp = left.sort?.timestamp
    const rightTimestamp = right.sort?.timestamp

    if (leftTimestamp !== null && rightTimestamp !== null && leftTimestamp !== rightTimestamp) {
      return order === 'oldest' ? leftTimestamp - rightTimestamp : rightTimestamp - leftTimestamp
    }

    if (leftTimestamp !== null && rightTimestamp === null) return -1
    if (leftTimestamp === null && rightTimestamp !== null) return 1

    return order === 'oldest'
      ? (left.sort?.ordinal || 0) - (right.sort?.ordinal || 0)
      : (right.sort?.ordinal || 0) - (left.sort?.ordinal || 0)
  })
  return sorted
}

function buildMonthOptions(memories) {
  const monthMap = new Map()
  for (const memory of memories) {
    const date = memory.date
    if (date?.status !== 'valid' || !date.year || !date.month) continue
    const key = `${date.year}-${String(date.month).padStart(2, '0')}`
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        key,
        label: new Date(Date.UTC(date.year, date.month - 1, 1)).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }),
      })
    }
  }
  return [...monthMap.values()].sort((left, right) => right.key.localeCompare(left.key))
}

function MemoryFormDialog({ memory = null, mode, onClose, onSave, status }) {
  const firstFieldRef = useRef(null)
  const [form, setForm] = useState(() => ({
    title: memory?.title || memory?.displayTitle || '',
    date: memoryDateValue(memory),
    description: memory?.description || memory?.displayDescription || '',
    tags: (memory?.tags || []).map((tag) => tag.label || tag.key).join(', '),
  }))

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await onSave(memoryPayloadFromForm(form, memory || {}))
  }

  return createPortal(
    <dialog aria-labelledby="memory-form-title" className="modal-overlay active faithful-modal-open" onCancel={onClose} open>
      <form className="modal-container faithful-edit-form" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h3 className="modal-title" id="memory-form-title">{mode === 'edit' ? 'Edit memory' : 'Add memory'}</h3>
          <button aria-label="Close memory form" className="modal-close" onClick={onClose} type="button">×</button>
        </div>
        <div className="modal-body">
          <label className="form-group">
            <span className="form-label">Title</span>
            <input className="form-input" onChange={(event) => updateField('title', event.target.value)} ref={firstFieldRef} required type="text" value={form.title} />
          </label>
          <label className="form-group">
            <span className="form-label">Date</span>
            <input className="form-input" onChange={(event) => updateField('date', event.target.value)} required type="date" value={form.date} />
          </label>
          <label className="form-group">
            <span className="form-label">Description</span>
            <textarea className="form-textarea" onChange={(event) => updateField('description', event.target.value)} rows={5} value={form.description} />
          </label>
          <label className="form-group">
            <span className="form-label">Tags</span>
            <input className="form-input" onChange={(event) => updateField('tags', event.target.value)} placeholder="date night, favorite, travel" type="text" value={form.tags} />
          </label>
          {status?.message ? <p className={`workflow-feedback ${status.kind === 'error' ? 'workflow-feedback-error' : 'workflow-feedback-success'}`} role="status">{status.message}</p> : null}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} type="button">Cancel</button>
          <button className="btn btn-primary" disabled={status?.saving} type="submit">{status?.saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </dialog>,
    document.body,
  )
}

function DetailModal({ memory, onArchive, onClose, onEdit, status }) {
  const closeRef = useRef(null)
  useEffect(() => {
    if (!memory) return
    const dialog = closeRef.current?.closest('dialog')
    if (dialog && !dialog.open) dialog.showModal()
    closeRef.current?.focus()
  }, [memory])

  if (!memory) return null
  return createPortal(
    <dialog aria-labelledby="detail-title" className="modal-overlay active" onCancel={onClose}>
      <div className="modal-container" style={{ maxWidth: '600px' }}>
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
            <button className="btn btn-secondary" onClick={() => onEdit(memory)} type="button">Edit</button>
            <button className="btn btn-danger" disabled={status?.saving} onClick={() => onArchive(memory)} type="button">Archive</button>
          </div>
          <button className="btn btn-secondary" onClick={onClose} type="button">Close</button>
        </div>
      </div>
    </dialog>,
    document.body,
  )
}

export function TimelineView({ model, onRefresh }) {
  const [selectedTag, setSelectedTag] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [selectedMemory, setSelectedMemory] = useState(null)
  const [editingMemory, setEditingMemory] = useState(null)
  const [formMode, setFormMode] = useState('')
  const [status, setStatus] = useState({ kind: '', message: '', saving: false })
  const writer = useOwnerWrite(onRefresh)
  const memories = useMemo(() => allMemories(model), [model])
  const tags = model.filters.availableTags || []
  const years = model.filters.availableYears || []
  const types = model.filters.availableTypes || []
  const monthOptions = useMemo(() => buildMonthOptions(memories), [memories])
  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return sortMemories(
      memories.filter((memory) => {
        if (selectedTag !== 'all' && !memory.tags.some((tag) => tag.key === selectedTag)) return false
        if (selectedYear !== 'all' && String(memory.date?.year || '') !== selectedYear) return false
        if (selectedMonth !== 'all') {
          const monthKey = memory.date?.status === 'valid'
            ? `${memory.date.year}-${String(memory.date.month).padStart(2, '0')}`
            : ''
          if (monthKey !== selectedMonth) return false
        }
        if (selectedType !== 'all') {
          if (selectedType === 'special' && !memory.specialMoment?.isSpecial) return false
          if (selectedType === 'photo' && memory.media?.kind !== 'image') return false
          if (selectedType === 'video' && memory.media?.kind !== 'video') return false
          if (selectedType === 'no-media' && !['none', 'special-route-only'].includes(memory.media?.status)) return false
        }
        if (!normalizedSearch) return true
        const haystack = [
          memory.displayTitle,
          memory.displayDescription,
          memory.displayDate,
          ...memory.tags.map((tag) => tag.label),
        ].join(' ').toLowerCase()
        return haystack.includes(normalizedSearch)
      }),
      sortOrder,
    )
  }, [memories, search, selectedMonth, selectedTag, selectedType, selectedYear, sortOrder])

  async function saveForm(payload) {
    setStatus({ kind: '', message: '', saving: true })
    try {
      if (formMode === 'edit' && editingMemory?.id) {
        await writer.updateMemory(editingMemory.id, payload)
      } else {
        await writer.createMemory(payload)
      }
      setStatus({ kind: 'success', message: 'Memory saved.', saving: false })
      setEditingMemory(null)
      setFormMode('')
    } catch (error) {
      setStatus({ kind: 'error', message: error?.message || 'Editing is temporarily unavailable.', saving: false })
    }
  }

  async function archiveSelected(memory) {
    if (!window.confirm(`Archive "${memory.displayTitle}"?`)) return
    setStatus({ kind: '', message: '', saving: true })
    try {
      await writer.archiveMemory(memory.id, memory.revision || 0)
      setSelectedMemory(null)
      setStatus({ kind: 'success', message: 'Memory archived.', saving: false })
    } catch (error) {
      setStatus({ kind: 'error', message: error?.message || 'Editing is temporarily unavailable.', saving: false })
    }
  }

  function openAddForm() {
    setEditingMemory(null)
    setFormMode('add')
    setStatus({ kind: '', message: '', saving: false })
  }

  function openEditForm(memory) {
    setSelectedMemory(null)
    setEditingMemory(memory)
    setFormMode('edit')
    setStatus({ kind: '', message: '', saving: false })
  }

  function clearFilters() {
    setSearch('')
    setSelectedTag('all')
    setSelectedYear('all')
    setSelectedType('all')
    setSelectedMonth('all')
    setSortOrder('newest')
  }

  return (
    <section className="timeline-page">
      <header className="page-header page-header--split">
        <div className="page-heading">
          <p className="page-eyebrow">Story Lane</p>
          <h1 className="page-title">📖 Our Story</h1>
          <p className="page-subtitle">Search and reopen the memories that still shape your story.</p>
        </div>
        <div className="page-actions">
          <span className="utility-chip">{filtered.length} {filtered.length === 1 ? 'memory' : 'memories'}</span>
          <button className="btn btn-primary" onClick={openAddForm} type="button">+ Add Memory</button>
        </div>
      </header>
      {status.message && !formMode ? <p className={`workflow-feedback ${status.kind === 'error' ? 'workflow-feedback-error' : 'workflow-feedback-success'}`} role="status">{status.message}</p> : null}

      <div className="glass-card card-utility filter-toolbar timeline-filter-toolbar">
        <div className="faithful-filter-grid">
          <label className="form-group">
            <span className="filter-toolbar-label">Search memories</span>
            <input
              className="form-input"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search titles, details, and tags"
              type="search"
              value={search}
            />
          </label>
          <label className="form-group">
            <span className="filter-toolbar-label">Year</span>
            <select className="form-select" onChange={(event) => setSelectedYear(event.target.value)} value={selectedYear}>
              <option value="all">All years</option>
              {years.map((year) => <option key={year.key} value={year.key}>{year.label}</option>)}
            </select>
          </label>
          <label className="form-group">
            <span className="filter-toolbar-label">Month</span>
            <select className="form-select" onChange={(event) => setSelectedMonth(event.target.value)} value={selectedMonth}>
              <option value="all">Any month</option>
              {monthOptions.map((month) => <option key={month.key} value={month.key}>{month.label}</option>)}
            </select>
          </label>
          <label className="form-group">
            <span className="filter-toolbar-label">Type</span>
            <select className="form-select" onChange={(event) => setSelectedType(event.target.value)} value={selectedType}>
              <option value="all">All types</option>
              {types.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
            </select>
          </label>
          <label className="form-group">
            <span className="filter-toolbar-label">Sort</span>
            <select className="form-select" onChange={(event) => setSortOrder(event.target.value)} value={sortOrder}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <div className="form-group">
            <span className="filter-toolbar-label">Browse by tag</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className={`tab-btn ${selectedTag === 'all' ? 'active' : ''}`} onClick={() => setSelectedTag('all')} type="button">All</button>
              {tags.map((tag) => (
                <button className={`tab-btn ${selectedTag === tag.key ? 'active' : ''}`} key={tag.key} onClick={() => setSelectedTag(tag.key)} type="button">
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
          <div className="faithful-filter-actions">
            <button className="btn btn-secondary" onClick={clearFilters} type="button">Clear filters</button>
            <p className="faithful-filter-summary">
              {filtered.length === memories.length
                ? 'Showing the full story.'
                : `Showing ${filtered.length} of ${memories.length} memories.`}
            </p>
          </div>
        </div>
      </div>

      <div className="timeline-container">
        <div className="timeline-line" />
        <div>
          {filtered.length > 0 ? filtered.map((memory) => (
            <TimelineCard key={memory.id} memory={memory} onSelect={setSelectedMemory} />
          )) : (
            <div className="glass-card card-utility timeline-empty-state">
              <h3>No memories match this view yet.</h3>
              <p>Try a different year, month, tag, or search phrase. Your saved memories will still be here when you clear the filters.</p>
              <div className="faithful-inline-actions">
                <button className="btn btn-secondary" onClick={clearFilters} type="button">Show everything</button>
                <button className="btn btn-primary" onClick={openAddForm} type="button">Add a new memory</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <DetailModal memory={selectedMemory} onArchive={archiveSelected} onClose={() => setSelectedMemory(null)} onEdit={openEditForm} status={status} />
      {formMode ? (
        <MemoryFormDialog
          memory={editingMemory}
          mode={formMode}
          onClose={() => {
            setFormMode('')
            setEditingMemory(null)
          }}
          onSave={saveForm}
          status={status}
        />
      ) : null}
    </section>
  )
}
