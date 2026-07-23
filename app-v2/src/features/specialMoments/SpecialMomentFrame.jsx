import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'
import { getSpecialMomentConfig } from './specialMomentConfig.js'
import { useSpecialMomentContent } from './useSpecialMomentContent.js'

const COPY = {
  birthday: {
    className: 'special-page-birthday',
    badge: '🎂',
    title: 'Birthday Page',
    fallback: 'A private birthday chapter from the legacy book.',
  },
  valentine: {
    className: 'special-page-valentine',
    badge: '💌',
    title: 'Valentine Page',
    fallback: 'A private Valentine chapter from the legacy book.',
  },
  confession: {
    className: 'special-page-confession',
    badge: '💖',
    title: 'Confession Page',
    fallback: 'A private confession chapter from the legacy book.',
  },
}

function sectionText(model) {
  const sections = model.moment?.sections || []
  const text = sections.flatMap((section) => [section.content, ...(section.items || [])]).filter(Boolean)
  return text.length > 0 ? text : [model.moment?.subtitle || model.config?.summary || 'This private moment is protected inside Couple Book.']
}

function SpecialMomentSections({ model, fallback }) {
  const sections = model.moment?.sections || []

  if (sections.length === 0) {
    return sectionText(model).slice(0, 3).map((paragraph) => (
      <p key={paragraph}>{paragraph || fallback}</p>
    ))
  }

  return sections.slice(0, 4).map((section) => (
    <section className="special-page-section" key={section.id || section.heading || section.content}>
      {section.heading ? <h2>{section.heading}</h2> : null}
      {section.content ? <p>{section.content}</p> : null}
      {section.items?.length > 0 ? (
        <ul className="special-page-list">
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  ))
}

function normalizeSections(moment) {
  const sections = Array.isArray(moment?.sections) ? moment.sections : []
  if (sections.length === 0) {
    return [{ id: 'section-1', kind: 'paragraph', content: moment?.subtitle || '' }]
  }

  return sections.slice(0, 8).map((section, index) => ({
    id: section.id || section.heading || `section-${index + 1}`,
    kind: ['paragraph', 'note', 'quote', 'list'].includes(section.kind) ? section.kind : 'paragraph',
    content: section.content || (section.items || []).join('\n') || section.heading || '',
  }))
}

function SpecialMomentEditDialog({ copy, model, momentKey, onClose, onSave, status }) {
  const firstFieldRef = useRef(null)
  const [form, setForm] = useState(() => ({
    title: model.moment?.title || model.config?.title || copy.title,
    subtitle: model.moment?.subtitle || '',
    date: model.moment?.date || '',
    sections: normalizeSections(model.moment),
  }))

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function updateSection(index, key, value) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) => (sectionIndex === index ? { ...section, [key]: value } : section)),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await onSave(momentKey, form)
  }

  return createPortal(
    <dialog aria-labelledby="special-edit-title" className="modal-overlay active faithful-modal-open" onCancel={onClose} open>
      <form className="modal-container faithful-edit-form" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h3 className="modal-title" id="special-edit-title">Edit {copy.title}</h3>
          <button aria-label="Close special page form" className="modal-close" onClick={onClose} type="button">×</button>
        </div>
        <div className="modal-body">
          <label className="form-group">
            <span className="form-label">Title</span>
            <input className="form-input" onChange={(event) => updateField('title', event.target.value)} ref={firstFieldRef} required type="text" value={form.title} />
          </label>
          <label className="form-group">
            <span className="form-label">Subtitle</span>
            <input className="form-input" onChange={(event) => updateField('subtitle', event.target.value)} type="text" value={form.subtitle} />
          </label>
          <label className="form-group">
            <span className="form-label">Date</span>
            <input className="form-input" onChange={(event) => updateField('date', event.target.value)} type="date" value={form.date || ''} />
          </label>
          {form.sections.map((section, index) => (
            <div className="form-group" key={section.id}>
              <label className="form-label" htmlFor={`special-section-${index}`}>Section {index + 1}</label>
              <select aria-label={`Section ${index + 1} type`} className="form-select" onChange={(event) => updateSection(index, 'kind', event.target.value)} value={section.kind}>
                <option value="paragraph">Paragraph</option>
                <option value="note">Note</option>
                <option value="quote">Quote</option>
                <option value="list">List</option>
              </select>
              <textarea className="form-textarea" id={`special-section-${index}`} onChange={(event) => updateSection(index, 'content', event.target.value)} required rows={4} value={section.content} />
            </div>
          ))}
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

export function SpecialMomentFrame({ momentKey }) {
  const config = getSpecialMomentConfig(momentKey)
  const { model, refreshCompatibility } = useSpecialMomentContent(momentKey)
  const writer = useOwnerWrite(refreshCompatibility)
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState({ kind: '', message: '', saving: false })
  const copy = COPY[momentKey] || COPY.confession
  const title = model.moment?.title || config?.title || copy.title

  async function saveMoment(type, payload) {
    setStatus({ kind: '', message: '', saving: true })
    try {
      await writer.saveSpecialMoment(type, payload)
      setStatus({ kind: 'success', message: 'Page text saved.', saving: false })
      setEditing(false)
    } catch (error) {
      setStatus({ kind: 'error', message: error?.message || 'Editing is temporarily unavailable.', saving: false })
    }
  }

  return (
    <section className={`special-page-standalone ${copy.className}`}>
      <main className="card glass-card" aria-live="polite">
        <div className="badge">{copy.badge}</div>
        <h1>{title}</h1>
        <SpecialMomentSections model={model} fallback={copy.fallback} />
        <div className="actions">
          <button className="btn btn-secondary" onClick={() => setEditing(true)} type="button">Edit</button>
          <Link className="btn btn-primary" to="/dashboard">Return to Dashboard</Link>
          <Link className="btn btn-secondary" to="/gallery">Open Gallery</Link>
        </div>
        {status.message && !editing ? <p className={`workflow-feedback ${status.kind === 'error' ? 'workflow-feedback-error' : 'workflow-feedback-success'}`} role="status">{status.message}</p> : null}
      </main>
      {editing ? <SpecialMomentEditDialog copy={copy} model={model} momentKey={momentKey} onClose={() => setEditing(false)} onSave={saveMoment} status={status} /> : null}
    </section>
  )
}
