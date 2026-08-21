import { AlertTriangle, RefreshCw } from 'lucide-react'

export function ErrorState({ title = 'This page could not be loaded', message, onRetry, action }) {
  return (
    <div className="rounded-[24px] border border-[#f0c6d5] bg-[#fff4f7] p-8 text-center" role="alert">
      <AlertTriangle className="mx-auto size-7 text-[#a3264c]" />
      <h3 className="mt-4 font-serif text-xl text-[#5f2037]">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-[#8d566c]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#a3264c] px-4 py-2.5 text-xs font-bold text-white"
        >
          <RefreshCw className="size-3.5" /> Retry
        </button>
      ) : null}
      {action || null}
    </div>
  )
}
