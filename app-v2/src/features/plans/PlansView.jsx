import { useState } from 'react'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'

const PLAN_CATEGORIES = ['Date Idea', 'Place to Visit', 'Restaurant', 'Movie or Show', 'Goal', 'Gift or Surprise', 'Bucket List', 'Other']
const PLAN_STATUSES = ['idea', 'planned', 'completed']
const STATUS_FILTERS = ['all', 'idea', 'planned', 'completed']

function today() {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm() {
  return {
    title: '',
    category: 'Date Idea',
    status: 'idea',
    targetDate: '',
    notes: '',
    revision: 0,
    convertedMemoryId: '',
  }
}

function PlanForm({ initialPlan, onCancel, onSave, saving }) {
  const [form, setForm] = useState(() => initialPlan || emptyForm())

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    await onSave(form)
  }

  return (
    <form className="plan-form glass-card card-utility" onSubmit={submit}>
      <label className="form-group">
        <span className="form-label">Plan title</span>
        <input className="form-input" maxLength={160} onChange={(event) => update('title', event.target.value)} required value={form.title} />
      </label>
      <div className="plan-form-grid">
        <label className="form-group">
          <span className="form-label">Category</span>
          <select className="form-select" onChange={(event) => update('category', event.target.value)} value={form.category}>
            {PLAN_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="form-group">
          <span className="form-label">Status</span>
          <select className="form-select" onChange={(event) => update('status', event.target.value)} value={form.status}>
            {PLAN_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="form-group">
          <span className="form-label">Target date</span>
          <input className="form-input" onChange={(event) => update('targetDate', event.target.value)} type="date" value={form.targetDate} />
        </label>
      </div>
      <label className="form-group">
        <span className="form-label">Notes</span>
        <textarea className="form-textarea" maxLength={1200} onChange={(event) => update('notes', event.target.value)} rows={4} value={form.notes} />
      </label>
      <div className="faithful-inline-actions">
        <button className="btn btn-primary" disabled={saving} type="submit">{saving ? 'Saving...' : 'Save plan'}</button>
        <button className="btn btn-secondary" onClick={onCancel} type="button">Cancel</button>
      </div>
    </form>
  )
}

function PlanCard({ onConvert, onEdit, onStatus, plan, saving }) {
  return (
    <article className={`plan-card glass-card card-story plan-card--${plan.status}`}>
      <div className="plan-card-header">
        <div>
          <p className="dashboard-section-kicker">{plan.category}</p>
          <h3>{plan.title}</h3>
        </div>
        <span className="utility-chip">{plan.status}</span>
      </div>
      {plan.targetDate ? <time className="plan-date">For {plan.targetDate}</time> : <span className="plan-date">No date yet</span>}
      {plan.notes ? <p>{plan.notes}</p> : <p className="faithful-empty-copy">No extra notes yet.</p>}
      <div className="faithful-inline-actions">
        <button className="btn btn-secondary" onClick={() => onEdit(plan)} type="button">Edit</button>
        {plan.status !== 'completed' ? (
          <button className="btn btn-secondary" disabled={saving} onClick={() => onStatus(plan, 'completed')} type="button">Complete</button>
        ) : null}
        {plan.status === 'completed' && !plan.convertedMemoryId ? (
          <button className="btn btn-primary" disabled={saving} onClick={() => onConvert(plan)} type="button">Turn This Into a Memory</button>
        ) : null}
        {plan.convertedMemoryId ? <span className="state-support">Memory created</span> : null}
      </div>
    </article>
  )
}

export function PlansView({ model, onRefresh, search, setSearch, setStatus, status }) {
  const writer = useOwnerWrite(onRefresh)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [feedback, setFeedback] = useState({ kind: '', message: '', saving: false })
  async function savePlan(payload) {
    setFeedback({ kind: '', message: '', saving: true })
    try {
      if (editing?.id) await writer.updatePlan(editing.id, payload)
      else await writer.createPlan(payload)
      setFeedback({ kind: 'success', message: 'Plan saved.', saving: false })
      setEditing(null)
      setShowForm(false)
    } catch (error) {
      setFeedback({ kind: 'error', message: error?.message || 'Plan could not be saved.', saving: false })
    }
  }

  async function updateStatus(plan, nextStatus) {
    await savePlan({ ...plan, status: nextStatus })
  }

  async function convertPlan(plan) {
    if (!window.confirm(`Turn "${plan.title}" into a memory?`)) return
    setFeedback({ kind: '', message: '', saving: true })
    try {
      await writer.convertPlanToMemory(plan.id, { ...plan, completedDate: plan.targetDate || today() })
      setFeedback({ kind: 'success', message: 'Plan became a memory.', saving: false })
    } catch (error) {
      setFeedback({ kind: 'error', message: error?.message || 'Plan could not become a memory.', saving: false })
    }
  }

  return (
    <section className="plans-page">
      <header className="page-header page-header--split">
        <div className="page-heading">
          <p className="page-eyebrow">Our Plans</p>
          <h1 className="page-title">Ideas worth doing together.</h1>
          <p className="page-subtitle">Keep date ideas, trips, goals, and little surprises in one private couple-scoped place.</p>
        </div>
        <div className="page-actions">
          <span className="utility-chip">{model.counts.total} active</span>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }} type="button">Add Plan</button>
        </div>
      </header>
      {feedback.message ? <p className={`workflow-feedback ${feedback.kind === 'error' ? 'workflow-feedback-error' : 'workflow-feedback-success'}`} role="status">{feedback.message}</p> : null}
      <section className="glass-card card-utility plan-toolbar">
        <label className="form-group">
          <span className="form-label">Search plans</span>
          <input className="form-input" onChange={(event) => setSearch(event.target.value)} placeholder="Search ideas, places, notes" type="search" value={search} />
        </label>
        <div className="faithful-inline-actions" role="group" aria-label="Filter plans by status">
          {STATUS_FILTERS.map((option) => (
            <button className={`tab-btn ${status === option ? 'active' : ''}`} key={option} onClick={() => setStatus(option)} type="button">
              {option === 'all' ? 'All' : option}
            </button>
          ))}
        </div>
      </section>
      {showForm ? (
        <PlanForm
          initialPlan={editing}
          onCancel={() => { setEditing(null); setShowForm(false) }}
          onSave={savePlan}
          saving={feedback.saving}
        />
      ) : null}
      <div className="plans-grid">
        {model.filtered.length ? model.filtered.map((plan) => (
          <PlanCard
            key={plan.id}
            onConvert={convertPlan}
            onEdit={(selected) => { setEditing(selected); setShowForm(true) }}
            onStatus={updateStatus}
            plan={plan}
            saving={feedback.saving}
          />
        )) : (
          <div className="editorial-empty-state">
            <h2>{model.emptyState.title}</h2>
            <p>{model.emptyState.description}</p>
          </div>
        )}
      </div>
    </section>
  )
}
