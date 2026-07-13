import { ErrorState } from '../components/ErrorState'

export function NotFoundPage() {
  return (
    <div className="shell-root">
      <main className="shell-main shell-main-center">
        <ErrorState
          title="Route not found"
          description="This placeholder shell knows the migration structure, but this path is not part of the foundation."
        />
      </main>
    </div>
  )
}
