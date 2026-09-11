import { useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, HeartHandshake, Star } from 'lucide-react'
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
  const currentNames = [approvedUser?.username, approvedUser?.displayName, approvedUser?.profileName].map(normalizeName).filter(Boolean)
  return currentNames.includes(normalizeName(person.id)) || currentNames.includes(normalizeName(person.displayName))
}

function relationshipTitle(people) {
  const names = people.map((person, index) => relationshipDisplayName(person.displayName, index)).filter(Boolean)
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
    revision: person?.revision || 0,
  }))

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
      <form ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative w-full max-w-2xl rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[0_24px_80px_rgba(36,19,29,0.18)]" onSubmit={handleSubmit}>
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
        {status?.message ? <div className="mt-5"><InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /></div> : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton loading={status?.saving} type="submit">{status?.saving ? 'Saving' : 'Save'}</PrimaryButton>
        </div>
      </form>
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

export function ProfileView({ compatibilityError, compatibilityState, model, onRefresh }) {
  const writer = useOwnerWrite(onRefresh)
  const [editingPerson, setEditingPerson] = useState(null)
  const [status, setStatus] = useState({ kind: '', message: '', saving: false })

  const people = useMemo(() => {
    const basePeople = model.people || []
    if (!writer.approvedUser || basePeople.some((person) => isOwnerProfile(person, writer.approvedUser))) return basePeople
    const displayName = writer.approvedUser.displayName || writer.approvedUser.username || 'Jaylan'
    return [{ id: writer.approvedUser.username || displayName, displayName, bio: '', anniversaryView: 'dual', joinedDate: '', birthday: '', revision: 0, details: [] }, ...basePeople]
  }, [model.people, writer.approvedUser])

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
      <div className="cb-us-hero-new">
        <div>
          <h2>{relationshipTitle(people)}</h2>
          <p>{primaryAnniversary?.dateLabel ? `Together since ${primaryAnniversary.dateLabel}` : 'Set the relationship date to calculate anniversaries and time together.'}</p>
        </div>
        <div className="cb-us-hero-actions">
          <SecondaryButton as={Link} to="/favorites"><Star className="size-4" />Favorites</SecondaryButton>
          <PrimaryButton onClick={() => people[0] && setEditingPerson(people[0])}>Edit Relationship</PrimaryButton>
        </div>
      </div>

      {status.message && !editingPerson ? <InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /> : null}

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

      <div className="cb-us-grid">
        <section className="cb-us-panel">
          <div className="cb-us-section-title">
            <HeartHandshake className="size-4" />
            <h3>Partners</h3>
          </div>
          <div className="cb-us-partners">
            {people.map((person, index) => (
              <article className="cb-us-partner-row" key={person.id}>
                <div className="cb-us-avatar">{relationshipDisplayName(person.displayName, index).slice(0, 1)}</div>
                <div>
                  <h4>{relationshipDisplayName(person.displayName, index)}</h4>
                  {person.birthdayLabel ? <p>Birthday {person.birthdayLabel}</p> : null}
                  {person.bio ? <p>{person.bio}</p> : null}
                </div>
                {isOwnerProfile(person, writer.approvedUser) ? <SecondaryButton onClick={() => setEditingPerson(person)}>Edit</SecondaryButton> : null}
              </article>
            ))}
          </div>
        </section>

        <section className="cb-us-panel">
          <div className="cb-us-section-title">
            <CalendarDays className="size-4" />
            <h3>Important dates</h3>
          </div>
          <div className="cb-us-date-list">
            {importantDates.length > 0 ? importantDates.map((item) => (
              <article className="cb-us-date-row" key={item.id}>
                <div>
                  <h4>{item.label}</h4>
                  <p>{item.dateLabel || 'Add date'}</p>
                </div>
                <StatusBadge tone={item.daysUntil === 0 ? 'success' : 'info'}>{item.countdownLabel || 'Saved'}</StatusBadge>
              </article>
            )) : <EmptyState title="No dates yet." description="Edit a profile to add birthdays and relationship dates." />}
          </div>
        </section>
      </div>

      <section className="cb-us-panel">
        <div className="cb-us-section-title">
          <Star className="size-4" />
          <h3>Favorites</h3>
        </div>
        <div className="cb-us-favorite-strip">
          {model.sharedHighlights?.length > 0 ? model.sharedHighlights.map((highlight) => (
            <span key={highlight.id}>{highlight.label}</span>
          )) : <p>No shared favorites yet.</p>}
          <SecondaryButton as={Link} to="/favorites">Manage Favorites</SecondaryButton>
        </div>
      </section>

      {editingPerson ? <ProfileEditDialog onClose={() => setEditingPerson(null)} onSave={saveProfile} person={editingPerson} status={status} /> : null}
    </section>
  )
}
