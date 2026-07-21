import { useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { isFirestoreWriteMode, resolveWriteMode } from '../data/writeMode.js'
import {
  acceptContract,
  archiveMemory,
  saveMemory,
  saveOwnFavorites,
  saveOwnProfile,
  saveOwnSettings,
  saveSpecialMomentText,
} from '../services/firestoreWrites.js'
import { EditorialSection } from './PageLayout.jsx'

const DEFAULT_FORM = Object.freeze({
  profile: { name: '', bio: '', joinedDate: '', birthday: '', anniversaryView: '' },
  favorites: { category: 'food', value: '' },
  settings: { theme: 'paper', anniversaryView: '', localOnlyMode: true, reducedMotion: false },
  memory: { title: '', description: '', date: '', tags: '', specialMomentType: 'ordinary' },
  contract: {},
  special: { title: '', subtitle: '', date: '', content: '', kind: 'paragraph' },
})

function statusMessage(kind) {
  if (kind === 'profile') return 'Edit only your personal profile fields. Partner details stay read-only.'
  if (kind === 'favorites') return 'Save your own favorites in approved categories. Use a comma-separated list or leave it blank to clear that category.'
  if (kind === 'settings') return 'Save only your scoped appearance and privacy preferences.'
  if (kind === 'memory') return 'Create or archive text-only shared memories. Media upload stays unavailable.'
  if (kind === 'contract') return 'Record status-only acceptance. Raw signatures are not collected.'
  return 'Update fixed structured text sections for this special moment only.'
}

function Field({ children, label }) {
  return (
    <label className="workflow-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function WriteWorkflowPanel({ kind, momentKey = 'birthday', onRefresh }) {
  const { approvedUser, user } = useAuth()
  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM[kind] }))
  const [state, setState] = useState({ status: 'idle', message: '' })
  const [lastMemoryId, setLastMemoryId] = useState('')
  const enabled = isFirestoreWriteMode()
  const writeMode = resolveWriteMode()

  const context = useMemo(() => ({ approvedUser, user }), [approvedUser, user])

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    if (!enabled) return
    setState({ status: 'saving', message: 'Saving changes.' })

    try {
      if (kind === 'profile') {
        await saveOwnProfile(form, context)
      } else if (kind === 'favorites') {
        await saveOwnFavorites({ [form.category]: form.value.split(',').map((item) => item.trim()).filter(Boolean) }, context)
      } else if (kind === 'settings') {
        await saveOwnSettings(form, context)
      } else if (kind === 'memory') {
        const memoryId = `launch_test_${Date.now()}`
        await saveMemory(memoryId, { ...form, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean) }, context)
        setLastMemoryId(memoryId)
      } else if (kind === 'contract') {
        await acceptContract(context)
      } else if (kind === 'special') {
        await saveSpecialMomentText(momentKey, { ...form, sections: [{ kind: form.kind, content: form.content }] }, context)
      }

      setState({ status: 'success', message: 'Saved to Firestore.' })
      onRefresh?.()
    } catch (error) {
      setState({ status: 'error', message: error?.message || 'The change could not be saved.' })
    }
  }

  async function archiveLatest() {
    if (!enabled || !lastMemoryId) return
    setState({ status: 'saving', message: 'Archiving memory.' })
    try {
      await archiveMemory(lastMemoryId, context)
      setState({ status: 'success', message: 'Temporary memory was archived.' })
      onRefresh?.()
    } catch (error) {
      setState({ status: 'error', message: error?.message || 'The memory could not be archived.' })
    }
  }

  if (!enabled) {
    return (
      <EditorialSection
        className="workflow-section"
        description={`Write mode is ${writeMode}. Editing opens only in an approved Firestore write mode.`}
        eyebrow="Writes disabled"
        title="Safe editing workflow"
      >
        <p className="workflow-note">{statusMessage(kind)}</p>
      </EditorialSection>
    )
  }

  return (
    <EditorialSection
      className="workflow-section"
      description={statusMessage(kind)}
      eyebrow="Approved writes enabled"
      title="Safe editing workflow"
    >
      <form className="workflow-form" onSubmit={submit}>
        {kind === 'profile' ? (
          <>
            <Field label="Display name"><input value={form.name} onChange={(event) => update('name', event.target.value)} required /></Field>
            <Field label="Bio"><textarea value={form.bio} onChange={(event) => update('bio', event.target.value)} rows="4" /></Field>
            <Field label="Joined date"><input type="date" value={form.joinedDate} onChange={(event) => update('joinedDate', event.target.value)} /></Field>
            <Field label="Birthday"><input type="date" value={form.birthday} onChange={(event) => update('birthday', event.target.value)} /></Field>
            <Field label="Anniversary view"><input value={form.anniversaryView} onChange={(event) => update('anniversaryView', event.target.value)} /></Field>
          </>
        ) : null}

        {kind === 'favorites' ? (
          <>
            <Field label="Category">
              <select value={form.category} onChange={(event) => update('category', event.target.value)}>
                {['food', 'songs', 'movies', 'places', 'memories', 'notes'].map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </Field>
            <Field label="Favorites"><input value={form.value} onChange={(event) => update('value', event.target.value)} /></Field>
          </>
        ) : null}

        {kind === 'settings' ? (
          <>
            <Field label="Appearance">
              <select value={form.theme} onChange={(event) => update('theme', event.target.value)}>
                {['paper', 'rose', 'olive', 'plum'].map((theme) => <option key={theme} value={theme}>{theme}</option>)}
              </select>
            </Field>
            <Field label="Anniversary view"><input value={form.anniversaryView} onChange={(event) => update('anniversaryView', event.target.value)} /></Field>
            <label className="workflow-check"><input checked={form.localOnlyMode} onChange={(event) => update('localOnlyMode', event.target.checked)} type="checkbox" /> Local-only privacy note</label>
            <label className="workflow-check"><input checked={form.reducedMotion} onChange={(event) => update('reducedMotion', event.target.checked)} type="checkbox" /> Prefer reduced motion</label>
          </>
        ) : null}

        {kind === 'memory' ? (
          <>
            <Field label="Title"><input value={form.title} onChange={(event) => update('title', event.target.value)} required /></Field>
            <Field label="Date"><input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} required /></Field>
            <Field label="Type">
              <select value={form.specialMomentType} onChange={(event) => update('specialMomentType', event.target.value)}>
                {['ordinary', 'birthday', 'valentine', 'confession'].map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </Field>
            <Field label="Description"><textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows="4" /></Field>
            <Field label="Tags"><input value={form.tags} onChange={(event) => update('tags', event.target.value)} /></Field>
          </>
        ) : null}

        {kind === 'special' ? (
          <>
            <Field label="Title"><input value={form.title} onChange={(event) => update('title', event.target.value)} required /></Field>
            <Field label="Subtitle"><input value={form.subtitle} onChange={(event) => update('subtitle', event.target.value)} /></Field>
            <Field label="Date"><input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} /></Field>
            <Field label="Section type">
              <select value={form.kind} onChange={(event) => update('kind', event.target.value)}>
                {['paragraph', 'note', 'quote', 'list'].map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </Field>
            <Field label="Section text"><textarea value={form.content} onChange={(event) => update('content', event.target.value)} rows="4" required /></Field>
          </>
        ) : null}

        {kind === 'contract' ? <p className="workflow-note">Acceptance stores only your uid in an approved status list.</p> : null}

        <div className="workflow-actions">
          <button className="button button-primary" disabled={!enabled || state.status === 'saving'} type="submit">
            {state.status === 'saving' ? 'Saving' : kind === 'contract' ? 'Accept status' : 'Save'}
          </button>
          {kind === 'memory' ? (
            <button className="button button-secondary" disabled={!enabled || !lastMemoryId || state.status === 'saving'} onClick={archiveLatest} type="button">
              Archive temporary memory
            </button>
          ) : null}
          <button className="button button-secondary" disabled={state.status === 'saving'} onClick={() => setForm({ ...DEFAULT_FORM[kind] })} type="button">
            Cancel
          </button>
        </div>
      </form>
      {state.message ? <p className={`workflow-feedback workflow-feedback-${state.status}`}>{state.message}</p> : null}
    </EditorialSection>
  )
}
