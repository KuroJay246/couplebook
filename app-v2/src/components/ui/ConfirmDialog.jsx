import { useEffect, useId, useRef } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'

export function ConfirmDialog({
  open,
  title,
  recordName,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  pending = false,
  onCancel,
  onConfirm,
}) {
  const titleId = useId()
  const messageId = useId()
  const confirmRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    const timer = window.setTimeout(() => confirmRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !pending) onCancel?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (previousFocusRef.current instanceof HTMLElement) previousFocusRef.current.focus()
    }
  }, [onCancel, open, pending])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close confirmation"
        className="absolute inset-0 cursor-default bg-[#24131d]/40 backdrop-blur-sm"
        onClick={!pending ? onCancel : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="relative w-full max-w-md rounded-[24px] bg-white p-6 shadow-[0_24px_80px_rgba(36,19,29,0.18)] sm:p-8"
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#fceef3] text-[#a3264c]">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>
        <h2 id={titleId} className="mt-5 text-center font-serif text-2xl text-[#24131d]">{title}</h2>
        {recordName ? <p className="mt-2 break-words text-center text-base font-bold text-[#24131d]">{recordName}</p> : null}
        <p id={messageId} className="mt-3 text-center text-sm leading-6 text-[#816775]">{message}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#a3264c] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Working...
              </>
            ) : (
              <>
                <Trash2 className="size-4" aria-hidden="true" />
                {confirmLabel}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-[#5d4a52] hover:bg-[#f7f1f4] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
