import { startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import { auth } from '../lib/firebaseClient'
import { getBrowserTestAuthState } from '../lib/browserTestMode'
import { isFirebaseConfigured, missingFirebaseConfigMessage } from '../lib/firebaseConfig'
import { ensureAuthPersistence, observeAuthState, signInWithEmail, signOutCurrentUser } from '../services/authService'
import { resolveApprovedUser } from '../services/authorizationService'
import { AuthContext } from './AuthContext'

const UNAPPROVED_ACCOUNT_MESSAGE = 'This account is not approved for Couple Book.'
const PENDING_ACCOUNT_MESSAGE = 'This private book has not been opened for this account yet.'

function getAuthorizationMessage(status) {
  if (status === 'pending') return PENDING_ACCOUNT_MESSAGE
  return UNAPPROVED_ACCOUNT_MESSAGE
}

function applySignedOutState(setters) {
  startTransition(() => {
    setters.setUser(null)
    setters.setApprovedUser(null)
    setters.setIsAuthorized(false)
    setters.setAuthError('')
    setters.setAuthInitialized(true)
    setters.setLoading(false)
  })
}

export function AuthProvider({ children }) {
  const [browserTestAuth] = useState(() => getBrowserTestAuthState())
  const isBrowserTestMode = browserTestAuth !== null
  const [user, setUser] = useState(browserTestAuth?.user || null)
  const [approvedUser, setApprovedUser] = useState(browserTestAuth?.approvedUser || null)
  const [isAuthorized, setIsAuthorized] = useState(browserTestAuth?.isAuthorized || false)
  const [loading, setLoading] = useState(isBrowserTestMode ? false : isFirebaseConfigured)
  const [authInitialized, setAuthInitialized] = useState(isBrowserTestMode || !isFirebaseConfigured)
  const [authError, setAuthError] = useState(browserTestAuth?.authError || (isFirebaseConfigured ? '' : missingFirebaseConfigMessage))

  useEffect(() => {
    if (isBrowserTestMode) return undefined
    if (!isFirebaseConfigured) return undefined

    let active = true
    let unsubscribe = () => {}

    const setters = {
      setUser,
      setApprovedUser,
      setIsAuthorized,
      setAuthError,
      setAuthInitialized,
      setLoading,
    }

    async function hydrateAuthorizedUser(nextUser) {
      if (!active) return

      if (!nextUser) {
        applySignedOutState(setters)
        return
      }

      setLoading(true)

      try {
        const resolution = await resolveApprovedUser(nextUser)
        if (!active) return

        startTransition(() => {
          setUser(nextUser)

          if (resolution.status === 'authorized') {
            setApprovedUser(resolution.approvedUser)
            setIsAuthorized(true)
            setAuthError('')
          } else {
            setApprovedUser(null)
            setIsAuthorized(false)
            setAuthError(getAuthorizationMessage(resolution.status))
          }

          setAuthInitialized(true)
          setLoading(false)
        })
      } catch (error) {
        if (!active) return

        startTransition(() => {
          setUser(nextUser)
          setApprovedUser(null)
          setIsAuthorized(false)
          setAuthError(error?.message || 'Couple Book could not verify this account.')
          setAuthInitialized(true)
          setLoading(false)
        })
      }
    }

    async function initializeAuth() {
      try {
        await ensureAuthPersistence()
        if (!active) return

        unsubscribe = observeAuthState(
          (nextUser) => {
            void hydrateAuthorizedUser(nextUser)
          },
          (error) => {
            if (!active) return

            startTransition(() => {
              setUser(null)
              setApprovedUser(null)
              setIsAuthorized(false)
              setAuthError(error?.message || 'Couple Book auth monitoring failed.')
              setAuthInitialized(true)
              setLoading(false)
            })
          },
        )

        if (typeof auth?.authStateReady === 'function') {
          await auth.authStateReady()
        }

        if (!active || auth?.currentUser) return
        applySignedOutState(setters)
      } catch (error) {
        if (!active) return

        startTransition(() => {
          setUser(null)
          setApprovedUser(null)
          setIsAuthorized(false)
          setAuthError(error?.message || 'Couple Book could not initialize Firebase auth.')
          setAuthInitialized(true)
          setLoading(false)
        })
      }
    }

    void initializeAuth()

    return () => {
      active = false
      unsubscribe()
    }
  }, [isBrowserTestMode])

  const signIn = useCallback(async (email, password) => {
    if (isBrowserTestMode) {
      throw new Error('Browser regression auth is injected locally and cannot be edited from the sign-in form.')
    }

    setAuthError('')
    setLoading(true)

    try {
      const result = await signInWithEmail(email, password)
      const resolution = await resolveApprovedUser(result.user)

      startTransition(() => {
        setUser(result.user)

        if (resolution.status === 'authorized') {
          setApprovedUser(resolution.approvedUser)
          setIsAuthorized(true)
          setAuthError('')
        } else {
          setApprovedUser(null)
          setIsAuthorized(false)
          setAuthError(getAuthorizationMessage(resolution.status))
        }

        setAuthInitialized(true)
        setLoading(false)
      })

      return result
    } catch (error) {
      startTransition(() => {
        setUser(null)
        setApprovedUser(null)
        setIsAuthorized(false)
        setAuthError(error?.message || 'Unable to complete sign-in.')
        setAuthInitialized(true)
        setLoading(false)
      })
      throw error
    }
  }, [isBrowserTestMode])

  const signOut = useCallback(async () => {
    if (isBrowserTestMode) {
      applySignedOutState({
        setUser,
        setApprovedUser,
        setIsAuthorized,
        setAuthError,
        setAuthInitialized,
        setLoading,
      })
      return
    }

    setLoading(true)

    try {
      await signOutCurrentUser()
    } finally {
      applySignedOutState({
        setUser,
        setApprovedUser,
        setIsAuthorized,
        setAuthError,
        setAuthInitialized,
        setLoading,
      })
    }
  }, [isBrowserTestMode])

  const value = useMemo(
    () => ({
      user,
      approvedUser,
      isAuthorized,
      loading,
      authInitialized,
      isConfigured: isBrowserTestMode || isFirebaseConfigured,
      authError,
      signIn,
      signOut,
    }),
    [approvedUser, authError, authInitialized, isAuthorized, isBrowserTestMode, loading, signIn, signOut, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
