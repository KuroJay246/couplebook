import { useState } from 'react'
import { Heart, LockKeyhole, Sparkles } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { BrandMark } from '../components/BrandMark.jsx'
import { useAuth } from '../auth/useAuth'
import { getRequestedReturnPath } from '../utils/navigation'
import { toAuthError } from '../services/userFacingError.js'

export function LoginPage() {
  const { authError, authInitialized, isAuthorized, isConfigured, loading, signIn, signOut, user } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading && !authInitialized) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-10">
        <main className="mx-auto max-w-3xl">
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
      setSubmitError(toAuthError(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <main className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
        <section className="cb-page-frame flex flex-col justify-between p-8 sm:p-10">
          <div>
            <BrandMark />
            <div className="mt-12 max-w-2xl">
              <span className="cb-shell-meta-pill">Private entry</span>
              <h1 className="cb-page-title mt-5 text-5xl leading-[0.95]">
                Open the shared journal kept between the two of you.
              </h1>
              <p className="cb-body-copy mt-5 max-w-xl text-sm">
                Couple Book opens only after Firebase sign-in and approved-user verification. The archive stays protected while the rebuilt shell keeps the product feeling calm, personal, and readable.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <div className="cb-card p-4">
              <LockKeyhole className="size-5" style={{ color: 'var(--cb-accent)' }} />
              <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>Approved users only</p>
              <p className="cb-body-copy mt-1 text-xs">No guest access, no public sign-up, and no static bypass.</p>
            </div>
            <div className="cb-card p-4">
              <Heart className="size-5" style={{ color: 'var(--cb-accent)' }} />
              <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>Two-person scope</p>
              <p className="cb-body-copy mt-1 text-xs">Couple-scoped records stay private and route-guarded.</p>
            </div>
            <div className="cb-card p-4">
              <Sparkles className="size-5" style={{ color: 'var(--cb-accent)' }} />
              <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>Theme-aware shell</p>
              <p className="cb-body-copy mt-1 text-xs">Your saved personal appearance restores when your account loads.</p>
            </div>
          </div>
        </section>

        <section className="cb-surface p-8 sm:p-10">
          <span className="cb-kicker">Approved accounts only</span>
          <h2 className="cb-page-title mt-3 text-4xl">Sign in with your Couple Book email</h2>
          <p className="cb-body-copy mt-3 text-sm">
            Approval still depends on a targeted <code>users/{'{uid}'}</code> lookup after Firebase Auth succeeds.
          </p>

          <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
            <label className="grid gap-2">
              <span className="cb-field-label">Email</span>
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="approved-account@example.com"
                type="email"
                value={email}
                className="cb-input-surface px-4 text-sm"
              />
            </label>

            <label className="grid gap-2">
              <span className="cb-field-label">Password</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                type="password"
                value={password}
                className="cb-input-surface px-4 text-sm"
              />
            </label>

            <button
              className="cb-button cb-button-primary inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-bold disabled:opacity-50"
              disabled={!isConfigured || loading || submitting}
              type="submit"
            >
              {submitting || loading ? 'Verifying private access...' : 'Enter Couple Book'}
            </button>
          </form>

          {(submitError || authError) ? (
            <p aria-live="polite" className="mt-4 text-sm" style={{ color: 'var(--cb-error-text)' }}>
              {submitError || authError}
            </p>
          ) : null}
        </section>

        {user && !isAuthorized && authInitialized ? (
          <ErrorState
            actionLabel="Sign out"
            description={authError || 'This signed-in account is not approved for Couple Book.'}
            onAction={() => signOut()}
            title="Access denied"
          />
        ) : null}

        {!isConfigured ? (
          <ErrorState
            description={authError || 'Add environment values in app-v2 before enabling sign-in.'}
            title="Firebase configuration is incomplete"
          />
        ) : null}
      </main>
    </div>
  )
}
