import { cn } from './classNames.js'

export function PageHeader({
  eyebrow,
  title,
  description,
  meta = null,
  actions = null,
  className = '',
}) {
  return (
    <header className={cn('flex flex-col gap-4 border-b border-[#ead7df] pb-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8f5168]">{eyebrow}</p> : null}
        <h2 className="mt-1 break-words font-serif text-3xl text-[#24131d] sm:text-4xl">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7a6170]">{description}</p> : null}
        {meta}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
    </header>
  )
}
