import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Archive, BookHeart, Images, Pencil, RotateCcw, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PrimaryButton, SecondaryButton, TextButton } from '../../components/ui/Button.jsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'
import { ContextMenu } from '../../components/ui/ContextMenu.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { FilterChip } from '../../components/ui/FilterChip.jsx'
import { FormField, SelectField, TextAreaField, TextField } from '../../components/ui/FormField.jsx'
import { InlineAlert } from '../../components/ui/InlineAlert.jsx'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton.jsx'
import { LoadingState } from '../../components/ui/LoadingState.jsx'
import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { SearchField } from '../../components/ui/SearchField.jsx'
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { ContentCard, Surface } from '../../components/ui/Surface.jsx'
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

function memoryStyle(memory) {
  if (memory.specialMoment.isSpecial) return 'special'
  if (memory.media.kind === 'video') return 'video'
  if (memory.media.kind === 'image') return 'photo'
  return 'written'
}

function accentStripeClass(memory) {
  if (memoryStyle(memory) === 'video') return 'bg-[#d7c8ec]'
  if (memoryStyle(memory) === 'photo') return 'bg-[#cbe7d3]'
  if (memoryStyle(memory) === 'special') return 'bg-[#f0ddb6]'
  return 'bg-[#e8d6de]'
}

function chapterLabel(memory) {
  if (memory.date?.status === 'valid' && memory.date?.year) return String(memory.date.year)
  return 'Date Review'
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
    kindLabel: form.kindLabel,
    mediaNote: form.mediaNote,
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
  const titleId = useId()
  const [form, setForm] = useState(() => ({
    title: memory?.title || memory?.displayTitle || '',
    date: memoryDateValue(memory),
    description: memory?.description || memory?.displayDescription || '',
    tags: (memory?.tags || []).map((tag) => tag.label || tag.key).join(', '),
    kindLabel: memory?.kindLabel || memory?.typeLabel || 'Everyday Moment',
    mediaNote: memory?.mediaNote || '',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-[#24131d]/40 backdrop-blur-sm" onClick={onClose} aria-label="Close memory form" />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-2xl rounded-[28px] border border-[#ead7df] bg-white p-6 shadow-[0_24px_80px_rgba(36,19,29,0.18)] sm:p-8"
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8f5168]">{mode === 'edit' ? 'Edit memory' : 'New memory'}</p>
            <h3 id={titleId} className="mt-2 font-serif text-3xl text-[#24131d]">{mode === 'edit' ? 'Update this part of the story' : 'Add the next memory'}</h3>
          </div>
          <TextButton aria-label="Close" onClick={onClose}>Close</TextButton>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <FormField label="Title" className="sm:col-span-2">
            <TextField onChange={(event) => updateField('title', event.target.value)} ref={firstFieldRef} required value={form.title} />
          </FormField>
          <FormField label="Date">
            <TextField onChange={(event) => updateField('date', event.target.value)} required type="date" value={form.date} />
          </FormField>
          <FormField label="Memory type">
            <SelectField onChange={(event) => updateField('kindLabel', event.target.value)} value={form.kindLabel}>
              {['Everyday Moment', 'Date', 'First', 'Trip', 'Milestone', 'Celebration', 'Funny Moment', 'Note', 'Photo Memory', 'Video Memory'].map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </SelectField>
          </FormField>
          <FormField label="Description" className="sm:col-span-2">
            <TextAreaField onChange={(event) => updateField('description', event.target.value)} rows={6} value={form.description} />
          </FormField>
          <FormField label="Tags" className="sm:col-span-2">
            <TextField onChange={(event) => updateField('tags', event.target.value)} placeholder="date night, favorite, travel" value={form.tags} />
          </FormField>
          <FormField label="Media note" className="sm:col-span-2">
            <TextField onChange={(event) => updateField('mediaNote', event.target.value)} placeholder="Optional note about the photo or video for Album" value={form.mediaNote} />
          </FormField>
        </div>

        {status?.message ? <div className="mt-5"><InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /></div> : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton loading={status?.saving} type="submit">{status?.saving ? 'Saving memory' : 'Save memory'}</PrimaryButton>
        </div>
      </form>
    </div>,
    document.body,
  )
}

function DetailModal({ memory, onArchive, onClose, onEdit, status }) {
  const closeButtonRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!memory) return undefined
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [memory])

  if (!memory) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-[#24131d]/40 backdrop-blur-sm" onClick={onClose} aria-label="Close memory details" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-auto rounded-[28px] border border-[#ead7df] bg-white p-6 shadow-[0_24px_80px_rgba(36,19,29,0.18)] sm:p-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <StatusBadge tone={memory.media.kind === 'video' ? 'info' : memory.media.kind === 'image' ? 'success' : memory.specialMoment.isSpecial ? 'warning' : 'default'}>
              {mediaLabel(memory)}
            </StatusBadge>
            <h3 id={titleId} className="mt-3 font-serif text-3xl text-[#24131d]">{memory.displayTitle}</h3>
            <p className="mt-2 text-sm text-[#6B564C]">{memory.displayDate || 'Date review'}</p>
          </div>
          <TextButton aria-label="Close" autoFocus onClick={onClose} ref={closeButtonRef}>Close</TextButton>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <ContentCard className="min-h-72 bg-[linear-gradient(180deg,#fff9fb_0%,#fdf4f8_100%)]">
            <div className="flex h-full flex-col justify-between gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8f5168]">Story preview</p>
                <h4 className="mt-2 text-lg font-bold text-[#24131d]">{memory.displayTitle}</h4>
                <p className="mt-3 text-sm leading-6 text-[#6B564C]">{memory.displayDescription}</p>
              </div>
              <InlineAlert
                tone={memory.media.status === 'storage-verified' ? 'success' : 'info'}
                title={memory.media.status === 'storage-verified' ? 'Private media verified' : 'Private media stays protected'}
                description={
                  memory.media.status === 'storage-verified'
                    ? 'Album can safely reference the private Storage object without exposing the original file in public assets.'
                    : 'This entry preserves the story and metadata even when the original private file is not available in the current device view.'
                }
              />
            </div>
          </ContentCard>

          <div className="grid gap-4">
            <Surface tone="soft">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Tags</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {memory.tags.length > 0 ? memory.tags.map((tag) => <StatusBadge key={tag.key}>{tag.label}</StatusBadge>) : <span className="text-sm text-[#806572]">No tags saved.</span>}
              </div>
            </Surface>
            {memory.specialMoment.route ? (
              <Surface tone="soft">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Related page</p>
                <p className="mt-2 text-sm leading-6 text-[#6B564C]">This memory also connects to a protected special page inside Couple Book.</p>
                <div className="mt-4">
                  <SecondaryButton as={Link} to={memory.specialMoment.route}>Open related page</SecondaryButton>
                </div>
              </Surface>
            ) : null}
          </div>
        </div>

        {status?.message ? <div className="mt-5"><InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /></div> : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => onEdit(memory)}><Pencil className="size-4" />Edit</SecondaryButton>
            <SecondaryButton as={Link} to="/gallery"><Images className="size-4" />Open Album</SecondaryButton>
          </div>
          <SecondaryButton onClick={() => onArchive(memory)}><Archive className="size-4" />Archive memory</SecondaryButton>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function TimelineCard({ memory, onArchive, onEdit, onSelect }) {
  return (
    <ContentCard className="timeline-card relative max-w-[58rem] overflow-hidden">
      <div className={`absolute inset-y-4 left-0 w-1 rounded-full ${accentStripeClass(memory)}`} aria-hidden="true" />
      <div className="flex flex-col gap-4 pl-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={memory.media.kind === 'video' ? 'info' : memory.media.kind === 'image' ? 'success' : memory.specialMoment.isSpecial ? 'warning' : 'default'}>
                {mediaLabel(memory)}
              </StatusBadge>
              {memory.tags.slice(0, 2).map((tag) => <StatusBadge key={tag.key}>{tag.label}</StatusBadge>)}
            </div>
            <h3 className="mt-3 text-xl font-bold text-[#24131d]">{memory.displayTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-[#6B564C]">{memory.displayDescription}</p>
          </div>
          <ContextMenu
            label={`Actions for ${memory.displayTitle}`}
            items={[
              { label: 'View memory', onSelect: () => onSelect(memory) },
              { label: 'Edit memory', onSelect: () => onEdit(memory) },
              { label: 'Archive memory', onSelect: () => onArchive(memory) },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-[#806572]">
          <span>{memory.displayDate || 'Date review'}</span>
          <span aria-hidden="true">•</span>
          <span>{memory.typeLabel || memory.kindLabel || 'Saved memory'}</span>
          {memory.media.hasReference ? (
            <>
              <span aria-hidden="true">•</span>
              <span>{memory.media.kind === 'video' ? 'Video reference saved' : 'Photo reference saved'}</span>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={() => onSelect(memory)}>View memory</PrimaryButton>
          {memory.specialMoment.route ? <SecondaryButton as={Link} to={memory.specialMoment.route}>Open page</SecondaryButton> : null}
        </div>
      </div>
    </ContentCard>
  )
}

function TimelineSkeleton() {
  return (
    <div className="grid gap-4">
      <LoadingSkeleton className="h-28" />
      <LoadingSkeleton className="h-40" />
      <LoadingSkeleton className="h-40" />
    </div>
  )
}

export function TimelineView({ compatibilityError, compatibilityState, model, onRefresh }) {
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
  const [confirmState, setConfirmState] = useState({ mode: '', memory: null })
  const writer = useOwnerWrite(onRefresh)
  const memories = useMemo(() => allMemories(model), [model])
  const archivedMemories = model.archivedMemories || []
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

  async function confirmArchiveOrRestore() {
    const { mode, memory } = confirmState
    if (!memory) return

    setStatus({ kind: '', message: '', saving: true })
    try {
      if (mode === 'archive') {
        await writer.archiveMemory(memory.id, memory.revision || 0)
        setSelectedMemory(null)
        setStatus({ kind: 'success', message: 'Memory archived.', saving: false })
      }
      if (mode === 'restore') {
        await writer.restoreMemory(memory.id, memory.revision || 0)
        setStatus({ kind: 'success', message: 'Memory restored to Story.', saving: false })
      }
      setConfirmState({ mode: '', memory: null })
    } catch (error) {
      setStatus({ kind: 'error', message: error?.message || 'This change could not be completed.', saving: false })
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

  if (compatibilityState === 'loading') {
    return (
      <div className="space-y-4">
        <LoadingState message="Loading Story..." />
        <TimelineSkeleton />
      </div>
    )
  }

  if (compatibilityError || model.status === 'invalid') {
    return <ErrorState title="Story could not be loaded" message={compatibilityError || 'The Story view is not available right now.'} onRetry={onRefresh} />
  }

  return (
    <section className="space-y-5" data-route="timeline">
      <PageHeader
        eyebrow="Story Lane"
        title="Our Story"
        description="Search and reopen the memories that still shape your story."
        actions={(
          <>
            <StatusBadge tone="info">{filtered.length} {filtered.length === 1 ? 'memory' : 'memories'}</StatusBadge>
            <PrimaryButton onClick={openAddForm}><Sparkles className="size-4" />Add memory</PrimaryButton>
          </>
        )}
      />

      {status.message && !formMode ? <InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /> : null}
      {model.warnings?.length ? (
        <InlineAlert
          tone="info"
          title="Story bridge notes"
          description={`The current Story view loaded with ${model.warnings.length} compatibility note${model.warnings.length === 1 ? '' : 's'}.`}
        />
      ) : null}

      <Surface>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.6fr))]">
          <SearchField
            label="Search memories"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search titles, details, and tags"
            value={search}
          />
          <FormField label="Year">
            <SelectField onChange={(event) => setSelectedYear(event.target.value)} value={selectedYear}>
              <option value="all">All years</option>
              {years.map((year) => <option key={year.key} value={year.key}>{year.label}</option>)}
            </SelectField>
          </FormField>
          <FormField label="Month">
            <SelectField onChange={(event) => setSelectedMonth(event.target.value)} value={selectedMonth}>
              <option value="all">Any month</option>
              {monthOptions.map((month) => <option key={month.key} value={month.key}>{month.label}</option>)}
            </SelectField>
          </FormField>
          <FormField label="Sort">
            <SelectField onChange={(event) => setSortOrder(event.target.value)} value={sortOrder}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </SelectField>
          </FormField>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <SegmentedControl
            label="Memory type"
            onChange={setSelectedType}
            options={[{ value: 'all', label: 'All types' }, ...types.map((type) => ({ value: type.key, label: type.label }))]}
            value={selectedType}
          />
          <div className="grid gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#806572]">Browse by tag</span>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={selectedTag === 'all'} onClick={() => setSelectedTag('all')}>All</FilterChip>
              {tags.map((tag) => (
                <FilterChip active={selectedTag === tag.key} key={tag.key} onClick={() => setSelectedTag(tag.key)}>
                  {tag.label}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#6B564C]">
            {filtered.length === memories.length ? 'Showing the full story.' : `Showing ${filtered.length} of ${memories.length} memories.`}
          </p>
          <SecondaryButton onClick={clearFilters}>Clear filters</SecondaryButton>
        </div>
      </Surface>

      {years.length ? (
        <Surface tone="soft">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Jump to year</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <FilterChip active={selectedYear === 'all'} onClick={() => setSelectedYear('all')}>All years</FilterChip>
            {years.map((year) => (
              <FilterChip active={selectedYear === year.key} key={year.key} onClick={() => setSelectedYear(year.key)}>
                {year.label} ({year.count})
              </FilterChip>
            ))}
          </div>
        </Surface>
      ) : null}

      {filtered.length > 0 ? (
        <div className="space-y-6">
          {filtered.map((memory, index) => {
            const previous = filtered[index - 1]
            const currentChapter = chapterLabel(memory)
            const previousChapter = previous ? chapterLabel(previous) : null
            return (
              <section key={memory.id} className="space-y-3">
                {currentChapter !== previousChapter ? (
                  <div className="sticky top-[5.5rem] z-10">
                    <div className="inline-flex rounded-full border border-[#ead7df] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8f5168] shadow-[0_8px_24px_rgba(84,53,67,0.06)]">
                      {currentChapter}
                    </div>
                  </div>
                ) : null}
                <TimelineCard
                  memory={memory}
                  onArchive={(candidate) => setConfirmState({ mode: 'archive', memory: candidate })}
                  onEdit={openEditForm}
                  onSelect={setSelectedMemory}
                />
              </section>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={BookHeart}
          title="No memories match this view yet."
          description="Try a different year, month, tag, or search phrase. Your saved memories will still be here when you clear the filters."
          action={(
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <SecondaryButton onClick={clearFilters}>Show everything</SecondaryButton>
              <PrimaryButton onClick={openAddForm}>Add a new memory</PrimaryButton>
            </div>
          )}
        />
      )}

      {archivedMemories.length ? (
        <Surface>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Archived memories</p>
              <h3 className="mt-2 font-serif text-2xl text-[#24131d]">Hidden from the active story</h3>
              <p className="mt-2 text-sm leading-6 text-[#6B564C]">Restored memories return to Story and Album grouping.</p>
            </div>
            <StatusBadge tone="warning">{archivedMemories.length}</StatusBadge>
          </div>
          <div className="mt-5 grid gap-3">
            {archivedMemories.map((memory) => (
              <ContentCard key={memory.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#24131d]">{memory.displayTitle}</p>
                  <p className="mt-1 text-sm text-[#6B564C]">{memory.displayDate || 'Date review'} • {memory.typeLabel}</p>
                </div>
                <SecondaryButton onClick={() => setConfirmState({ mode: 'restore', memory })}><RotateCcw className="size-4" />Restore memory</SecondaryButton>
              </ContentCard>
            ))}
          </div>
        </Surface>
      ) : null}

      <DetailModal memory={selectedMemory} onArchive={(candidate) => setConfirmState({ mode: 'archive', memory: candidate })} onClose={() => setSelectedMemory(null)} onEdit={openEditForm} status={status} />
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
      <ConfirmDialog
        confirmLabel={confirmState.mode === 'restore' ? 'Restore memory' : 'Archive memory'}
        message={confirmState.mode === 'restore' ? 'This memory will return to the active Story and Album views.' : 'This memory will leave the active Story view until it is restored.'}
        onCancel={() => setConfirmState({ mode: '', memory: null })}
        onConfirm={confirmArchiveOrRestore}
        open={Boolean(confirmState.memory)}
        pending={status.saving}
        recordName={confirmState.memory?.displayTitle}
        title={confirmState.mode === 'restore' ? 'Restore this memory?' : 'Archive this memory?'}
      />
    </section>
  )
}
