function SymbolSvg({ className = '', title = 'Couple Book mark' }) {
  return (
    <svg
      aria-hidden={title ? undefined : 'true'}
      className={className}
      fill="none"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M13.5 11.5C13.5 9.84315 14.8431 8.5 16.5 8.5H24V35.5H17.5C15.2909 35.5 13.5 33.7091 13.5 31.5V11.5Z"
        fill="currentColor"
        fillOpacity="0.92"
      />
      <path
        d="M34.5 11.5C34.5 9.84315 33.1569 8.5 31.5 8.5H24V35.5H30.5C32.7091 35.5 34.5 33.7091 34.5 31.5V11.5Z"
        fill="currentColor"
        fillOpacity="0.62"
      />
      <path
        d="M24 13.5C21.75 11.7 19.55 10.8 17.4 10.8C14.7 10.8 13 12.4 13 14.9V31.6C13 33.9 14.8 35.8 17.1 35.8H24"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <path
        d="M24 13.5C26.25 11.7 28.45 10.8 30.6 10.8C33.3 10.8 35 12.4 35 14.9V31.6C35 33.9 33.2 35.8 30.9 35.8H24"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  )
}

export function BrandWordmark({ compact = false }) {
  return (
    <span className={compact ? 'sr-only' : 'cb-brand-copy'}>
      <span className="cb-brand-title">Couple Book</span>
      <span className="cb-brand-subtitle">Private shared journal</span>
    </span>
  )
}

export function BrandMark({ compact = false }) {
  return (
    <div className={`cb-brand-mark ${compact ? 'cb-brand-mark-compact' : ''}`}>
      <span className="cb-brand-symbol" aria-hidden="true">
        <SymbolSvg className="size-6" title="" />
      </span>
      <BrandWordmark compact={compact} />
    </div>
  )
}
