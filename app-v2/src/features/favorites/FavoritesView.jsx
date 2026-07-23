import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'

const EDITABLE_CATEGORIES = [
  { key: 'food', label: 'Food' },
  { key: 'songs', label: 'Songs' },
  { key: 'movies', label: 'Movies' },
  { key: 'places', label: 'Places' },
  { key: 'memories', label: 'Memories' },
  { key: 'notes', label: 'Notes' },
]

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

function isOwnerFavorites(person, approvedUser) {
  const currentNames = [approvedUser?.username, approvedUser?.displayName, approvedUser?.profileName].map(normalizeName).filter(Boolean)
  return currentNames.includes(normalizeName(person.id)) || currentNames.includes(normalizeName(person.displayName))
}

function buildFavoritesPayload(person, patch = {}) {
  const payload = Object.fromEntries(EDITABLE_CATEGORIES.map((category) => [category.key, []]))
  for (const category of person?.categories || []) {
    payload[category.key] = [...(category.items || [])]
  }
  for (const [key, value] of Object.entries(patch)) {
    payload[key] = value
  }
  return payload
}

function AddFavoriteDialog({ category, onClose, onSave, status }) {
  const firstFieldRef = useRef(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    await onSave(value)
  }

  return createPortal(
    <dialog aria-labelledby="favorite-add-title" className="modal-overlay active faithful-modal-open" onCancel={onClose} open>
      <form className="modal-container faithful-edit-form" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h3 className="modal-title" id="favorite-add-title">Add {category.label.toLowerCase()}</h3>
          <button aria-label="Close favorite form" className="modal-close" onClick={onClose} type="button">×</button>
        </div>
        <div className="modal-body">
          <label className="form-group">
            <span className="form-label">Favorite</span>
            <input className="form-input" onChange={(event) => setValue(event.target.value)} ref={firstFieldRef} required type="text" value={value} />
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

function FavoriteSection({ canEdit, category, onAdd, onRemove, ownerId }) {
  return (
    <div className="favorites-section">
      <div className="favorites-section-title">
        {category.label}
        {canEdit ? <button className="add-btn" onClick={() => onAdd(category)} type="button">+ Add</button> : null}
      </div>
      <ul className="favorites-list">
        {category.items.map((item) => (
          <li key={`${ownerId}-${category.key}-${item}`}>
            <span>{item}</span>
            {canEdit ? <button aria-label={`Remove ${item}`} className="btn-icon" onClick={() => onRemove(category, item)} type="button">×</button> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FavoritesCard({ canEdit, onAdd, onRemove, person, index }) {
  const color = index === 0 ? 'var(--color-jaylan)' : 'var(--color-omia)'
  const editableCategoryMap = new Map((person.categories || []).map((category) => [category.key, category]))
  const categories = canEdit
    ? EDITABLE_CATEGORIES.map((category) => ({ ...category, items: editableCategoryMap.get(category.key)?.items || [] }))
    : person.categories.length > 0
      ? person.categories
      : EDITABLE_CATEGORIES.slice(0, 4).map((category) => ({ ...category, items: [] }))
  return (
    <div className="glass-card card-story favorites-card">
      <h2 style={{ fontFamily: 'var(--font-accent)', textAlign: 'center', color, marginBottom: '1.5rem' }}>{person.displayName}'s Favorites</h2>
      {categories.map((category) => (
        <FavoriteSection canEdit={canEdit} category={category} key={category.key} onAdd={onAdd} onRemove={onRemove} ownerId={person.id} />
      ))}
    </div>
  )
}

export function FavoritesView({ model, onRefresh }) {
  const writer = useOwnerWrite(onRefresh)
  const [activeCategory, setActiveCategory] = useState(null)
  const [status, setStatus] = useState({ kind: '', message: '', saving: false })
  const people = useMemo(() => {
    const basePeople = (model.people || []).length > 0
      ? model.people
      : [
        { id: 'jaylan-empty', displayName: 'Jaylan', categories: [] },
        { id: 'omia-empty', displayName: 'Omia', categories: [] },
      ]
    if (!writer.approvedUser || basePeople.some((person) => isOwnerFavorites(person, writer.approvedUser))) return basePeople
    const displayName = writer.approvedUser.displayName || writer.approvedUser.username || 'Jaylan'
    return [{ id: writer.approvedUser.username || displayName, displayName, categories: [] }, ...basePeople]
  }, [model.people, writer.approvedUser])
  const ownerPerson = people.find((person) => isOwnerFavorites(person, writer.approvedUser)) || null

  async function saveFavoritePayload(payload, successMessage) {
    setStatus({ kind: '', message: '', saving: true })
    try {
      await writer.saveFavorites(payload)
      setStatus({ kind: 'success', message: successMessage, saving: false })
      setActiveCategory(null)
    } catch (error) {
      setStatus({ kind: 'error', message: error?.message || 'Editing is temporarily unavailable.', saving: false })
    }
  }

  async function addFavorite(value) {
    if (!ownerPerson || !activeCategory) return
    const currentItems = ownerPerson.categories.find((entry) => entry.key === activeCategory.key)?.items || []
    await saveFavoritePayload(
      buildFavoritesPayload(ownerPerson, { [activeCategory.key]: [...currentItems, value] }),
      'Favorite saved.',
    )
  }

  async function removeFavorite(category, item) {
    if (!ownerPerson || !window.confirm(`Remove "${item}"?`)) return
    const currentItems = ownerPerson.categories.find((entry) => entry.key === category.key)?.items || []
    await saveFavoritePayload(
      buildFavoritesPayload(ownerPerson, { [category.key]: currentItems.filter((entry) => entry !== item) }),
      'Favorite removed.',
    )
  }

  return (
    <section className="favorites-page">
      <header className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Saved Details</p>
          <h1 className="page-title">🌟 Favorite Things</h1>
          <p className="page-subtitle">A side-by-side look at what makes Jaylan and Omia smile.</p>
        </div>
      </header>
      {status.message && !activeCategory ? <p className={`workflow-feedback ${status.kind === 'error' ? 'workflow-feedback-error' : 'workflow-feedback-success'}`} role="status">{status.message}</p> : null}
      <div className="favorites-layout">
        {people.map((person, index) => (
          <FavoritesCard
            canEdit={isOwnerFavorites(person, writer.approvedUser)}
            index={index}
            key={person.id}
            onAdd={(category) => {
              setStatus({ kind: '', message: '', saving: false })
              setActiveCategory(category)
            }}
            onRemove={removeFavorite}
            person={person}
          />
        ))}
      </div>
      {activeCategory ? <AddFavoriteDialog category={activeCategory} onClose={() => setActiveCategory(null)} onSave={addFavorite} status={status} /> : null}
    </section>
  )
}
