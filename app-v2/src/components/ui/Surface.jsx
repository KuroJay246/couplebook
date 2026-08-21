import { cn } from './classNames.js'

export function Surface({ as: Tag = 'section', children, className = '', tone = 'default', ...props }) {
  const toneClass = tone === 'soft' ? 'bg-[#fff8fb]' : 'bg-white'
  return (
    <Tag
      {...props}
      className={cn(
        'rounded-[24px] border border-[#ead7df] p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6',
        toneClass,
        className,
      )}
    >
      {children}
    </Tag>
  )
}

export function ContentCard({ as: Tag = 'article', children, className = '', ...props }) {
  return (
    <Tag
      {...props}
      className={cn('rounded-2xl border border-[#ead7df] bg-[#fffdfd] p-4', className)}
    >
      {children}
    </Tag>
  )
}
