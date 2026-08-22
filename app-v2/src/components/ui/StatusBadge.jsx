export function StatusBadge({ tone = 'default', children }) {
  const toneClass = {
    default: 'cb-status-badge-default',
    success: 'cb-status-badge-success',
    warning: 'cb-status-badge-warning',
    error: 'cb-status-badge-error',
    info: 'cb-status-badge-info',
  }[tone] || 'cb-status-badge-default'

  return (
    <span className={`cb-status-badge inline-flex min-h-7 items-center rounded-full px-3 text-[10px] font-bold uppercase tracking-[0.12em] ${toneClass}`}>
      {children}
    </span>
  )
}
