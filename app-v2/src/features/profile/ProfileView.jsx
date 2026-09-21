import { useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, HeartHandshake, Plus, Star, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PrimaryButton, SecondaryButton, TextButton } from '../../components/ui/Button.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { FormField, SelectField, TextAreaField, TextField } from '../../components/ui/FormField.jsx'
import { InlineAlert } from '../../components/ui/InlineAlert.jsx'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton.jsx'
import { LoadingState } from '../../components/ui/LoadingState.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { useDialogAccessibility } from '../../components/ui/useDialogAccessibility.js'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

function relationshipDisplayName(value, index = 0) {
  const normalized = normalizeName(value)
  if (normalized === 'approved reader') return 'Jaylan'
  if (normalized === 'partner record') return 'Omia'
  return value || (index === 0 ? 'Jaylan' : 'Omia')
}

function isOwnerProfile(person, approvedUser) {
  const currentNames = [approvedUser?.username, approvedUser?.displayName, approvedUser?.profileName].flatMap((value) => {
    const normalized = normalizeName(value)
    return normalized ? [normalized] : []
  })
  return currentNames.includes(normalizeName(person.id)) || currentNames.includes(normalizeName(person.displayName))
}

function createImportantDateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `date-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createImportantDateDraft() {
  return { id: createImportantDateId(), label: '', date: '', type: 'custom', repeatsAnnually: true, note: '' }
}

function relationshipTitle(people) {
  const names = people.flatMap((person, index) => {
    const displayName = relationshipDisplayName(person.displayName, index)
    return displayName ? [displayName] : []
  })
  return names.length >= 2 ? `${names[0]} & ${names[1]}` : names[0] || 'Us'
}

function ProfileEditDialog({ onClose, onSave, person, status }) {
  const firstFieldRef = useRef(null)
  const titleId = useId()
  const dialogRef = useDialogAccessibility({ initialFocusRef: firstFieldRef, onClose })
  const [form, setForm] = useState(() => ({
    name: person?.displayName || '',
    bio: person?.bio || '',
    anniversaryView: person?.anniversaryView || 'dual',
    joinedDate: person?.joinedDate || '',
    birthday: person?.birthday || '',
    importantDates: Array.isArray(person?.importantDates) && person.importantDates.length > 0 ? person.importantDates : [],
    revision: person?.revision || 0,
  }))

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function updateImportantDate(index, key, value) {
    setForm((current) => ({
      ...current,
      importantDates: current.importantDates.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [key]: value } : entry)),
    }))
  }

  function addImportantDate() {
    setForm((current) => ({ ...current, importantDates: [...current.importantDates, createImportantDateDraft()] }))
  }

  function removeImportantDate(index) {
    setForm((current) => ({ ...current, importantDates: current.importantDates.filter((_, entryIndex) => entryIndex !== index) }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await onSave(form)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-[var(--cb-bg-soft)]/40 backdrop-blur-sm" onClick={onClose} aria-label="Close profile form" />
      <dialog open ref={dialogRef} aria-labelledby={titleId} className="relative w-full max-w-2xl rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[0_24px_80px_rgba(36,19,29,0.18)]">
        <form onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="cb-kicker">Edit profile</p>
            <h3 id={titleId} className="mt-2 text-2xl font-semibold text-[var(--cb-text)]">Profile details</h3>
          </div>
          <TextButton onClick={onClose}>Close</TextButton>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <FormField label="Display name" className="sm:col-span-2">
            <TextField onChange={(event) => updateField('name', event.target.value)} ref={firstFieldRef} required value={form.name} />
          </FormField>
          <FormField label="Private note" className="sm:col-span-2">
            <TextAreaField onChange={(event) => updateField('bio', event.target.value)} rows={4} value={form.bio} />
          </FormField>
          <FormField label="Anniversary view">
            <SelectField onChange={(event) => updateField('anniversaryView', event.target.value)} value={form.anniversaryView}>
              <option value="dual">Both perspectives</option>
              <option value="jaylan">Jaylan perspective</option>
              <option value="omia">Omia perspective</option>
            </SelectField>
          </FormField>
          <FormField label="Relationship date">
            <TextField onChange={(event) => updateField('joinedDate', event.target.value)} type="date" value={form.joinedDate || ''} />
          </FormField>
          <FormField label="Birthday">
            <TextField onChange={(event) => updateField('birthday', event.target.value)} type="date" value={form.birthday || ''} />
          </FormField>
        </div>
        <section className="mt-6 rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-bg-soft)]/45 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-base font-semibold text-[var(--cb-text)]">Important dates</h4>
              <p className="cb-body-copy text-sm">First dates, anniversaries, milestones, and custom dates tied to this profile.</p>
            </div>
            <SecondaryButton onClick={addImportantDate} type="button"><Plus className="size-4" />Add date</SecondaryButton>
          </div>
          <div className="mt-4 space-y-4">
            {form.importantDates.length > 0 ? form.importantDates.map((entry, index) => (
              <div className="grid gap-3 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-3 sm:grid-cols-2" key={entry.id || `date-${entry.date || entry.label || 'draft'}`}>
                <FormField label="Label">
                  <TextField onChange={(event) => updateImportantDate(index, 'label', event.target.value)} placeholder="First date" value={entry.label || ''} />
                </FormField>
                <FormField label="Date">
                  <TextField onChange={(event) => updateImportantDate(index, 'date', event.target.value)} type="date" value={entry.date || ''} />
                </FormField>
                <FormField label="Type">
                  <SelectField onChange={(event) => updateImportantDate(index, 'type', event.target.value)} value={entry.type || 'custom'}>
                    <option value="first-date">First date</option>
                    <option value="primary-anniversary">Primary anniversary</option>
                    <option value="anniversary">Other anniversary</option>
                    <option value="milestone">Milestone</option>
                    <option value="custom">Custom</option>
                  </SelectField>
                </FormField>
                <FormField label="Repeats">
                  <SelectField onChange={(event) => updateImportantDate(index, 'repeatsAnnually', event.target.value === 'annual')} value={entry.repeatsAnnually === false ? 'once' : 'annual'}>
                    <option value="annual">Every year</option>
                    <option value="once">One time</option>
                  </SelectField>
                </FormField>
                <FormField label="Private note" className="sm:col-span-2">
                  <TextField onChange={(event) => updateImportantDate(index, 'note', event.target.value)} value={entry.note || ''} />
                </FormField>
                <div className="sm:col-span-2">
                  <TextButton onClick={() => removeImportantDate(index)} type="button"><Trash2 className="size-4" />Remove date</TextButton>
                </div>
              </div>
            )) : <p className="cb-body-copy text-sm">No extra dates added yet.</p>}
          </div>
        </section>
        {status?.message ? <div className="mt-5"><InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /></div> : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton loading={status?.saving} type="submit">{status?.saving ? 'Saving' : 'Save'}</PrimaryButton>
        </div>
        </form>
      </dialog>
    </div>,
    document.body,
  )
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <LoadingSkeleton className="h-48" />
      <LoadingSkeleton className="h-48" />
    </div>
  )
}

function buildPeopleForApprovedUser(modelPeople, approvedUser) {
  const basePeople = modelPeople || []
  if (!approvedUser || basePeople.some((person) => isOwnerProfile(person, approvedUser))) return basePeople

  const displayName = approvedUser.displayName || approvedUser.username || 'Jaylan'
  return [
    {
      anniversaryView: 'dual',
      bio: '',
      birthday: '',
      details: [],
      displayName,
      id: approvedUser.username || displayName,
      importantDates: [],
      joinedDate: '',
      revision: 0,
    },
    ...basePeople,
  ]
}

function ProfileHero({ onEditRelationship, people, primaryAnniversary }) {
  return (
    <div className="cb-us-hero-new">
      <div>
        <h2>{relationshipTitle(people)}</h2>
        <p>{primaryAnniversary?.dateLabel ? `Together since ${primaryAnniversary.dateLabel}` : 'Set the relationship date to calculate anniversaries and time together.'}</p>
      </div>
      <div className="cb-us-hero-actions">
        <SecondaryButton as={Link} to="/favorites"><Star className="size-4" />Favorites</SecondaryButton>
        <PrimaryButton onClick={onEditRelationship}>Edit Relationship</PrimaryButton>
      </div>
    </div>
  )
}

function ProfileFacts({ nextImportantDate, primaryAnniversary }) {
  return (
    <div className="cb-us-facts">
      <div>
        <span>Together since</span>
        <strong>{primaryAnniversary?.dateLabel || 'Add date'}</strong>
      </div>
      <div>
        <span>Time together</span>
        <strong>{primaryAnniversary?.timeTogetherLabel || 'Add date'}</strong>
      </div>
      <div>
        <span>Next anniversary</span>
        <strong>{primaryAnniversary?.countdownLabel || 'Add date'}</strong>
      </div>
      <div>
        <span>Next important date</span>
        <strong>{nextImportantDate?.countdownLabel || 'Add date'}</strong>
      </div>
    </div>
  )
}

function PartnerRow({ approvedUser, index, onEdit, person }) {
  return (
    <article className="cb-us-partner-row">
      <div className="cb-us-avatar">{relationshipDisplayName(person.displayName, index).slice(0, 1)}</div>
      <div>
        <h4>{relationshipDisplayName(person.displayName, index)}</h4>
        {person.birthdayLabel ? <p>Birthday {person.birthdayLabel}</p> : null}
        {person.bio ? <p>{person.bio}</p> : null}
      </div>
      {isOwnerProfile(person, approvedUser) ? <SecondaryButton onClick={() => onEdit(person)}>Edit</SecondaryButton> : null}
    </article>
  )
}

function PartnersPanel({ approvedUser, onEdit, people }) {
  return (
    <section className="cb-us-panel">
      <div className="cb-us-section-title">
        <HeartHandshake className="size-4" />
        <h3>Partners</h3>
      </div>
      <div className="cb-us-partners">
        {people.map((person, index) => (
          <PartnerRow approvedUser={approvedUser} index={index} key={person.id} onEdit={onEdit} person={person} />
        ))}
      </div>
    </section>
  )
}

function ImportantDateRow({ item }) {
  return (
    <article className="cb-us-date-row">
      <div>
        <h4>{item.label}</h4>
        <p>{item.dateLabel || 'Add date'}</p>
      </div>
      <StatusBadge tone={item.daysUntil === 0 ? 'success' : 'info'}>{item.countdownLabel || 'Saved'}</StatusBadge>
    </article>
  )
}

function ImportantDatesPanel({ importantDates }) {
  return (
    <section className="cb-us-panel">
      <div className="cb-us-section-title">
        <CalendarDays className="size-4" />
        <h3>Important dates</h3>
      </div>
      <div className="cb-us-date-list">
        {importantDates.length > 0
          ? importantDates.map((item) => <ImportantDateRow item={item} key={item.id} />)
          : <EmptyState title="No dates yet." description="Edit a profile to add birthdays and relationship dates." />}
      </div>
    </section>
  )
}

function FavoritesPanel({ highlights }) {
  return (
    <section className="cb-us-panel">
      <div className="cb-us-section-title">
        <Star className="size-4" />
        <h3>Favorites</h3>
      </div>
      <div className="cb-us-favorite-strip">
        {highlights?.length > 0 ? highlights.map((highlight) => (
          <span key={highlight.id}>{highlight.label}</span>
        )) : <p>No shared favorites yet.</p>}
        <SecondaryButton as={Link} to="/favorites">Manage Favorites</SecondaryButton>
      </div>
    </section>
  )
}

export function ProfileView({ compatibilityError, compatibilityState, model, onRefresh }) {
  const writer = useOwnerWrite(onRefresh)
  const [editingPerson, setEditingPerson] = useState(null)
  const [status, setStatus] = useState({ kind: '', message: '', saving: false })

  const people = useMemo(() => buildPeopleForApprovedUser(model.people, writer.approvedUser), [model.people, writer.approvedUser])

  const primaryAnniversary = model.relationship?.primaryAnniversary || null
  const nextImportantDate = model.relationship?.nextImportantDate || null
  const importantDates = model.relationship?.importantDates || []

  async function saveProfile(payload) {
    setStatus({ kind: '', message: '', saving: true })
    try {
      await writer.saveProfile(payload)
      setStatus({ kind: 'success', message: 'Profile saved.', saving: false })
      setEditingPerson(null)
    } catch (error) {
      setStatus({ kind: 'error', message: error?.message || 'Profile could not be saved.', saving: false })
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
    <section className="cb-us-redesign" data-route="profile">
      <ProfileHero onEditRelationship={() => people[0] && setEditingPerson(people[0])} people={people} primaryAnniversary={primaryAnniversary} />

      {model.sourceStatus?.overall === 'partial' && model.warnings?.length > 0 ? (
        <InlineAlert
          description={model.warnings.slice(0, 2).join(' ')}
          title="Some Us details need a retry"
          tone="warning"
        />
      ) : null}

      {status.message && !editingPerson ? <InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /> : null}

      <ProfileFacts nextImportantDate={nextImportantDate} primaryAnniversary={primaryAnniversary} />

      <div className="cb-us-grid">
        <PartnersPanel approvedUser={writer.approvedUser} onEdit={setEditingPerson} people={people} />
        <ImportantDatesPanel importantDates={importantDates} />
      </div>

      <FavoritesPanel highlights={model.sharedHighlights} />

      {editingPerson ? <ProfileEditDialog onClose={() => setEditingPerson(null)} onSave={saveProfile} person={editingPerson} status={status} /> : null}
    </section>
  )
}
