import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'

const MEMORY_TYPES = ['Everyday Moment', 'Date', 'First', 'Trip', 'Milestone', 'Celebration', 'Funny Moment', 'Note', 'Photo Memory', 'Video Memory']

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
    <dialog aria-labelledby="quick-add-title" className="modal-overlay active faithful-modal-open quick-add-dialog" onCancel={requestClose} open>
      <form className="modal-container quick-add-panel" onSubmit={submit}>
        <div className="modal-header">
          <div>
            <p className="dashboard-section-kicker">Quick Add</p>
            <h3 className="modal-title" id="quick-add-title">Save a memory</h3>
          </div>
          <button aria-label="Close Quick Add" className="modal-close" onClick={requestClose} type="button">×</button>
        </div>
        <div className="quick-add-steps" aria-label="Memory steps">
          {['What', 'When', 'Kind', 'Details'].map((label, index) => (
            <button className={`quick-add-step ${step === index ? 'active' : ''}`} key={label} onClick={() => setStep(index)} type="button">
              <span>{index + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <div className="modal-body quick-add-body">
          {step === 0 ? (
            <label className="form-group">
              <span className="form-label">What happened?</span>
              <input aria-describedby={errors.title ? 'quick-add-title-error' : undefined} className="form-input" maxLength={180} onChange={(event) => update('title', event.target.value)} ref={firstFieldRef} required value={form.title} />
              {errors.title ? <span className="form-error" id="quick-add-title-error">{errors.title}</span> : null}
            </label>
          ) : null}
          {step === 1 ? (
            <label className="form-group">
              <span className="form-label">When did it happen?</span>
              <input className="form-input" onChange={(event) => update('date', event.target.value)} required type="date" value={form.date} />
              {errors.date ? <span className="form-error">{errors.date}</span> : null}
            </label>
          ) : null}
          {step === 2 ? (
            <label className="form-group">
              <span className="form-label">What kind of moment was it?</span>
              <select className="form-select" onChange={(event) => update('kindLabel', event.target.value)} value={form.kindLabel}>
                {MEMORY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
          ) : null}
          {step === 3 ? (
            <div className="quick-add-detail-grid">
              <label className="form-group">
                <span className="form-label">Optional details</span>
                <textarea className="form-textarea" maxLength={2000} onChange={(event) => update('description', event.target.value)} rows={5} value={form.description} />
              </label>
              <label className="form-group">
                <span className="form-label">Tags</span>
                <input className="form-input" onChange={(event) => update('tags', event.target.value)} placeholder="date night, trip, first" value={form.tags} />
              </label>
              <label className="form-group">
                <span className="form-label">Related media note</span>
                <input className="form-input" onChange={(event) => update('mediaNote', event.target.value)} placeholder="Photo is in iCloud album..." value={form.mediaNote} />
              </label>
            </div>
          ) : null}
          {status.message ? <p className={`workflow-feedback ${status.kind === 'error' ? 'workflow-feedback-error' : 'workflow-feedback-success'}`} role="status">{status.message}</p> : null}
        </div>
        <div className="modal-footer quick-add-footer">
          <button className="btn btn-secondary" disabled={step === 0 || status.saving} onClick={() => setStep((value) => Math.max(0, value - 1))} type="button">Back</button>
          {step < 3 ? (
            <button className="btn btn-primary" disabled={status.saving} onClick={() => setStep((value) => Math.min(3, value + 1))} type="button">More Details</button>
          ) : (
            <button className="btn btn-primary" disabled={status.saving || Object.keys(errors).length > 0} type="submit">{status.saving ? 'Saving...' : 'Save memory'}</button>
          )}
          <button className="btn btn-secondary" disabled={status.saving || Object.keys(errors).length > 0} type="submit">Fast Save</button>
        </div>
      </form>
    </dialog>,
    document.body,
  )
}
