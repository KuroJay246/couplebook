import { startTransition, useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { auth, isFirebaseConfigured, missingFirebaseConfigMessage } from '../lib/firebase.js'
import { getBrowserTestAuthState } from '../lib/browserTestMode'
import { ensureAuthPersistence, linkCurrentUserWithGoogle, observeAuthState, signInWithEmail, signInWithGoogleProvider, signOutCurrentUser } from '../services/authService'
import { resolveApprovedUser } from '../services/authorizationService'
import { toAuthError, toUserFacingError } from '../services/userFacingError.js'
import { AuthContext } from './AuthContext'

const UNAPPROVED_ACCOUNT_MESSAGE = 'This account is not approved for Couple Book.'
const PENDING_ACCOUNT_MESSAGE = 'This private book has not been opened for this account yet.'

function reportDevAuthError(stage, error) {
  if (!import.meta.env.DEV) return

  console.error(`[AuthProvider:${stage}]`, {
    code: error?.code || null,
    message: error?.message || String(error || ''),
    name: error?.name || null,
  })
}

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

function applySignedOutErrorState(dispatch, message) {
  transitionAuthState(dispatch, {
    user: null,
    approvedUser: null,
    isAuthorized: false,
    authError: message,
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

        reportDevAuthError('resolveApprovedUser', error)
        transitionAuthState(dispatchAuthState, {
          user: nextUser,
          approvedUser: null,
          isAuthorized: false,
          authError: toUserFacingError(error, 'We could not verify this account right now. Try again.'),
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

            reportDevAuthError('observeAuthState', error)
            transitionAuthState(dispatchAuthState, {
              user: null,
              approvedUser: null,
              isAuthorized: false,
              authError: toUserFacingError(error, 'We could not keep your sign-in active. Try again.'),
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

        reportDevAuthError('initializeAuth', error)
        transitionAuthState(dispatchAuthState, {
          user: null,
          approvedUser: null,
          isAuthorized: false,
          authError: toUserFacingError(error, 'We could not start sign-in right now. Try again.'),
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
      reportDevAuthError('signIn', error)
      transitionAuthState(dispatchAuthState, {
        user: null,
        approvedUser: null,
        isAuthorized: false,
        authError: toAuthError(error),
        authInitialized: true,
        loading: false,
      })
      throw error
    }
  }, [isBrowserTestMode])

  const signInWithGoogle = useCallback(async () => {
    if (isBrowserTestMode) {
      throw new Error('Browser regression auth is injected locally and cannot be edited from Google sign-in.')
    }

    dispatchAuthState({ payload: { authError: '', loading: true } })

    try {
      const result = await signInWithGoogleProvider()
      const resolution = await resolveApprovedUser(result.user)

      transitionAuthState(dispatchAuthState, createResolvedAuthState(result.user, resolution))

      return result
    } catch (error) {
      reportDevAuthError('signInWithGoogle', error)
      transitionAuthState(dispatchAuthState, {
        user: null,
        approvedUser: null,
        isAuthorized: false,
        authError: toAuthError(error, 'Google sign-in could not open Couple Book. If this is your first time, sign in with email and link Google from Settings.'),
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

  const linkGoogleProvider = useCallback(async () => {
    if (isBrowserTestMode) {
      throw new Error('Browser regression auth is injected locally and cannot be linked to Google.')
    }

    dispatchAuthState({ payload: { authError: '' } })

    try {
      const result = await linkCurrentUserWithGoogle()
      const resolution = await resolveApprovedUser(result.user)
      transitionAuthState(dispatchAuthState, createResolvedAuthState(result.user, resolution))
      return result
    } catch (error) {
      reportDevAuthError('linkGoogleProvider', error)
      if (error?.code === 'auth/google-link-uid-mismatch') {
        await signOutCurrentUser()
        applySignedOutErrorState(dispatchAuthState, error.message)
        throw error
      }

      transitionAuthState(dispatchAuthState, {
        authError: toAuthError(error, 'We could not link Google sign-in. Try again.'),
        authInitialized: true,
        loading: false,
      })
      throw error
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
      signInWithGoogle,
      linkGoogleProvider,
      signOut,
    }),
    [approvedUser, authError, authInitialized, isAuthorized, isBrowserTestMode, linkGoogleProvider, loading, signIn, signInWithGoogle, signOut, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
