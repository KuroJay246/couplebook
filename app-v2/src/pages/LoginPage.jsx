import { useState } from 'react'
import { Heart, LockKeyhole, Sparkles } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { BrandMark } from '../components/BrandMark.jsx'
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
      setSubmitError(error?.message || 'Unable to complete sign-in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff9fb_0%,#fdf4f8_100%)] px-4 py-6 sm:px-6 lg:px-10">
      <main className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
        <section className="rounded-[28px] bg-[#24131d] p-8 text-white shadow-[0_24px_80px_rgba(36,19,29,0.18)] sm:p-10">
          <BrandMark />
          <div className="mt-10 max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f4d8e6]">
              Private entry
            </span>
            <h1 className="mt-5 font-serif text-5xl leading-[0.95] text-white">Open the book kept between the two of you.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/72">
              Couple Book opens only after Firebase sign-in and approved-user verification. The protected archive stays separate from public web routes while this V1.2 rebuild moves onto the Event Hub system foundation.
            </p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <LockKeyhole className="size-5 text-[#f4d8e6]" />
              <p className="mt-3 text-sm font-semibold">Approved users only</p>
              <p className="mt-1 text-xs leading-5 text-white/65">No guest access, no public sign-up, no static bypass.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Heart className="size-5 text-[#f4d8e6]" />
              <p className="mt-3 text-sm font-semibold">Two-person scope</p>
              <p className="mt-1 text-xs leading-5 text-white/65">Couple-scoped records stay private and route-guarded.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Sparkles className="size-5 text-[#f4d8e6]" />
              <p className="mt-3 text-sm font-semibold">Rebuilt shell</p>
              <p className="mt-1 text-xs leading-5 text-white/65">The app shell is being ported without touching production.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#ead7df] bg-white p-8 shadow-[0_16px_48px_rgba(84,53,67,0.08)] sm:p-10">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Approved accounts only</span>
          <h2 className="mt-3 font-serif text-4xl text-[#24131d]">Sign in with your Couple Book email</h2>
          <p className="mt-3 text-sm leading-7 text-[#7a6170]">
            Approval still depends on a targeted <code>users/{'{uid}'}</code> lookup after Firebase Auth succeeds.
          </p>

          <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#6f5462]">Email</span>
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="approved-account@example.com"
                type="email"
                value={email}
                className="min-h-12 rounded-xl border border-[#dcc2cd] bg-[#fffdfd] px-4 text-sm text-[#24131d] outline-none transition focus:border-[#a05c77] focus:ring-4 focus:ring-[#a05c77]/10"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#6f5462]">Password</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                type="password"
                value={password}
                className="min-h-12 rounded-xl border border-[#dcc2cd] bg-[#fffdfd] px-4 text-sm text-[#24131d] outline-none transition focus:border-[#a05c77] focus:ring-4 focus:ring-[#a05c77]/10"
              />
            </label>

            <button
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#8f5168] px-5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(143,81,104,0.24)] disabled:opacity-50"
              disabled={!isConfigured || loading || submitting}
              type="submit"
            >
              {submitting || loading ? 'Verifying private access...' : 'Enter Couple Book'}
            </button>
          </form>

          {(submitError || authError) ? (
            <p aria-live="polite" className="mt-4 text-sm text-[#a3264c]">
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
