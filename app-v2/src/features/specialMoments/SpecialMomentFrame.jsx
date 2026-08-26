import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { PrimaryButton, SecondaryButton, TextButton } from '../../components/ui/Button.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { FormField, SelectField, TextAreaField, TextField } from '../../components/ui/FormField.jsx'
import { InlineAlert } from '../../components/ui/InlineAlert.jsx'
import { LoadingState } from '../../components/ui/LoadingState.jsx'
import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { ContentCard, Surface } from '../../components/ui/Surface.jsx'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'
import { getSpecialMomentConfig } from './specialMomentConfig.js'
import { useSpecialMomentContent } from './useSpecialMomentContent.js'

const COPY = {
  birthday: {
    badge: 'Birthday',
    title: 'Birthday Chapter',
      fallback: 'A private birthday chapter for the two of you.',
    returnLabel: 'Return to Home',
    kicker: 'A day to celebrate',
    accent: 'radial-gradient(circle at 18% 18%, rgba(255, 214, 102, 0.2), transparent 30%), radial-gradient(circle at 88% 12%, rgba(255, 74, 107, 0.18), transparent 28%), linear-gradient(180deg, rgba(33, 15, 48, 0.98) 0%, rgba(20, 9, 38, 0.98) 100%)',
    backgroundColor: '#140926',
  },
  valentine: {
    badge: 'Valentine',
    title: 'Valentine Letter',
      fallback: 'A private Valentine chapter for the two of you.',
    returnLabel: 'Return to Home',
    kicker: 'A kept love note',
    accent: 'radial-gradient(circle at 18% 18%, rgba(255, 122, 162, 0.18), transparent 32%), radial-gradient(circle at 84% 16%, rgba(255, 213, 226, 0.12), transparent 24%), linear-gradient(180deg, rgba(54, 14, 34, 0.98) 0%, rgba(33, 10, 24, 0.98) 100%)',
    backgroundColor: '#210a18',
  },
  confession: {
    badge: 'Confession',
    title: 'Private Confession',
      fallback: 'A private confession chapter for the two of you.',
    returnLabel: 'Return to Home',
    kicker: 'Private reading',
    accent: 'radial-gradient(circle at 16% 18%, rgba(227, 138, 174, 0.14), transparent 30%), radial-gradient(circle at 86% 14%, rgba(201, 154, 255, 0.12), transparent 24%), linear-gradient(180deg, rgba(36, 14, 26, 0.98) 0%, rgba(22, 8, 16, 0.98) 100%)',
    backgroundColor: '#160810',
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
      <p className="text-sm leading-7 text-[#5A443B]" key={paragraph}>{paragraph || fallback}</p>
    ))
  }

  return sections.slice(0, 4).map((section) => (
    <section className="grid gap-3" key={section.id || section.heading || section.content}>
      {section.heading ? <h3 className="font-serif text-2xl text-[#fff6fb]">{section.heading}</h3> : null}
      {section.content ? <p className="text-sm leading-7 text-[#f0dfe7]">{section.content}</p> : null}
      {section.items?.length > 0 ? (
        <ul className="grid gap-2 pl-5 text-sm leading-7 text-[#f0dfe7]">
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
  const titleId = useId()
  const [form, setForm] = useState(() => ({
    title: model.moment?.title || model.config?.title || copy.title,
    subtitle: model.moment?.subtitle || '',
    date: model.moment?.date || '',
    revision: model.moment?.revision || 0,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-[#24131d]/40 backdrop-blur-sm" onClick={onClose} aria-label="Close special page form" />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-auto rounded-[28px] border border-[#ead7df] bg-white p-6 shadow-[0_24px_80px_rgba(36,19,29,0.18)] sm:p-8"
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8f5168]">Edit {copy.badge}</p>
            <h3 id={titleId} className="mt-2 font-serif text-3xl text-[#24131d]">{copy.title}</h3>
          </div>
          <TextButton aria-label="Close" onClick={onClose}>Close</TextButton>
        </div>
        <div className="mt-6 grid gap-4">
          <FormField label="Title">
            <TextField onChange={(event) => updateField('title', event.target.value)} ref={firstFieldRef} required value={form.title} />
          </FormField>
          <FormField label="Subtitle">
            <TextField onChange={(event) => updateField('subtitle', event.target.value)} value={form.subtitle} />
          </FormField>
          <FormField label="Date">
            <TextField onChange={(event) => updateField('date', event.target.value)} type="date" value={form.date || ''} />
          </FormField>
          {form.sections.map((section, index) => (
            <ContentCard key={section.id}>
              <div className="grid gap-3">
                <FormField label={`Section ${index + 1} type`}>
                  <SelectField onChange={(event) => updateSection(index, 'kind', event.target.value)} value={section.kind}>
                    <option value="paragraph">Paragraph</option>
                    <option value="note">Note</option>
                    <option value="quote">Quote</option>
                    <option value="list">List</option>
                  </SelectField>
                </FormField>
                <FormField label="Content">
                  <TextAreaField onChange={(event) => updateSection(index, 'content', event.target.value)} required rows={5} value={section.content} />
                </FormField>
              </div>
            </ContentCard>
          ))}
        </div>
        {status?.message ? <div className="mt-5"><InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /></div> : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton loading={status?.saving} type="submit">{status?.saving ? 'Saving page' : 'Save page'}</PrimaryButton>
        </div>
      </form>
    </div>,
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
  const subtitle = model.moment?.subtitle || model.config?.summary || 'A private page kept inside Couple Book.'

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

  if (model.status === 'loading') {
    return <LoadingState message={`Loading ${copy.title}...`} />
  }

  if (model.status === 'invalid') {
    return <ErrorState title="Special page unavailable" message="This special page is not configured correctly." onRetry={refreshCompatibility} />
  }

  return (
    <section className="space-y-5" data-route={momentKey}>
      <PageHeader
        eyebrow={copy.kicker}
        title={title}
        description={subtitle}
        actions={(
          <>
            <SecondaryButton onClick={() => setEditing(true)}>Edit</SecondaryButton>
            <PrimaryButton as={Link} to="/dashboard">{copy.returnLabel}</PrimaryButton>
          </>
        )}
      />

      {status.message && !editing ? <InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /> : null}
      {model.warnings?.length ? (
        <InlineAlert
          tone="info"
          title="Protected content notes"
          description={`This page loaded with ${model.warnings.length} runtime note${model.warnings.length === 1 ? '' : 's'}.`}
        />
      ) : null}

      <Surface className={`special-page-standalone special-page-${momentKey} overflow-hidden`} tone="soft">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
          <div className="card rounded-[24px] p-6 text-white" style={{ background: copy.accent, backgroundColor: copy.backgroundColor }}>
            <StatusBadge tone="warning">{copy.badge}</StatusBadge>
            {model.moment?.date ? <p className="mt-4 text-sm text-white/72">{new Date(model.moment.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p> : null}
            <div className="mt-5 grid gap-5">
              <SpecialMomentSections model={model} fallback={copy.fallback} />
            </div>
          </div>
          <div className="grid gap-4">
            <Surface tone="soft">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Private boundary</p>
              <p className="mt-2 text-sm leading-6 text-[#6B564C]">This page remains runtime-only. The protected shell can read it after access checks without bundling the private content into public assets.</p>
            </Surface>
            <Surface tone="soft">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Go next</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <SecondaryButton as={Link} to="/gallery">Open Album</SecondaryButton>
                <SecondaryButton as={Link} to="/timeline">Open Story</SecondaryButton>
              </div>
            </Surface>
          </div>
        </div>
      </Surface>
      {editing ? <SpecialMomentEditDialog copy={copy} model={model} momentKey={momentKey} onClose={() => setEditing(false)} onSave={saveMoment} status={status} /> : null}
    </section>
  )
}
