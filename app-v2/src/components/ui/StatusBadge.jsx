export function StatusBadge({ tone = 'default', children }) {
  const toneClass = {
    default: 'bg-[#f6eef2] text-[#6f5160]',
    success: 'bg-[#ecf7f0] text-[#235238]',
    warning: 'bg-[#fff4df] text-[#7a5818]',
    error: 'bg-[#fff1f4] text-[#a3264c]',
    info: 'bg-[#f7f0ff] text-[#5c4677]',
  }[tone] || 'bg-[#f6eef2] text-[#6f5160]'

  return (
    <span className={`inline-flex min-h-7 items-center rounded-full px-3 text-[10px] font-bold uppercase tracking-[0.12em] ${toneClass}`}>
      {children}
    </span>
  )
}
