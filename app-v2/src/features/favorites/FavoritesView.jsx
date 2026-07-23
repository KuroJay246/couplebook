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

function normalizeItem(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function comparableItem(value) {
  return normalizeItem(value).toLowerCase()
}

function sharedMatchesForPeople(people) {
  if (people.length < 2) return []
  const categoryMap = new Map()

  for (const person of people) {
    for (const category of person.categories || []) {
      const key = category.key
      if (!categoryMap.has(key)) categoryMap.set(key, new Map())
      for (const item of category.items || []) {
        const comparable = comparableItem(item)
        if (!comparable) continue
        if (!categoryMap.get(key).has(comparable)) {
          categoryMap.get(key).set(comparable, { label: normalizeItem(item), owners: new Set() })
        }
        categoryMap.get(key).get(comparable).owners.add(person.displayName)
      }
    }
  }

  return [...categoryMap.entries()].flatMap(([categoryKey, values]) =>
    [...values.values()]
      .filter((entry) => entry.owners.size >= 2)
      .map((entry) => ({
        id: `${categoryKey}-${entry.label.toLowerCase()}`,
        categoryKey,
        label: entry.label,
        owners: [...entry.owners],
      })),
  )
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

function FavoriteSection({ canEdit, category, onAdd, onRemove, ownerId, search }) {
  const filteredItems = (category.items || []).filter((item) => !search || comparableItem(item).includes(search))
  return (
    <div className="favorites-section">
      <div className="favorites-section-title">
        {category.label}
        {canEdit ? <button className="add-btn" onClick={() => onAdd(category)} type="button">+ Add</button> : null}
      </div>
      <ul className="favorites-list">
        {filteredItems.map((item) => (
          <li key={`${ownerId}-${category.key}-${item}`}>
            <span>{item}</span>
            {canEdit ? <button aria-label={`Remove ${item}`} className="btn-icon" onClick={() => onRemove(category, item)} type="button">×</button> : null}
          </li>
        ))}
      </ul>
      {filteredItems.length === 0 ? <p className="faithful-empty-copy">{search ? 'No favorites in this category match your search.' : 'Nothing saved in this category yet.'}</p> : null}
    </div>
  )
}

function FavoritesCard({ canEdit, onAdd, onRemove, person, index, search }) {
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
        <FavoriteSection canEdit={canEdit} category={category} key={category.key} onAdd={onAdd} onRemove={onRemove} ownerId={person.id} search={search} />
      ))}
    </div>
  )
}

export function FavoritesView({ model, onRefresh }) {
  const writer = useOwnerWrite(onRefresh)
  const [activeCategory, setActiveCategory] = useState(null)
  const [search, setSearch] = useState('')
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
  const sharedMatches = useMemo(() => sharedMatchesForPeople(people), [people])

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
    const nextValue = normalizeItem(value)
    if (!nextValue) {
      setStatus({ kind: 'error', message: 'Add a favorite before saving.', saving: false })
      return
    }
    const currentItems = ownerPerson.categories.find((entry) => entry.key === activeCategory.key)?.items || []
    if (currentItems.some((item) => comparableItem(item) === comparableItem(nextValue))) {
      setStatus({ kind: 'error', message: 'That favorite is already saved here.', saving: false })
      return
    }
    await saveFavoritePayload(
      buildFavoritesPayload(ownerPerson, { [activeCategory.key]: [...currentItems, nextValue] }),
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
          <p className="page-subtitle">A side-by-side look at what each of you loves, plus the things you already have in common.</p>
        </div>
      </header>
      {status.message && !activeCategory ? <p className={`workflow-feedback ${status.kind === 'error' ? 'workflow-feedback-error' : 'workflow-feedback-success'}`} role="status">{status.message}</p> : null}
      <section className="glass-card card-utility faithful-summary-card">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-section-kicker">Browse Favorites</p>
            <h2 className="dashboard-subtitle">Find a shared detail fast</h2>
          </div>
        </div>
        <div className="faithful-filter-grid">
          <label className="form-group">
            <span className="filter-toolbar-label">Search favorites</span>
            <input className="form-input" onChange={(event) => setSearch(comparableItem(event.target.value))} placeholder="Search foods, songs, places, and more" type="search" value={search} />
          </label>
          <div className="faithful-filter-summary">
            {sharedMatches.length > 0
              ? `${sharedMatches.length} shared ${sharedMatches.length === 1 ? 'match' : 'matches'} already stand out.`
              : 'No exact shared matches yet, but everything still lives in one collection.'}
          </div>
        </div>
        {sharedMatches.length > 0 ? (
          <div className="faithful-chip-list">
            {sharedMatches.slice(0, 6).map((match) => (
              <span className="utility-chip" key={match.id}>{match.label}</span>
            ))}
          </div>
        ) : null}
      </section>
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
            search={search}
          />
        ))}
      </div>
      {activeCategory ? <AddFavoriteDialog category={activeCategory} onClose={() => setActiveCategory(null)} onSave={addFavorite} status={status} /> : null}
    </section>
  )
}
