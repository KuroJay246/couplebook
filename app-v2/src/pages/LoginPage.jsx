import { useAuth } from '../auth/useAuth'
import { ErrorState } from '../components/ErrorState'

export function LoginPage() {
  const { authError, isConfigured } = useAuth()

  return (
    <div className="shell-root">
      <main className="shell-main shell-main-center">
        <section className="hero-card">
          <span className="eyebrow">Private Entry</span>
          <h1>Couple Book v2 foundation</h1>
          <p>
            The routed auth shell lands in the next commit. This foundation already reads environment-based
            Firebase settings and stays isolated from the live static app.
          </p>
        </section>

        {!isConfigured && (
          <ErrorState
            title="Firebase configuration is incomplete"
            description={authError || 'Add environment values in app-v2 before enabling sign-in.'}
          />
        )}
      </main>
    </div>
  )
}
