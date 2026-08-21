import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Sparkles } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { FormField, SelectField, TextAreaField, TextField } from '../../components/ui/FormField.jsx'
import { InlineAlert } from '../../components/ui/InlineAlert.jsx'
import { LoadingState } from '../../components/ui/LoadingState.jsx'
import { PageHeader } from '../../components/ui/PageHeader.jsx'
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
    <Surface as="form" onSubmit={submit}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">{form.id ? 'Edit plan' : 'New plan'}</p>
          <h3 className="mt-2 font-serif text-3xl text-[#24131d]">{form.id ? 'Update this plan' : 'Add a new plan'}</h3>
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
    <ContentCard className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <StatusBadge tone={planTone(plan.status)}>{statusLabel(plan.status)}</StatusBadge>
          <h3 className="mt-3 text-xl font-bold text-[#24131d]">{plan.title}</h3>
          <p className="mt-2 text-sm text-[#6B564C]">{plan.category}</p>
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#806572]">Target date</p>
          <p className="mt-2 text-sm font-semibold text-[#24131d]">{plan.targetDate || 'No date yet'}</p>
        </div>
        <div className="rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#806572]">Status</p>
          <p className="mt-2 text-sm font-semibold text-[#24131d]">{statusLabel(plan.status)}</p>
        </div>
      </div>

      {plan.notes ? <p className="text-sm leading-6 text-[#6B564C]">{plan.notes}</p> : <p className="text-sm leading-6 text-[#806572]">No extra notes yet.</p>}

      <div className="mt-auto flex flex-wrap gap-2">
        <SecondaryButton onClick={() => onEdit(plan)}>Edit</SecondaryButton>
        {plan.status !== 'completed' ? <PrimaryButton disabled={saving} onClick={() => onStatus(plan, 'completed')}><CheckCircle2 className="size-4" />Complete</PrimaryButton> : null}
        {plan.status === 'completed' && !plan.convertedMemoryId ? <PrimaryButton disabled={saving} onClick={() => onConvert(plan)}>Turn into memory</PrimaryButton> : null}
        {plan.convertedMemoryId ? <StatusBadge tone="success">Memory created</StatusBadge> : null}
      </div>
    </ContentCard>
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
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => setStatus(item.key)}
          className={`rounded-2xl border p-4 text-left transition ${status === item.key ? 'border-[#9A5260] bg-[#FCEEF1]' : 'border-[#EEDFD6] bg-white hover:bg-[#FFF8F2]'}`}
        >
          <p className="text-3xl font-bold text-[#24131d]">{item.value}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#80685B]">{item.label}</p>
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
    return <LoadingState message="Loading Plans..." />
  }

  if (model.status === 'invalid' || model.status === 'unavailable') {
    return <ErrorState title="Plans could not be loaded" message="The Plans view is not available right now." onRetry={onRefresh} />
  }

  return (
    <section className="space-y-5" data-route="plans">
      <PageHeader
        eyebrow="Our Plans"
        title="Ideas worth doing together."
        description="Keep date ideas, trips, goals, and little surprises in one private couple-scoped place."
        actions={(
          <>
            <StatusBadge tone="info">{model.counts.total} active</StatusBadge>
            <PrimaryButton onClick={() => { setEditing(null); setShowForm(true) }}><Sparkles className="size-4" />Add plan</PrimaryButton>
          </>
        )}
      />

      {feedback.message ? <InlineAlert description={feedback.message} tone={feedback.kind === 'error' ? 'error' : 'success'} /> : null}

      <PlansSummary counts={model.counts} setStatus={setStatus} status={status} />

      <Surface>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
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
