import { cn } from './classNames.js'

export function FilterChip({ active = false, children, className = '', ...props }) {
  return (
    <button
      {...props}
      type="button"
      className={cn(
        'inline-flex min-h-10 items-center rounded-full px-4 text-xs font-bold transition',
        active ? 'bg-[#24131d] text-white' : 'border border-[#e5d7cf] bg-white text-[#80685B] hover:bg-[#fff8f2]',
        className,
      )}
    >
      {children}
    </button>
  )
}
