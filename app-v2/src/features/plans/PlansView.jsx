import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Sparkles } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { FormField, SelectField, TextAreaField, TextField } from '../../components/ui/FormField.jsx'
import { InlineAlert } from '../../components/ui/InlineAlert.jsx'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton.jsx'
import { LoadingState } from '../../components/ui/LoadingState.jsx'
import { SearchField } from '../../components/ui/SearchField.jsx'
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { ContentCard, Surface } from '../../components/ui/Surface.jsx'
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button.jsx'
import { ContextMenu } from '../../components/ui/ContextMenu.jsx'
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

function planTone(status) {
  if (status === 'completed') return 'success'
  if (status === 'planned') return 'info'
  return 'warning'
}

function statusLabel(status) {
  if (status === 'idea') return 'Ideas'
  if (status === 'planned') return 'Planned'
  if (status === 'completed') return 'Completed'
  return status
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
    <Surface as="form" className="cb-plan-form" onSubmit={submit}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">{form.id ? 'Edit plan' : 'New plan'}</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--cb-text)]">{form.id ? 'Update this plan' : 'Add a new plan'}</h3>
        </div>
        <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <FormField className="lg:col-span-2" label="Plan title">
          <TextField maxLength={160} onChange={(event) => update('title', event.target.value)} required value={form.title} />
        </FormField>
        <FormField label="Category">
          <SelectField onChange={(event) => update('category', event.target.value)} value={form.category}>
            {PLAN_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </SelectField>
        </FormField>
        <FormField label="Status">
          <SelectField onChange={(event) => update('status', event.target.value)} value={form.status}>
            {PLAN_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </SelectField>
        </FormField>
        <FormField label="Target date">
          <TextField onChange={(event) => update('targetDate', event.target.value)} type="date" value={form.targetDate} />
        </FormField>
        <FormField className="lg:col-span-2" label="Notes">
          <TextAreaField maxLength={1200} onChange={(event) => update('notes', event.target.value)} rows={5} value={form.notes} />
        </FormField>
      </div>
      <div className="mt-6 flex justify-end">
        <PrimaryButton loading={saving} type="submit">{saving ? 'Saving plan' : 'Save plan'}</PrimaryButton>
      </div>
    </Surface>
  )
}

function PlanCard({ onConvert, onEdit, onStatus, plan, saving }) {
  return (
    <article className={`cb-plan-row cb-plan-card-${plan.status}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3>{plan.title}</h3>
          <p>{plan.category}{plan.targetDate ? ` / ${plan.targetDate}` : ''}</p>
        </div>
        <ContextMenu
          label={`Actions for ${plan.title}`}
          items={[
            { label: 'Edit plan', onSelect: () => onEdit(plan) },
            ...(plan.status !== 'completed' ? [{ label: 'Mark completed', onSelect: () => onStatus(plan, 'completed') }] : []),
            ...(plan.status === 'completed' && !plan.convertedMemoryId ? [{ label: 'Turn into memory', onSelect: () => onConvert(plan) }] : []),
          ]}
        />
      </div>

      {plan.notes ? <p className="cb-plan-note">{plan.notes}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={planTone(plan.status)}>{statusLabel(plan.status)}</StatusBadge>
        <SecondaryButton onClick={() => onEdit(plan)}>Edit</SecondaryButton>
        {plan.status !== 'completed' ? <PrimaryButton disabled={saving} onClick={() => onStatus(plan, 'completed')}><CheckCircle2 className="size-4" />Complete</PrimaryButton> : null}
        {plan.status === 'completed' && !plan.convertedMemoryId ? <PrimaryButton disabled={saving} onClick={() => onConvert(plan)}>Turn into memory</PrimaryButton> : null}
        {plan.convertedMemoryId ? <StatusBadge tone="success">Memory created</StatusBadge> : null}
      </div>
    </article>
  )
}

function PlansSummary({ counts, setStatus, status }) {
  const items = [
    { key: 'all', label: 'All', value: counts.total },
    { key: 'idea', label: 'Ideas', value: counts.ideas },
    { key: 'planned', label: 'Planned', value: counts.planned },
    { key: 'completed', label: 'Completed', value: counts.completed },
  ]

  return (
    <div className="cb-plans-summary">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => setStatus(item.key)}
          className={status === item.key ? 'is-active' : ''}
        >
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </button>
      ))}
    </div>
  )
}

export function PlansView({ model, onRefresh, search, setSearch, setStatus, status }) {
  const writer = useOwnerWrite(onRefresh)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [feedback, setFeedback] = useState({ kind: '', message: '', saving: false })
  const [convertCandidate, setConvertCandidate] = useState(null)

  const statusOptions = useMemo(
    () => STATUS_FILTERS.map((option) => ({ value: option, label: option === 'all' ? 'All' : statusLabel(option) })),
    [],
  )

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

  async function convertPlan() {
    if (!convertCandidate) return
    setFeedback({ kind: '', message: '', saving: true })
    try {
      await writer.convertPlanToMemory(convertCandidate.id, { ...convertCandidate, completedDate: convertCandidate.targetDate || today() })
      setFeedback({ kind: 'success', message: 'Plan became a memory.', saving: false })
      setConvertCandidate(null)
    } catch (error) {
      setFeedback({ kind: 'error', message: error?.message || 'Plan could not become a memory.', saving: false })
    }
  }

  if (model.status === 'loading') {
    return (
      <section className="cb-plans-redesign" data-route="plans">
        <div className="cb-plans-header"><h2>Plans</h2><p>Loading...</p></div>
        <LoadingSkeleton className="h-14" />
        <LoadingSkeleton className="h-24" />
      </section>
    )
  }

  if (model.status === 'invalid' || model.status === 'unavailable') {
    return <ErrorState title="Plans could not be loaded" message="The Plans view is not available right now." onRetry={onRefresh} />
  }

  return (
    <section className="cb-plans-redesign" data-route="plans">
      <div className="cb-plans-header">
        <div>
          <h2>Plans</h2>
          <p>{model.counts.total} saved</p>
        </div>
        <PrimaryButton onClick={() => { setEditing(null); setShowForm(true) }}><Sparkles className="size-4" />Add Plan</PrimaryButton>
      </div>

      {feedback.message ? <InlineAlert description={feedback.message} tone={feedback.kind === 'error' ? 'error' : 'success'} /> : null}

      <PlansSummary counts={model.counts} setStatus={setStatus} status={status} />

      <Surface className="cb-plans-toolbar">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <SearchField label="Search plans" onChange={(event) => setSearch(event.target.value)} placeholder="Search ideas, places, notes" value={search} />
          <SegmentedControl label="Status filter" onChange={setStatus} options={statusOptions} value={status} />
        </div>
      </Surface>

      {showForm ? (
        <PlanForm
          initialPlan={editing}
          onCancel={() => { setEditing(null); setShowForm(false) }}
          onSave={savePlan}
          saving={feedback.saving}
        />
      ) : null}

      {model.filtered.length ? (
        <div className="cb-plans-list">
          {model.filtered.map((plan) => (
            <PlanCard
              key={plan.id}
              onConvert={(selectedPlan) => setConvertCandidate(selectedPlan)}
              onEdit={(selected) => { setEditing(selected); setShowForm(true) }}
              onStatus={updateStatus}
              plan={plan}
              saving={feedback.saving}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title={model.emptyState.title}
          description={model.emptyState.description}
          onCreate={() => { setEditing(null); setShowForm(true) }}
          createLabel="Add the first plan"
        />
      )}

      <ConfirmDialog
        confirmLabel="Turn into memory"
        message="This will create one memory from the completed plan and prevent duplicate conversions."
        onCancel={() => setConvertCandidate(null)}
        onConfirm={convertPlan}
        open={Boolean(convertCandidate)}
        pending={feedback.saving}
        recordName={convertCandidate?.title}
        title="Turn this plan into a memory?"
      />
    </section>
  )
}
