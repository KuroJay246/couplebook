import { cn } from './classNames.js'

export function Surface({ as: Tag = 'section', children, className = '', tone = 'default', ...props }) {
  const toneClass = tone === 'soft' ? 'cb-surface-soft' : ''
  return (
    <Tag
      {...props}
      className={cn(
        'cb-surface p-5 sm:p-6',
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
      className={cn('cb-card p-4', className)}
    >
      {children}
    </Tag>
  )
}
