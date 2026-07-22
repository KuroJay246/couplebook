import { startTransition, useCallback, useEffect, useMemo, useReducer, useState } from 'react'
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

function createInitialAuthState(browserTestAuth, isBrowserTestMode) {
  return {
    user: browserTestAuth?.user || null,
    approvedUser: browserTestAuth?.approvedUser || null,
    isAuthorized: browserTestAuth?.isAuthorized || false,
    loading: isBrowserTestMode ? false : isFirebaseConfigured,
    authInitialized: isBrowserTestMode || !isFirebaseConfigured,
    authError: browserTestAuth?.authError || (isFirebaseConfigured ? '' : missingFirebaseConfigMessage),
  }
}

function authReducer(state, action) {
  return { ...state, ...action.payload }
}

function transitionAuthState(dispatch, payload) {
  startTransition(() => {
    dispatch({ payload })
  })
}

function applySignedOutState(dispatch) {
  transitionAuthState(dispatch, {
    user: null,
    approvedUser: null,
    isAuthorized: false,
    authError: '',
    authInitialized: true,
    loading: false,
  })
}

function createResolvedAuthState(nextUser, resolution) {
  if (resolution.status === 'authorized') {
    return {
      user: nextUser,
      approvedUser: resolution.approvedUser,
      isAuthorized: true,
      authError: '',
      authInitialized: true,
      loading: false,
    }
  }

  return {
    user: nextUser,
    approvedUser: null,
    isAuthorized: false,
    authError: getAuthorizationMessage(resolution.status),
    authInitialized: true,
    loading: false,
  }
}

export function AuthProvider({ children }) {
  const [browserTestAuth] = useState(() => getBrowserTestAuthState())
  const isBrowserTestMode = browserTestAuth !== null
  const [authState, dispatchAuthState] = useReducer(
    authReducer,
    browserTestAuth,
    (initialBrowserTestAuth) => createInitialAuthState(initialBrowserTestAuth, isBrowserTestMode),
  )

  useEffect(() => {
    if (isBrowserTestMode) return undefined
    if (!isFirebaseConfigured) return undefined

    let active = true
    let unsubscribe = () => {}

    async function hydrateAuthorizedUser(nextUser) {
      if (!active) return

      if (!nextUser) {
        applySignedOutState(dispatchAuthState)
        return
      }

      dispatchAuthState({ payload: { loading: true } })

      try {
        const resolution = await resolveApprovedUser(nextUser)
        if (!active) return

        transitionAuthState(dispatchAuthState, createResolvedAuthState(nextUser, resolution))
      } catch (error) {
        if (!active) return

        transitionAuthState(dispatchAuthState, {
          user: nextUser,
          approvedUser: null,
          isAuthorized: false,
          authError: error?.message || 'Couple Book could not verify this account.',
          authInitialized: true,
          loading: false,
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

            transitionAuthState(dispatchAuthState, {
              user: null,
              approvedUser: null,
              isAuthorized: false,
              authError: error?.message || 'Couple Book auth monitoring failed.',
              authInitialized: true,
              loading: false,
            })
          },
        )

        if (typeof auth?.authStateReady === 'function') {
          await auth.authStateReady()
        }

        if (!active || auth?.currentUser) return
        applySignedOutState(dispatchAuthState)
      } catch (error) {
        if (!active) return

        transitionAuthState(dispatchAuthState, {
          user: null,
          approvedUser: null,
          isAuthorized: false,
          authError: error?.message || 'Couple Book could not initialize Firebase auth.',
          authInitialized: true,
          loading: false,
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

    dispatchAuthState({ payload: { authError: '', loading: true } })

    try {
      const result = await signInWithEmail(email, password)
      const resolution = await resolveApprovedUser(result.user)

      transitionAuthState(dispatchAuthState, createResolvedAuthState(result.user, resolution))

      return result
    } catch (error) {
      transitionAuthState(dispatchAuthState, {
        user: null,
        approvedUser: null,
        isAuthorized: false,
        authError: error?.message || 'Unable to complete sign-in.',
        authInitialized: true,
        loading: false,
      })
      throw error
    }
  }, [isBrowserTestMode])

  const signOut = useCallback(async () => {
    if (isBrowserTestMode) {
      applySignedOutState(dispatchAuthState)
      return
    }

    dispatchAuthState({ payload: { loading: true } })

    try {
      await signOutCurrentUser()
    } finally {
      applySignedOutState(dispatchAuthState)
    }
  }, [isBrowserTestMode])

  const { approvedUser, authError, authInitialized, isAuthorized, loading, user } = authState

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
