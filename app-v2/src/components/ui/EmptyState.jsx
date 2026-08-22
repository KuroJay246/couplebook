import { NotebookPen } from 'lucide-react'

export function EmptyState({
  icon: Icon = NotebookPen,
  title = 'Nothing is here yet',
  description = 'Start with the next memory, date, or note to bring this page to life.',
  action,
  onCreate,
  createLabel = 'Create the first one',
}) {
  return (
    <div className="cb-ghost-card px-6 py-16 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl" style={{ background: 'var(--cb-accent-soft)', color: 'var(--cb-accent)' }}>
        <Icon className="size-7" strokeWidth={1.6} />
      </span>
      <h3 className="cb-page-title mt-5 text-2xl">{title}</h3>
      <p className="cb-body-copy mx-auto mt-2 max-w-md text-sm">{description}</p>
      {action}
      {!action && onCreate ? (
        <button
          type="button"
          onClick={onCreate}
          className="cb-button cb-button-primary cb-motion-standard mt-6 rounded-xl px-5 py-3 text-xs font-bold"
        >
          {createLabel}
        </button>
      ) : null}
    </div>
  )
}
