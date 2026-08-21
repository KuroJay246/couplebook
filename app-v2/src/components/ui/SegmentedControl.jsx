import { cn } from './classNames.js'

export function SegmentedControl({ label, options, value, onChange, className = '' }) {
  return (
    <div className={cn('grid gap-2', className)}>
      {label ? <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#806572]">{label}</span> : null}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-[#ead7df] bg-white p-2" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-10 rounded-xl px-4 text-xs font-bold transition',
              value === option.value ? 'bg-[#24131d] text-white' : 'text-[#6b5460] hover:bg-[#fff5f8]',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
