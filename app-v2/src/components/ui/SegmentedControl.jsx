import { cn } from './classNames.js'

export function SegmentedControl({ label, options, value, onChange, className = '' }) {
  return (
    <div className={cn('grid gap-2', className)}>
      {label ? <span className="cb-kicker">{label}</span> : null}
      <div className="cb-card flex flex-wrap gap-2 p-2" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'cb-motion-standard min-h-10 rounded-xl px-4 text-xs font-bold',
              value === option.value ? 'cb-segment-active' : 'cb-segment',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
