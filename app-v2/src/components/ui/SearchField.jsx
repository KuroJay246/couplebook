import { Search } from 'lucide-react'

export function SearchField({ label = 'Search', value, onChange, placeholder, className = '', ...props }) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#806572]">{label}</span>
      <span className="flex min-h-11 items-center gap-3 rounded-xl border border-[#dcc2cd] bg-white px-3">
        <Search className="size-4 text-[#8f5168]" aria-hidden="true" />
        <input
          {...props}
          className="min-h-11 w-full border-0 bg-transparent px-0 text-sm text-[#24131d] outline-none"
          onChange={onChange}
          placeholder={placeholder}
          type="search"
          value={value}
        />
      </span>
    </label>
  )
}
