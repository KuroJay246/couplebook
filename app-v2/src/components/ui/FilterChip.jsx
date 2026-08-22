import { cn } from './classNames.js'

export function FilterChip({ active = false, children, className = '', ...props }) {
  return (
    <button
      {...props}
      type="button"
      className={cn(
        'cb-motion-standard inline-flex min-h-10 items-center rounded-full px-4 text-xs font-bold',
        active ? 'cb-chip-active' : 'cb-chip',
        className,
      )}
    >
      {children}
    </button>
  )
}
