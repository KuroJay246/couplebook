import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, HeartHandshake, ScrollText, Sparkles, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PrimaryButton, SecondaryButton, TextButton } from '../../components/ui/Button.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { FormField, SelectField, TextAreaField, TextField } from '../../components/ui/FormField.jsx'
import { InlineAlert } from '../../components/ui/InlineAlert.jsx'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton.jsx'
import { LoadingState } from '../../components/ui/LoadingState.jsx'
import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { PageTabs } from '../../components/ui/PageTabs.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { ContentCard, Surface } from '../../components/ui/Surface.jsx'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'

function personTone(index) {
  return index === 0 ? 'jaylan' : 'omia'
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

function relationshipDisplayName(value, index = 0) {
  const normalized = normalizeName(value)
  if (normalized === 'approved reader') return 'Jaylan'
  if (normalized === 'partner record') return 'Omia'
  return value || (index === 0 ? 'Jaylan' : 'Omia')
}

function relationshipTitle(title, people) {
  const cleaned = String(title || '').replaceAll('Approved Reader', relationshipDisplayName('Approved Reader', 0)).replaceAll('Partner Record', relationshipDisplayName('Partner Record', 1))
  if (cleaned.trim()) return cleaned
  if (people.length >= 2) return `${relationshipDisplayName(people[0].displayName, 0)} and ${relationshipDisplayName(people[1].displayName, 1)}`
  return 'About us'
}

function isOwnerProfile(person, approvedUser) {
  const currentNames = [approvedUser?.username, approvedUser?.displayName, approvedUser?.profileName].map(normalizeName).filter(Boolean)
  return currentNames.includes(normalizeName(person.id)) || currentNames.includes(normalizeName(person.displayName))
}

function daysTogether(value) {
  if (!value) return null
  const start = new Date(value)
  if (Number.isNaN(start.getTime())) return null
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

function ProfileEditDialog({ onClose, onSave, person, status }) {
  const firstFieldRef = useRef(null)
  const [form, setForm] = useState(() => ({
    name: person?.displayName || '',
    bio: person?.bio || '',
    anniversaryView: person?.anniversaryView || 'dual',
    joinedDate: person?.joinedDate || '',
    birthday: person?.birthday || '',
    revision: person?.revision || 0,
  }))

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await onSave(form)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-[var(--cb-bg-soft)]/40 backdrop-blur-sm" onClick={onClose} aria-label="Close profile form" />
      <form className="relative w-full max-w-2xl rounded-[28px] border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[0_24px_80px_rgba(36,19,29,0.18)] sm:p-8" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--cb-accent)]">Edit profile</p>
            <h3 className="mt-2 font-serif text-3xl text-[var(--cb-text)]">Update your section of Us</h3>
          </div>
          <TextButton onClick={onClose}>Close</TextButton>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <FormField label="Display name" className="sm:col-span-2">
            <TextField onChange={(event) => updateField('name', event.target.value)} ref={firstFieldRef} required value={form.name} />
          </FormField>
          <FormField label="Bio" className="sm:col-span-2">
            <TextAreaField onChange={(event) => updateField('bio', event.target.value)} rows={6} value={form.bio} />
          </FormField>
          <FormField label="Anniversary view">
            <SelectField onChange={(event) => updateField('anniversaryView', event.target.value)} value={form.anniversaryView}>
              <option value="dual">Both perspectives</option>
              <option value="jaylan">Jaylan perspective</option>
              <option value="omia">Omia perspective</option>
            </SelectField>
          </FormField>
          <FormField label="Joined date">
            <TextField onChange={(event) => updateField('joinedDate', event.target.value)} type="date" value={form.joinedDate || ''} />
          </FormField>
          <FormField label="Birthday">
            <TextField onChange={(event) => updateField('birthday', event.target.value)} type="date" value={form.birthday || ''} />
          </FormField>
        </div>
        {status?.message ? <div className="mt-5"><InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /></div> : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton loading={status?.saving} type="submit">{status?.saving ? 'Saving profile' : 'Save profile'}</PrimaryButton>
        </div>
      </form>
    </div>,
    document.body,
  )
}

function ProfileCard({ canEdit, onEdit, person, index }) {
  const tone = personTone(index)
  const togetherDays = daysTogether(person.joinedDate)
  const displayName = relationshipDisplayName(person.displayName, index)
  const accentClass = tone === 'jaylan' ? 'bg-[var(--cb-accent-soft)] text-[var(--cb-accent)]' : 'bg-[var(--cb-accent-soft)] text-[#5c4677]'

  return (
    <Surface className="h-full">
      <div className="flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${accentClass}`}>
              {tone === 'jaylan' ? 'Jaylan' : 'Omia'}
            </span>
            <h3 className="mt-3 font-serif text-3xl text-[var(--cb-text)]">{displayName}</h3>
          </div>
          {canEdit ? <SecondaryButton onClick={() => onEdit(person)}>Edit</SecondaryButton> : null}
        </div>

        <p className="text-sm leading-6 text-[var(--cb-text-secondary)]">{person.bio || 'A personal note is waiting to be written.'}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          {(person.details || []).map((detail) => (
            <ContentCard key={detail.key}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-text-muted)]">{detail.label}</p>
              <p className="mt-2 text-sm font-semibold text-[var(--cb-text)]">{detail.value || 'Still to be added'}</p>
            </ContentCard>
          ))}
          {togetherDays !== null ? (
            <ContentCard>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-text-muted)]">Days together</p>
              <p className="mt-2 text-sm font-semibold text-[var(--cb-text)]">{togetherDays}</p>
            </ContentCard>
          ) : null}
        </div>
      </div>
    </Surface>
  )
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <LoadingSkeleton className="h-64" />
      <LoadingSkeleton className="h-64" />
    </div>
  )
}

export function ProfileView({ compatibilityError, compatibilityState, model, onRefresh }) {
  const writer = useOwnerWrite(onRefresh)
  const [editingPerson, setEditingPerson] = useState(null)
  const [status, setStatus] = useState({ kind: '', message: '', saving: false })
  const [activeTab, setActiveTab] = useState('overview')

  const people = useMemo(() => {
    const basePeople = model.people || []
    if (!writer.approvedUser || basePeople.some((person) => isOwnerProfile(person, writer.approvedUser))) return basePeople
    const displayName = writer.approvedUser.displayName || writer.approvedUser.username || 'Jaylan'
    return [{
      id: writer.approvedUser.username || displayName,
      displayName,
      bio: '',
      anniversaryView: 'dual',
      joinedDate: '',
      birthday: '',
      revision: 0,
      details: [],
    }, ...basePeople]
  }, [model.people, writer.approvedUser])

  const displayRelationshipTitle = relationshipTitle(model.relationship?.title, people)
  const tabs = [
    { id: 'overview', label: 'About Us' },
    ...people.map((person, index) => ({ id: `person-${index}`, label: relationshipDisplayName(person.displayName, index) })),
    { id: 'dates', label: 'Dates' },
    { id: 'shared', label: 'Shared matches' },
    { id: 'promises', label: 'Promises' },
  ]

  async function saveProfile(payload) {
    setStatus({ kind: '', message: '', saving: true })
    try {
      await writer.saveProfile(payload)
      setStatus({ kind: 'success', message: 'Profile saved.', saving: false })
      setEditingPerson(null)
    } catch (error) {
      setStatus({ kind: 'error', message: error?.message || 'Editing is temporarily unavailable.', saving: false })
    }
  }

  if (compatibilityState === 'loading') {
    return (
      <div className="space-y-4">
        <LoadingState message="Loading Us..." />
        <ProfileSkeleton />
      </div>
    )
  }

  if (compatibilityError || model.status === 'invalid') {
    return <ErrorState title="Us could not be loaded" message={compatibilityError || 'The Us view is not available right now.'} onRetry={onRefresh} />
  }

  return (
    <section className="space-y-5" data-route="profile">
      <PageHeader
        eyebrow="Us"
        title="About us"
        description="Both of you, the dates that matter, and the things that make this relationship feel like yours."
        actions={(
          <>
            <SecondaryButton as={Link} to="/favorites"><Star className="size-4" />Favorites</SecondaryButton>
            <PrimaryButton as={Link} to="/plans"><Sparkles className="size-4" />Things to try</PrimaryButton>
          </>
        )}
      />

      {status.message && !editingPerson ? <InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /> : null}
      {model.warnings?.length ? (
        <InlineAlert
          tone="info"
          title="Us bridge notes"
          description={`The current Us view loaded with ${model.warnings.length} compatibility note${model.warnings.length === 1 ? '' : 's'}.`}
        />
      ) : null}

      <Surface className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <div>
          <StatusBadge tone="info">Shared profile</StatusBadge>
          <h3 className="mt-3 font-serif text-4xl text-[var(--cb-text)]">{displayRelationshipTitle}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--cb-text-secondary)]">{model.relationship?.summary}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <ContentCard>
            <p className="text-3xl font-bold text-[var(--cb-text)]">{people.length}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">People in us</p>
          </ContentCard>
          <ContentCard>
            <p className="text-3xl font-bold text-[var(--cb-text)]">{(model.relationship?.anniversaries || []).length}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">Shared dates</p>
          </ContentCard>
          <ContentCard>
            <p className="text-3xl font-bold text-[var(--cb-text)]">{(model.relationship?.milestones || []).length}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">Milestones</p>
          </ContentCard>
        </div>
      </Surface>

      <PageTabs active={activeTab} controlsPanels={false} idPrefix="profile" label="Us sections" onChange={setActiveTab} tabs={tabs} />

      {activeTab === 'overview' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
          <Surface>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Our story</p>
            <h3 className="mt-2 font-serif text-3xl text-[var(--cb-text)]">What feels most like us</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {people.map((person, index) => (
                <ContentCard key={person.id}>
                  <p className="text-sm font-bold text-[var(--cb-text)]">{relationshipDisplayName(person.displayName, index)}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">{person.bio || 'A personal note is waiting to be written.'}</p>
                </ContentCard>
              ))}
            </div>
          </Surface>
          <div className="grid gap-5">
            <Surface tone="soft">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Shared matches</p>
              <h3 className="mt-2 font-serif text-2xl text-[var(--cb-text)]">Things you already have in common</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {model.sharedHighlights?.length > 0
                  ? model.sharedHighlights.map((highlight) => <StatusBadge key={highlight.id}>{highlight.label}</StatusBadge>)
                  : <p className="text-sm text-[var(--cb-text-secondary)]">Shared favorites will surface here as the preserved collection fills out.</p>}
              </div>
            </Surface>
            <Surface tone="soft">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Things to try</p>
              <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">Plans keeps upcoming dates, gifts, and ideas close without turning this page into a dashboard.</p>
              <div className="mt-4">
                <SecondaryButton as={Link} to="/plans">Open Plans</SecondaryButton>
              </div>
            </Surface>
          </div>
        </div>
      ) : null}

      {people.map((person, index) => activeTab === `person-${index}` ? (
        <ProfileCard
          canEdit={isOwnerProfile(person, writer.approvedUser)}
          index={index}
          key={person.id}
          onEdit={(nextPerson) => {
            setStatus({ kind: '', message: '', saving: false })
            setEditingPerson(nextPerson)
          }}
          person={person}
        />
      ) : null)}

      {activeTab === 'dates' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Surface>
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-1 size-5 text-[var(--cb-accent)]" aria-hidden="true" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Relationship dates</p>
                <h3 className="mt-2 font-serif text-3xl text-[var(--cb-text)]">Dates worth holding close</h3>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {(model.relationship?.anniversaries || []).map((item) => (
                <ContentCard key={item.id}>
                  <p className="text-sm font-bold text-[var(--cb-text)]">{item.label}</p>
                  <p className="mt-2 text-sm text-[var(--cb-text-secondary)]">{item.dateLabel || 'Still to be added'}</p>
                  <p className="mt-1 text-sm text-[var(--cb-text-muted)]">{item.summary}</p>
                </ContentCard>
              ))}
              {(model.relationship?.anniversaries || []).length === 0 ? <EmptyState title="No dates are saved yet." description="Joined dates and anniversaries will appear here when they are available." /> : null}
            </div>
          </Surface>
          <Surface>
            <div className="flex items-start gap-3">
              <HeartHandshake className="mt-1 size-5 text-[var(--cb-accent)]" aria-hidden="true" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Milestones</p>
                <h3 className="mt-2 font-serif text-3xl text-[var(--cb-text)]">Birthdays and contract progress</h3>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {(model.relationship?.milestones || []).map((item) => (
                <ContentCard key={item.id}>
                  <p className="text-sm font-bold text-[var(--cb-text)]">{item.label}</p>
                  <p className="mt-2 text-sm text-[var(--cb-text-secondary)]">{item.value || 'Still to be added'}</p>
                </ContentCard>
              ))}
              {(model.relationship?.milestones || []).length === 0 ? <EmptyState title="No milestones are saved yet." description="Birthday and contract milestones will appear here when they are available." /> : null}
            </div>
          </Surface>
        </div>
      ) : null}

      {activeTab === 'shared' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Surface>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Favorites</p>
            <h3 className="mt-2 font-serif text-3xl text-[var(--cb-text)]">Shared matches</h3>
            <div className="mt-5 grid gap-3">
              {model.sharedHighlights?.length > 0 ? model.sharedHighlights.map((highlight) => (
                <ContentCard key={highlight.id}>
                  <p className="text-sm font-bold text-[var(--cb-text)]">{highlight.label}</p>
                  <p className="mt-2 text-sm text-[var(--cb-text-secondary)]">{highlight.owner} • {highlight.category}</p>
                </ContentCard>
              )) : <EmptyState title="No shared matches are visible yet." description="Favorites will begin surfacing here as the shared collection is filled out." />}
            </div>
          </Surface>
          <Surface tone="soft">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Explore more</p>
            <h3 className="mt-2 font-serif text-2xl text-[var(--cb-text)]">Open the full shared lists</h3>
            <div className="mt-5 grid gap-3">
              <ContentCard>
                <p className="text-sm font-bold text-[var(--cb-text)]">{model.entries?.favorites?.title || 'Shared favorites'}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">{model.entries?.favorites?.description}</p>
                <div className="mt-4">
                  <SecondaryButton as={Link} to={model.entries?.favorites?.href || '/favorites'}>Open Favorites</SecondaryButton>
                </div>
              </ContentCard>
            </div>
          </Surface>
        </div>
      ) : null}

      {activeTab === 'promises' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)]">
          <Surface>
            <div className="flex items-start gap-3">
              <ScrollText className="mt-1 size-5 text-[var(--cb-accent)]" aria-hidden="true" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Our Promises</p>
                <h3 className="mt-2 font-serif text-3xl text-[var(--cb-text)]">Relationship contract</h3>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--cb-text-secondary)]">{model.entries?.contract?.description}</p>
            <div className="mt-5">
              <PrimaryButton as={Link} to={model.entries?.contract?.href || '/contract'}>Open Contract</PrimaryButton>
            </div>
          </Surface>
          <Surface tone="soft">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Protected</p>
            <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">UIDs, membership status, Firestore paths, and internal authorization language stay out of this view.</p>
          </Surface>
        </div>
      ) : null}

      {editingPerson ? <ProfileEditDialog onClose={() => setEditingPerson(null)} onSave={saveProfile} person={editingPerson} status={status} /> : null}
    </section>
  )
}
