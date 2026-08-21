export function LoadingSkeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl bg-[#f6eef2] ${className}`} />
}
