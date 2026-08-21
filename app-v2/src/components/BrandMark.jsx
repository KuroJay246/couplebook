import { Heart } from 'lucide-react'

export function BrandMark({ compact = false }) {
  return (
    <div className={`cb-brand-mark ${compact ? 'cb-brand-mark-compact' : ''}`}>
      <span className="cb-brand-seal" aria-hidden="true">
        <Heart className="size-4" strokeWidth={1.9} />
      </span>
      <span className={compact ? 'sr-only' : 'cb-brand-copy'}>
        <span className="cb-brand-title">Couple Book</span>
        <span className="cb-brand-subtitle">Private memory archive</span>
      </span>
    </div>
  )
}
