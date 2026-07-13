import { startTransition, useEffect, useState } from 'react'
import { auth } from '../lib/firebaseClient'
import { isFirebaseConfigured, missingFirebaseConfigMessage } from '../lib/firebaseConfig'
import { ensureAuthPersistence, observeAuthState, signInWithEmail, signOutCurrentUser } from '../services/authService'
import { resolveApprovedUser } from '../services/authorizationService'
import { AuthContext } from './AuthContext'

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
  const [user, setUser] = useState(null)
  const [approvedUser, setApprovedUser] = useState(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(isFirebaseConfigured)
  const [authInitialized, setAuthInitialized] = useState(!isFirebaseConfigured)
  const [authError, setAuthError] = useState(isFirebaseConfigured ? '' : missingFirebaseConfigMessage)

  useEffect(() => {
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
            setAuthError('This account is not approved for Couple Book.')
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
  }, [])

  async function signIn(email, password) {
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
          setAuthError('This account is not approved for Couple Book.')
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
  }

  async function signOut() {
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
  }

  const value = {
    user,
    approvedUser,
    isAuthorized,
    loading,
    authInitialized,
    isConfigured: isFirebaseConfigured,
    authError,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
