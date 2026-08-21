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
    <div className="rounded-[24px] border border-dashed border-[#dcc2cd] bg-white px-6 py-16 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#fceef3] text-[#8f5168]">
        <Icon className="size-7" strokeWidth={1.6} />
      </span>
      <h3 className="mt-5 font-serif text-2xl text-[#24131d]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7a6170]">{description}</p>
      {action}
      {!action && onCreate ? (
        <button
          type="button"
          onClick={onCreate}
          className="mt-6 rounded-xl bg-[#8f5168] px-5 py-3 text-xs font-bold text-white"
        >
          {createLabel}
        </button>
      ) : null}
    </div>
  )
}
