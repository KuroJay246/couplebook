import { Search } from 'lucide-react'

export function SearchField({ label = 'Search', value, onChange, placeholder, className = '', ...props }) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="cb-kicker">{label}</span>
      <span className="cb-input-surface flex items-center gap-3 px-3">
        <Search className="size-4" style={{ color: 'var(--cb-accent)' }} aria-hidden="true" />
        <input
          {...props}
          className="min-h-11 w-full border-0 bg-transparent px-0 text-sm outline-none"
          style={{ color: 'var(--cb-text)' }}
          onChange={onChange}
          placeholder={placeholder}
          type="search"
          value={value}
        />
      </span>
    </label>
  )
}
