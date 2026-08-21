import { cn } from './classNames.js'

export function FormField({ label, children, className = '' }) {
  return (
    <label className={cn('grid gap-2', className)}>
      <span className="text-xs font-bold text-[#5A443B]">{label}</span>
      {children}
    </label>
  )
}

export function TextField(props) {
  return <input {...props} className={cn('min-h-11 rounded-xl border border-[#E7D6CC] bg-white px-3 text-sm text-[#24131d] outline-none focus:border-[#9A5260] focus:ring-2 focus:ring-[#9A5260]/20', props.className)} />
}

export function TextAreaField(props) {
  return <textarea {...props} className={cn('w-full rounded-xl border border-[#E7D6CC] bg-white px-3 py-2 text-sm text-[#24131d] outline-none focus:border-[#9A5260] focus:ring-2 focus:ring-[#9A5260]/20', props.className)} />
}

export function SelectField(props) {
  return <select {...props} className={cn('min-h-11 rounded-xl border border-[#E7D6CC] bg-white px-3 text-sm text-[#24131d] outline-none focus:border-[#9A5260] focus:ring-2 focus:ring-[#9A5260]/20', props.className)} />
}
