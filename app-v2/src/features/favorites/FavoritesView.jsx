import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Heart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PrimaryButton, SecondaryButton, TextButton } from '../../components/ui/Button.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { FormField, TextField } from '../../components/ui/FormField.jsx'
import { InlineAlert } from '../../components/ui/InlineAlert.jsx'
import { LoadingState } from '../../components/ui/LoadingState.jsx'
import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { SearchField } from '../../components/ui/SearchField.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { ContentCard, Surface } from '../../components/ui/Surface.jsx'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'

const EDITABLE_CATEGORIES = [
  { key: 'food', label: 'Food', icon: '🍽️' },
  { key: 'songs', label: 'Songs', icon: '🎵' },
  { key: 'movies', label: 'Movies', icon: '🎬' },
  { key: 'places', label: 'Places', icon: '📍' },
  { key: 'memories', label: 'Memories', icon: '📖' },
  { key: 'notes', label: 'Notes', icon: '✍️' },
]

const CATEGORY_ICONS = Object.fromEntries(EDITABLE_CATEGORIES.map((category) => [category.key, category.icon]))

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

function isOwnerFavorites(person, approvedUser) {
  const currentNames = [approvedUser?.username, approvedUser?.displayName, approvedUser?.profileName].map(normalizeName).filter(Boolean)
  return currentNames.includes(normalizeName(person.id)) || currentNames.includes(normalizeName(person.displayName))
}

function buildFavoritesPayload(person, patch = {}) {
  const payload = {
    revision: person?.revision || 0,
    ...Object.fromEntries(EDITABLE_CATEGORIES.map((category) => [category.key, []])),
  }
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

  const matches = []
  for (const [categoryKey, values] of categoryMap.entries()) {
    for (const entry of values.values()) {
      if (entry.owners.size < 2) continue
      matches.push({
        id: `${categoryKey}-${entry.label.toLowerCase()}`,
        categoryKey,
        label: entry.label,
        owners: [...entry.owners],
      })
    }
  }

  return matches
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-[var(--cb-bg-soft)]/40 backdrop-blur-sm" onClick={onClose} aria-label="Close favorite form" />
      <form className="relative w-full max-w-xl rounded-[28px] border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[0_24px_80px_rgba(36,19,29,0.18)] sm:p-8" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--cb-accent)]">Add favorite</p>
            <h3 className="mt-2 font-serif text-3xl text-[var(--cb-text)]">Add {category.label.toLowerCase()}</h3>
          </div>
          <TextButton onClick={onClose}>Close</TextButton>
        </div>
        <div className="mt-6">
          <FormField label="Favorite">
            <TextField onChange={(event) => setValue(event.target.value)} ref={firstFieldRef} required value={value} />
          </FormField>
        </div>
        {status?.message ? <div className="mt-5"><InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /></div> : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton loading={status?.saving} type="submit">{status?.saving ? 'Saving' : 'Save favorite'}</PrimaryButton>
        </div>
      </form>
    </div>,
    document.body,
  )
}

function FavoriteSection({ canEdit, category, onAdd, onRemove, ownerId, search }) {
  const filteredItems = []
  for (const item of category.items || []) {
    if (search && !comparableItem(item).includes(search)) continue
    filteredItems.push(item)
  }

  return (
    <ContentCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[var(--cb-text)]">{category.icon || CATEGORY_ICONS[category.key] || '♡'} {category.label}</p>
          <p className="mt-1 text-sm text-[var(--cb-text-muted)]">{filteredItems.length} saved</p>
        </div>
        {canEdit ? <SecondaryButton onClick={() => onAdd(category)}>Add</SecondaryButton> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {filteredItems.map((item) => (
          <button className="inline-flex items-center gap-2 rounded-full border border-[#E7D6CC] bg-[var(--cb-surface)] px-3 py-2 text-sm text-[#5A443B]" key={`${ownerId}-${category.key}-${item}`} onClick={canEdit ? () => onRemove(category, item) : undefined} type="button">
            <span>{item}</span>
            {canEdit ? <span aria-hidden="true">×</span> : null}
          </button>
        ))}
      </div>
      {filteredItems.length === 0 ? <p className="mt-4 text-sm text-[var(--cb-text-muted)]">{search ? 'No favorites in this category match your search.' : 'Nothing saved in this category yet.'}</p> : null}
    </ContentCard>
  )
}

function FavoritesCard({ canEdit, onAdd, onRemove, person, search }) {
  const editableCategoryMap = new Map((person.categories || []).map((category) => [category.key, category]))
  const categories = canEdit
    ? EDITABLE_CATEGORIES.map((category) => ({ ...category, items: editableCategoryMap.get(category.key)?.items || [] }))
    : person.categories.length > 0
      ? person.categories
      : EDITABLE_CATEGORIES.slice(0, 4).map((category) => ({ ...category, items: [] }))

  return (
    <Surface className="h-full">
      <h3 className="font-serif text-3xl text-[var(--cb-text)]">{person.displayName}</h3>
      <div className="mt-5 grid gap-4">
        {categories.map((category) => (
          <FavoriteSection canEdit={canEdit} category={category} key={category.key} onAdd={onAdd} onRemove={onRemove} ownerId={person.id} search={search} />
        ))}
      </div>
    </Surface>
  )
}

export function FavoritesView({ compatibilityError, compatibilityState, model, onRefresh }) {
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
    return [{ id: writer.approvedUser.username || displayName, displayName, revision: 0, categories: [] }, ...basePeople]
  }, [model.people, writer.approvedUser])
  const ownerPerson = (model.people || []).find((person) => isOwnerFavorites(person, writer.approvedUser)) || null
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
    if (!ownerPerson) return
    const currentItems = ownerPerson.categories.find((entry) => entry.key === category.key)?.items || []
    await saveFavoritePayload(
      buildFavoritesPayload(ownerPerson, { [category.key]: currentItems.filter((entry) => entry !== item) }),
      'Favorite removed.',
    )
  }

  if (compatibilityState === 'loading') {
    return <LoadingState message="Loading Favorites..." />
  }

  if (compatibilityError || model.status === 'invalid') {
    return <ErrorState title="Favorites could not be loaded" message={compatibilityError || 'The Favorites view is not available right now.'} onRetry={onRefresh} />
  }

  return (
    <section className="space-y-5" data-route="favorites">
      <PageHeader
        eyebrow="Saved Details"
        title="Favorite Things"
        description="A side-by-side look at what each of you loves, plus the things you already have in common."
        actions={(
          <>
            <SecondaryButton as={Link} to="/profile"><Heart className="size-4" />Back to Us</SecondaryButton>
            <PrimaryButton as={Link} to="/plans"><Star className="size-4" />Things to try</PrimaryButton>
          </>
        )}
      />

      {status.message && !activeCategory ? <InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /> : null}

      <Surface>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Shared matches</p>
            <h3 className="mt-2 font-serif text-3xl text-[var(--cb-text)]">Things you both reach for</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--cb-text-secondary)]">
              {sharedMatches.length > 0
                ? `${sharedMatches.length} shared ${sharedMatches.length === 1 ? 'match' : 'matches'} already stand out.`
                : 'No exact shared matches yet, but everything still lives in one collection.'}
            </p>
          </div>
          <SearchField label="Search favorites" onChange={(event) => setSearch(comparableItem(event.target.value))} placeholder="Search foods, songs, places, and more" value={search} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {sharedMatches.length > 0
            ? sharedMatches.slice(0, 10).map((match) => <StatusBadge key={match.id}>{CATEGORY_ICONS[match.categoryKey] || '♡'} {match.label}</StatusBadge>)
            : <StatusBadge tone="warning">No shared matches yet</StatusBadge>}
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-2">
        {people.map((person) => (
          <FavoritesCard
            canEdit={person === ownerPerson}
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
