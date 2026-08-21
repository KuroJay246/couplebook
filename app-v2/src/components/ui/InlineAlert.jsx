import { AlertTriangle, CheckCircle2, Info, WifiOff } from 'lucide-react'

const TONE_CLASS = {
  info: 'border-[#ddd2f2] bg-[#f7f0ff] text-[#5c4677]',
  success: 'border-[#cfe8d8] bg-[#ecf7f0] text-[#235238]',
  warning: 'border-[#f1dec0] bg-[#fff4df] text-[#7a5818]',
  error: 'border-[#f0c6d5] bg-[#fff1f4] text-[#a3264c]',
  offline: 'border-[#d9dde4] bg-[#f4f6f9] text-[#41536a]',
}

const ICON_BY_TONE = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertTriangle,
  offline: WifiOff,
}

export function InlineAlert({ tone = 'info', title, description, action = null }) {
  const Icon = ICON_BY_TONE[tone] || Info

  return (
    <div className={`rounded-2xl border p-4 ${TONE_CLASS[tone] || TONE_CLASS.info}`} role={tone === 'error' ? 'alert' : 'status'}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          {title ? <p className="text-sm font-bold">{title}</p> : null}
          {description ? <p className="mt-1 text-sm leading-6">{description}</p> : null}
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  )
}
