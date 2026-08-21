import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { PrimaryButton, SecondaryButton, TextButton } from '../../components/ui/Button.jsx'
import { FormField, SelectField, TextAreaField, TextField } from '../../components/ui/FormField.jsx'
import { InlineAlert } from '../../components/ui/InlineAlert.jsx'
import { PageTabs } from '../../components/ui/PageTabs.jsx'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'

const MEMORY_TYPES = ['Everyday Moment', 'Date', 'First', 'Trip', 'Milestone', 'Celebration', 'Funny Moment', 'Note', 'Photo Memory', 'Video Memory']
const STEPS = [
  { id: 'what', label: 'What' },
  { id: 'when', label: 'When' },
  { id: 'kind', label: 'Kind' },
  { id: 'details', label: 'Details' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function initialForm() {
  return {
    title: '',
    date: today(),
    kindLabel: 'Everyday Moment',
    description: '',
    tags: '',
    mediaNote: '',
  }
}

function validate(form) {
  const errors = {}
  if (!form.title.trim()) errors.title = 'Add a short title for what happened.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) errors.date = 'Choose a real date.'
  if (!MEMORY_TYPES.includes(form.kindLabel)) errors.kindLabel = 'Choose a supported kind of memory.'
  return errors
}

export function QuickAddMemory({ onClose, open }) {
  const navigate = useNavigate()
  const writer = useOwnerWrite()
  const firstFieldRef = useRef(null)
  const [form, setForm] = useState(initialForm)
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState({ kind: '', message: '', saving: false })
  const errors = useMemo(() => validate(form), [form])
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm())

  useEffect(() => {
    if (!open) return
    const handle = window.setTimeout(() => firstFieldRef.current?.focus(), 0)
    return () => window.clearTimeout(handle)
  }, [open])

  useEffect(() => {
    if (!open || !isDirty) return undefined
    const handler = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty, open])

  if (!open) return null

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setStatus({ kind: '', message: '', saving: false })
  }

  function requestClose() {
    if (isDirty && !window.confirm('Close without saving this memory?')) return
    onClose()
  }

  async function submit(event) {
    event.preventDefault()
    const nextErrors = validate(form)
    if (Object.keys(nextErrors).length) {
      setStatus({ kind: 'error', message: 'Finish the required fields first.', saving: false })
      return
    }
    setStatus({ kind: '', message: '', saving: true })
    try {
      const memoryId = await writer.createMemory({
        title: form.title,
        date: form.date,
        kindLabel: form.kindLabel,
        description: form.description,
        mediaNote: form.mediaNote,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        revision: 0,
      })
      setStatus({ kind: 'success', message: 'Memory saved. Opening Story...', saving: false })
      setForm(initialForm())
      setTimeout(() => {
        onClose()
        navigate(`/timeline#${memoryId}`)
      }, 450)
    } catch (error) {
      setStatus({ kind: 'error', message: error?.message || 'Memory could not be saved.', saving: false })
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-[#24131d]/40 backdrop-blur-sm" onClick={requestClose} aria-label="Close Quick Add" />
      <form className="relative w-full max-w-2xl rounded-[28px] border border-[#ead7df] bg-white p-6 shadow-[0_24px_80px_rgba(36,19,29,0.18)] sm:p-8" onSubmit={submit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Quick Add</p>
            <h3 className="mt-2 font-serif text-3xl text-[#24131d]">Save a memory</h3>
          </div>
          <TextButton onClick={requestClose}>Close</TextButton>
        </div>

        <div className="mt-5">
          <PageTabs active={STEPS[step].id} controlsPanels={false} label="Quick add steps" onChange={(id) => setStep(STEPS.findIndex((stepEntry) => stepEntry.id === id))} tabs={STEPS} />
        </div>

        <div className="mt-6 grid gap-4">
          {step === 0 ? (
            <FormField label="What happened?">
              <TextField aria-describedby={errors.title ? 'quick-add-title-error' : undefined} maxLength={180} onChange={(event) => update('title', event.target.value)} ref={firstFieldRef} required value={form.title} />
            </FormField>
          ) : null}
          {step === 1 ? (
            <FormField label="When did it happen?">
              <TextField onChange={(event) => update('date', event.target.value)} required type="date" value={form.date} />
            </FormField>
          ) : null}
          {step === 2 ? (
            <FormField label="What kind of moment was it?">
              <SelectField onChange={(event) => update('kindLabel', event.target.value)} value={form.kindLabel}>
                {MEMORY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </SelectField>
            </FormField>
          ) : null}
          {step === 3 ? (
            <>
              <FormField label="Optional details">
                <TextAreaField maxLength={2000} onChange={(event) => update('description', event.target.value)} rows={5} value={form.description} />
              </FormField>
              <FormField label="Tags">
                <TextField onChange={(event) => update('tags', event.target.value)} placeholder="date night, trip, first" value={form.tags} />
              </FormField>
              <FormField label="Related media note">
                <TextField onChange={(event) => update('mediaNote', event.target.value)} placeholder="Photo is in iCloud album..." value={form.mediaNote} />
              </FormField>
            </>
          ) : null}
        </div>

        {errors.title ? <p className="mt-3 text-sm text-[#a3264c]" id="quick-add-title-error">{errors.title}</p> : null}
        {errors.date && step === 1 ? <p className="mt-3 text-sm text-[#a3264c]">{errors.date}</p> : null}
        {status.message ? <div className="mt-5"><InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /></div> : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <SecondaryButton disabled={step === 0 || status.saving} onClick={() => setStep((value) => Math.max(0, value - 1))}>Back</SecondaryButton>
            {step < 3 ? <SecondaryButton disabled={status.saving} onClick={() => setStep((value) => Math.min(3, value + 1))}>More details</SecondaryButton> : null}
          </div>
          <div className="flex gap-2">
            <SecondaryButton disabled={status.saving || Object.keys(errors).length > 0} type="submit">Fast save</SecondaryButton>
            <PrimaryButton disabled={step < 3 || Object.keys(errors).length > 0} loading={status.saving} type="submit">{status.saving ? 'Saving...' : 'Save memory'}</PrimaryButton>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  )
}
