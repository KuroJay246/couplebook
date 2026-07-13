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
        <section className="login-layout">
          <section className="hero-card login-hero">
            <div className="hero-bookplate">
              <span className="eyebrow">Private entry</span>
              <span className="folio-mark">Routed edition</span>
            </div>
            <h1>Open the book kept between the two of you.</h1>
            <p>
              This space opens only after Firebase sign-in and approved-user verification. The public web copy stays
              separate while the protected archive is rebuilt here, page by page.
            </p>
            <div className="login-hero-note">
              <strong>Couple Book</strong>
              <span>Quiet, shared, and intentionally private.</span>
            </div>
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
                {submitting || loading ? 'Verifying private access...' : 'Enter Couple Book'}
              </button>
            </form>

            {(submitError || authError) && (
              <p aria-live="polite" className="form-error">
                {submitError || authError}
              </p>
            )}
          </section>
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
