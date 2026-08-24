import { startTransition, useCallback, useEffect, useMemo, useReducer } from 'react';

import { isFirebaseConfigured, missingFirebaseConfigMessage, signOutCurrentUser } from '@/lib/firebase';
import { AuthContext, type MobileApprovedUser } from '@/providers/auth-context';
import { resolveApprovedUser } from '@/services/authorization-service';
import {
  ensureAuthPersistence,
  observeAuthState,
  refreshObservedUser,
  signInWithEmail,
} from '@/services/auth-service';

type AuthState = {
  user: { uid: string; email: string | null; displayName: string | null } | null;
  approvedUser: MobileApprovedUser | null;
  isAuthorized: boolean;
  loading: boolean;
  authInitialized: boolean;
  authError: string;
};

const UNAPPROVED_ACCOUNT_MESSAGE = 'This account is not approved for Couple Book.';
const PENDING_ACCOUNT_MESSAGE = 'This private book has not been opened for this account yet.';
const EXPIRED_SESSION_MESSAGE = 'Your Couple Book session is no longer valid. Sign in again.';

function getAuthorizationMessage(status: string) {
  return status === 'pending' ? PENDING_ACCOUNT_MESSAGE : UNAPPROVED_ACCOUNT_MESSAGE;
}

const initialAuthState: AuthState = {
  user: null,
  approvedUser: null,
  isAuthorized: false,
  loading: isFirebaseConfigured,
  authInitialized: !isFirebaseConfigured,
  authError: isFirebaseConfigured ? '' : missingFirebaseConfigMessage,
};

function authReducer(state: AuthState, payload: Partial<AuthState>) {
  return { ...state, ...payload };
}

function transitionAuthState(dispatch: React.Dispatch<Partial<AuthState>>, payload: Partial<AuthState>) {
  startTransition(() => {
    dispatch(payload);
  });
}

function applySignedOutState(dispatch: React.Dispatch<Partial<AuthState>>) {
  transitionAuthState(dispatch, {
    user: null,
    approvedUser: null,
    isAuthorized: false,
    authError: '',
    authInitialized: true,
    loading: false,
  });
}

function createResolvedAuthState(
  nextUser: AuthState['user'],
  resolution: Awaited<ReturnType<typeof resolveApprovedUser>>,
) {
  if (resolution.status === 'authorized' && resolution.approvedUser) {
    return {
      user: nextUser,
      approvedUser: resolution.approvedUser,
      isAuthorized: true,
      authError: '',
      authInitialized: true,
      loading: false,
    };
  }

  return {
    user: nextUser,
    approvedUser: null,
    isAuthorized: false,
    authError: getAuthorizationMessage(resolution.status),
    authInitialized: true,
    loading: false,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, dispatchAuthState] = useReducer(authReducer, initialAuthState);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    let active = true;
    let unsubscribe = () => {};

    async function hydrateAuthorizedUser(nextUser: AuthState['user']) {
      if (!active) return;

      if (!nextUser) {
        applySignedOutState(dispatchAuthState);
        return;
      }

      dispatchAuthState({ loading: true });

      try {
        const resolution = await resolveApprovedUser(nextUser);
        if (!active) return;
        transitionAuthState(dispatchAuthState, createResolvedAuthState(nextUser, resolution));
      } catch (error) {
        if (!active) return;
        transitionAuthState(dispatchAuthState, {
          user: nextUser,
          approvedUser: null,
          isAuthorized: false,
          authError: error instanceof Error ? error.message : 'Couple Book could not verify this account.',
          authInitialized: true,
          loading: false,
        });
      }
    }

    async function initializeMobileAuth() {
      try {
        await ensureAuthPersistence();
        if (!active) return;

        unsubscribe = observeAuthState(
          (nextUser) => {
            void (async () => {
              if (!nextUser) {
                await hydrateAuthorizedUser(null);
                return;
              }

              try {
                const refreshedUser = await refreshObservedUser(nextUser);
                await hydrateAuthorizedUser({
                  uid: refreshedUser.uid,
                  email: refreshedUser.email,
                  displayName: refreshedUser.displayName,
                });
              } catch (error) {
                if (!active) return;
                transitionAuthState(dispatchAuthState, {
                  user: null,
                  approvedUser: null,
                  isAuthorized: false,
                  authError:
                    error instanceof Error &&
                    /auth\/(invalid-user-token|user-disabled|user-not-found|user-token-expired)/.test(
                      error.message,
                    )
                      ? EXPIRED_SESSION_MESSAGE
                      : error instanceof Error
                        ? error.message
                        : 'Couple Book auth monitoring failed.',
                  authInitialized: true,
                  loading: false,
                });
              }
            })();
          },
          (error) => {
            if (!active) return;
            transitionAuthState(dispatchAuthState, {
              user: null,
              approvedUser: null,
              isAuthorized: false,
              authError: error instanceof Error ? error.message : 'Couple Book auth monitoring failed.',
              authInitialized: true,
              loading: false,
            });
          },
        );
      } catch (error) {
        if (!active) return;
        transitionAuthState(dispatchAuthState, {
          user: null,
          approvedUser: null,
          isAuthorized: false,
          authError:
            error instanceof Error
              ? error.message
              : 'Couple Book could not initialize Firebase auth.',
          authInitialized: true,
          loading: false,
        });
      }
    }

    void initializeMobileAuth();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    dispatchAuthState({ authError: '', loading: true });

    try {
      const result = await signInWithEmail(email, password);
      const nextUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
      };
      const resolution = await resolveApprovedUser(nextUser);
      transitionAuthState(dispatchAuthState, createResolvedAuthState(nextUser, resolution));
      return result;
    } catch (error) {
      transitionAuthState(dispatchAuthState, {
        user: null,
        approvedUser: null,
        isAuthorized: false,
        authError: error instanceof Error ? error.message : 'Unable to complete sign-in.',
        authInitialized: true,
        loading: false,
      });
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    dispatchAuthState({ loading: true });

    try {
      await signOutCurrentUser();
    } finally {
      applySignedOutState(dispatchAuthState);
    }
  }, []);

  const value = useMemo(
    () => ({
      ...authState,
      isConfigured: isFirebaseConfigured,
      signIn,
      signOut,
    }),
    [authState, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
