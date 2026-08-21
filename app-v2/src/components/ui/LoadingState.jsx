export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-[24px] border border-[#ead7df] bg-white" role="status">
      <div className="flex flex-col items-center gap-4">
        <span className="size-8 animate-spin rounded-full border-[3px] border-[#f1dde7] border-t-[#8f5168]" />
        <p className="text-xs font-semibold text-[#7a6170]">{message}</p>
      </div>
    </div>
  )
}
