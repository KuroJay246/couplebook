import { useState } from 'react'
import { Heart, KeyRound, LockKeyhole, Sparkles } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { BrandMark } from '../components/BrandMark.jsx'
import { useAuth } from '../auth/useAuth'
import { getRequestedReturnPath } from '../utils/navigation'
import { toAuthError } from '../services/userFacingError.js'

function LoginStoryPanel() {
  return (
    <section className="cb-page-frame flex flex-col justify-between p-8 sm:p-10">
      <div>
        <BrandMark />
        <div className="mt-12 max-w-2xl">
          <span className="cb-shell-meta-pill">Couple Book</span>
          <h1 className="cb-page-title mt-5 text-5xl leading-[0.95]">
            A private memory book for Omia and Jaylan.
          </h1>
          <p className="cb-body-copy mt-5 max-w-xl text-sm">
            Sign in with the approved Google account to open your shared story, photos, plans, and special moments.
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        <div className="cb-card p-4">
          <LockKeyhole className="size-5" style={{ color: 'var(--cb-accent)' }} />
          <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>Approved users only</p>
          <p className="cb-body-copy mt-1 text-xs">Only approved accounts can open this private book.</p>
        </div>
        <div className="cb-card p-4">
          <Heart className="size-5" style={{ color: 'var(--cb-accent)' }} />
          <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>Two-person scope</p>
          <p className="cb-body-copy mt-1 text-xs">Memories, plans, and special pages stay between Omia and Jaylan.</p>
        </div>
        <div className="cb-card p-4">
          <Sparkles className="size-5" style={{ color: 'var(--cb-accent)' }} />
          <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>Personal view</p>
          <p className="cb-body-copy mt-1 text-xs">Your saved appearance returns after sign-in.</p>
        </div>
      </div>
    </section>
  )
}

function EmailSignInForm({ disabled, email, onEmailChange, onPasswordChange, onSubmit, password, submitting }) {
  return (
    <form className="mt-5 grid gap-5" onSubmit={onSubmit}>
      <label className="grid gap-2">
        <span className="cb-field-label">Email</span>
        <input
          aria-label="Email"
          autoComplete="email"
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="approved-account@example.com"
          type="email"
          value={email}
          className="cb-input-surface px-4 text-sm"
        />
      </label>

      <label className="grid gap-2">
        <span className="cb-field-label">Password</span>
        <input
          aria-label="Password"
          autoComplete="current-password"
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="Enter your password"
          type="password"
          value={password}
          className="cb-input-surface px-4 text-sm"
        />
      </label>

      <button
        aria-label="Sign in with email"
        className="cb-button cb-button-secondary inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-bold disabled:opacity-50"
        disabled={disabled}
        type="submit"
      >
        {submitting ? 'Verifying private access...' : 'Sign in with email'}
      </button>
    </form>
  )
}

function LoginFormPanel({
  authError,
  canSubmit,
  email,
  googleSubmitting,
  loading,
  onEmailChange,
  onGoogleSignIn,
  onPasswordChange,
  onSubmit,
  onToggleOtherOptions,
  password,
  showOtherOptions,
  submitError,
  submitting,
}) {
  const disabled = !canSubmit || loading || submitting || googleSubmitting
  return (
    <section className="cb-surface p-8 sm:p-10">
      <span className="cb-kicker">Couple Book</span>
      <h2 className="cb-page-title mt-3 text-4xl">Continue with Google</h2>
      <p className="cb-body-copy mt-3 text-sm">
        Your private book opens only after the account is signed in and approved for this couple.
      </p>

      <button
        className="cb-button cb-button-primary mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold disabled:opacity-50"
        disabled={disabled}
        onClick={onGoogleSignIn}
        type="button"
      >
        <KeyRound className="size-4" aria-hidden="true" />
        {googleSubmitting || loading ? 'Opening Google...' : 'Continue with Google'}
      </button>

      <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: 'var(--cb-border)', background: 'var(--cb-surface)' }}>
        <button
          aria-expanded={showOtherOptions}
          className="min-h-10 w-full text-left text-sm font-bold"
          onClick={onToggleOtherOptions}
          style={{ color: 'var(--cb-text)' }}
          type="button"
        >
          Other sign-in options
        </button>
        {showOtherOptions ? (
          <EmailSignInForm
            disabled={disabled}
            email={email}
            onEmailChange={onEmailChange}
            onPasswordChange={onPasswordChange}
            onSubmit={onSubmit}
            password={password}
            submitting={submitting || loading}
          />
        ) : null}
      </div>

      {(submitError || authError) ? (
        <p aria-live="polite" className="mt-4 text-sm" style={{ color: 'var(--cb-error-text)' }}>
          {submitError || authError}
        </p>
      ) : null}
    </section>
  )
}

function LoginStatusMessages({ authError, authInitialized, isAuthorized, isConfigured, onSignOut, user }) {
  return (
    <>
      {user && !isAuthorized && authInitialized ? (
        <ErrorState
          actionLabel="Sign out"
          description={authError || 'This signed-in account is not approved for Couple Book.'}
          onAction={onSignOut}
          title="Access denied"
        />
      ) : null}

      {!isConfigured ? (
        <ErrorState
          description={authError || 'Add the local app environment values before enabling sign-in.'}
          title="Firebase configuration is incomplete"
        />
      ) : null}
    </>
  )
}

export function LoginPage() {
  const { authError, authInitialized, isAuthorized, isConfigured, loading, signIn, signInWithGoogle, signOut, user } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)
  const [showOtherOptions, setShowOtherOptions] = useState(false)

  if (loading && !authInitialized) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-10">
        <main className="mx-auto max-w-3xl">
          <LoadingState
            title="Restoring Couple Book"
            description="Checking your saved sign-in and private access before Couple Book opens."
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

  async function handleGoogleSignIn() {
    setSubmitError('')
    setGoogleSubmitting(true)

    try {
      await signInWithGoogle()
    } catch (error) {
      setSubmitError(toAuthError(error, 'Google sign-in could not open Couple Book. If this is your first time, sign in with email and link Google from Settings.'))
    } finally {
      setGoogleSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <main className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
        <LoginStoryPanel />
        <LoginFormPanel
          authError={authError}
          canSubmit={isConfigured}
          email={email}
          googleSubmitting={googleSubmitting}
          loading={loading}
          onEmailChange={setEmail}
          onGoogleSignIn={handleGoogleSignIn}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
          onToggleOtherOptions={() => setShowOtherOptions((isOpen) => !isOpen)}
          password={password}
          showOtherOptions={showOtherOptions}
          submitError={submitError}
          submitting={submitting}
        />
        <LoginStatusMessages
          authError={authError}
          authInitialized={authInitialized}
          isAuthorized={isAuthorized}
          isConfigured={isConfigured}
          onSignOut={() => signOut()}
          user={user}
        />
      </main>
    </div>
  )
}
