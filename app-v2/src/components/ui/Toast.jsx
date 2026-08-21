import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'

const ICON_BY_TONE = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

const CLASS_BY_TONE = {
  success: 'border-[#cfe8d8] bg-white text-[#235238]',
  error: 'border-[#f0c6d5] bg-white text-[#a3264c]',
  info: 'border-[#ddd2f2] bg-white text-[#5c4677]',
}

export function Toast({ tone = 'info', title, description }) {
  const Icon = ICON_BY_TONE[tone] || Info
  return (
    <div className={`fixed bottom-24 right-4 z-40 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border p-4 shadow-[0_20px_60px_rgba(36,19,29,0.16)] ${CLASS_BY_TONE[tone] || CLASS_BY_TONE.info}`} role="status">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-bold">{title}</p>
          {description ? <p className="mt-1 text-sm leading-6">{description}</p> : null}
        </div>
      </div>
    </div>
  )
}
