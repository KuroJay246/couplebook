import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { useAuth } from '../auth/useAuth'
import { getRequestedReturnPath } from '../utils/navigation'

export function LoginPage() {
  const { authError, authInitialized, isAuthorized, isConfigured, loading, signIn, signOut, user } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading && !authInitialized) {
    return (
      <div className="shell-root">
        <main className="shell-main shell-main-center">
          <LoadingState
            title="Restoring Couple Book"
            description="Checking Firebase auth and the approved-user record before the shell opens."
          />
        </main>
      </div>
    )
  }

  if (user && isAuthorized) {
    return <Navigate replace to={getRequestedReturnPath(location.state)} />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')
    setSubmitting(true)

    try {
      await signIn(email, password)
    } catch (error) {
      setSubmitError(error?.message || 'Unable to complete sign-in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="shell-root">
      <main className="shell-main shell-main-center">
        <section className="hero-card">
          <span className="eyebrow">Private Entry</span>
          <h1>Couple Book v2 private sign-in</h1>
          <p>
            This routed shell already protects direct navigation. The next phases will connect legacy reads,
            page migrations, and couple-safe Firestore services without touching the live static app.
          </p>
        </section>

        <section className="login-card">
          <div className="login-card-copy">
            <span className="eyebrow">Approved accounts only</span>
            <h2>Sign in with your Couple Book email</h2>
            <p>
              No public signup, no guest route, and no localStorage-only shortcut. Approval still comes from a
              targeted <code>users/{'{uid}'}</code> lookup after Firebase Auth succeeds.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="approved-account@example.com"
                type="email"
                value={email}
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                type="password"
                value={password}
              />
            </label>

            <button className="button button-primary" disabled={!isConfigured || loading || submitting} type="submit">
              {submitting || loading ? 'Verifying private access...' : 'Sign in'}
            </button>
          </form>

          {(submitError || authError) && (
            <p aria-live="polite" className="form-error">
              {submitError || authError}
            </p>
          )}
        </section>

        {user && !isAuthorized && authInitialized && (
          <ErrorState
            actionLabel="Sign out"
            description={authError || 'This signed-in account is not approved for Couple Book.'}
            onAction={() => signOut()}
            title="Access denied"
          />
        )}

        {!isConfigured && (
          <ErrorState
            description={authError || 'Add environment values in app-v2 before enabling sign-in.'}
            title="Firebase configuration is incomplete"
          />
        )}
      </main>
    </div>
  )
}
