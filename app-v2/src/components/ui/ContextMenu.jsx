import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { IconButton } from './Button.jsx'

export function ContextMenu({ label = 'Open menu', items = [] }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function handlePointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    window.addEventListener('pointerdown', handlePointer)
    return () => window.removeEventListener('pointerdown', handlePointer)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <IconButton label={label} onClick={() => setOpen((value) => !value)}>
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </IconButton>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-44 rounded-2xl border border-[#ead7df] bg-white p-2 shadow-[0_24px_80px_rgba(36,19,29,0.18)]">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className="flex min-h-10 w-full items-center rounded-xl px-3 text-sm font-semibold text-[#5A443B] hover:bg-[#fff5f8]"
              onClick={() => {
                setOpen(false)
                item.onSelect?.()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
