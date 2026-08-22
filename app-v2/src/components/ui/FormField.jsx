import { cn } from './classNames.js'

export function FormField({ label, children, className = '' }) {
  return (
    <label className={cn('grid gap-2', className)}>
      <span className="cb-field-label text-xs">{label}</span>
      {children}
    </label>
  )
}

export function TextField(props) {
  return <input {...props} className={cn('cb-input-surface px-3 text-sm', props.className)} />
}

export function TextAreaField(props) {
  return <textarea {...props} className={cn('cb-input-surface w-full px-3 py-2 text-sm', props.className)} />
}

export function SelectField(props) {
  return <select {...props} className={cn('cb-input-surface px-3 text-sm', props.className)} />
}
