import { ChevronRight } from 'lucide-react'
import { cn } from './classNames.js'

export function ListItem({
  title,
  description,
  meta = null,
  action = null,
  href = null,
  onClick,
  className = '',
  chevron = false,
}) {
  const Tag = href ? 'a' : 'button'
  return (
    <Tag
      className={cn(
        'flex w-full items-start justify-between gap-3 rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4 text-left transition hover:bg-white',
        className,
      )}
      href={href || undefined}
      onClick={onClick}
      type={href ? undefined : 'button'}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#2B1723]">{title}</p>
        {description ? <p className="mt-1 text-sm leading-6 text-[#6B564C]">{description}</p> : null}
        {meta}
      </div>
      <div className="flex items-center gap-2">
        {action}
        {chevron ? <ChevronRight className="mt-1 size-4 shrink-0 text-[#80685B]" aria-hidden="true" /> : null}
      </div>
    </Tag>
  )
}
