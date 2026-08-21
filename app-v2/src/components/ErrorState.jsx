import { ErrorState as SharedErrorState } from './ui/ErrorState.jsx'

export function ErrorState({
  title = 'Something needs attention',
  description = 'This part of the protected shell is not ready yet.',
  actionLabel = '',
  onAction = null,
  children = null,
}) {
  return (
    <SharedErrorState
      title={title}
      message={description}
      action={actionLabel && typeof onAction === 'function' ? (
        <div className="mt-5">
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dcc2cd] px-4 text-xs font-bold text-[#6f5160] hover:bg-[#fff5f8]"
            onClick={onAction}
            type="button"
          >
            {actionLabel}
          </button>
        </div>
      ) : children}
    />
  )
}
