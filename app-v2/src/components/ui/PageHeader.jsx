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
    <header className={cn('flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-end sm:justify-between', className)} style={{ borderColor: 'var(--cb-border)' }}>
      <div className="min-w-0">
        {eyebrow ? <p className="cb-kicker">{eyebrow}</p> : null}
        <h2 className="cb-page-title mt-1 break-words text-3xl sm:text-4xl">{title}</h2>
        {description ? <p className="cb-body-copy mt-2 max-w-3xl text-sm">{description}</p> : null}
        {meta}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
    </header>
  )
}
