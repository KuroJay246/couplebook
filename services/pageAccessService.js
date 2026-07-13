import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth } from '../firebase/firebase-config.js';
import { resolveApprovedDisplayName, verifyApprovedUser } from './authService.js';

const AUTH_NOTICE_KEY = 'memorybook_auth_notice';

function setAuthNotice(message) {
  try {
    if (message) sessionStorage.setItem(AUTH_NOTICE_KEY, message);
    else sessionStorage.removeItem(AUTH_NOTICE_KEY);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

function clearSessionState() {
  try {
    localStorage.removeItem('memorybook_active_session');
    localStorage.removeItem('memorybook_active_user');
    localStorage.removeItem('memorybook_active_uid');
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

function syncApprovedSession(firebaseUser, username) {
  if (!firebaseUser?.uid || !username) return;

  localStorage.setItem('memorybook_active_uid', firebaseUser.uid);
  localStorage.setItem('memorybook_active_session', username);
  localStorage.setItem('memorybook_active_user', username);
  setAuthNotice('');
}

function deriveDisplayName(firebaseUser) {
  const source = firebaseUser?.displayName || firebaseUser?.email || '';
  const prefix = source.split('@')[0] || '';
  if (!prefix) return '';
  return prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
}

export function redirectToLogin(message, loginPath = 'login.html') {
  setAuthNotice(message || 'Sign in with an approved couple account to continue.');
  clearSessionState();
  window.location.replace(loginPath);
}

export async function waitForApprovedUserState(options = {}) {
  const timeoutMs = options.timeoutMs ?? 5000;

  if (!auth) {
    clearSessionState();
    return { status: 'unavailable', reason: 'firebase-auth-unavailable' };
  }

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId = null;
    let unsubscribe = () => {};

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      try {
        unsubscribe();
      } catch {
        // Listener already cleaned up.
      }
      resolve(result);
    };

    unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (!firebaseUser?.uid) {
          clearSessionState();
          finish({ status: 'signed_out' });
          return;
        }

        try {
          const approved = await verifyApprovedUser(firebaseUser, { timeoutMs });
          if (!approved) {
            clearSessionState();
            finish({ status: 'unauthorized', firebaseUser });
            return;
          }

          const resolvedName =
            (await resolveApprovedDisplayName(firebaseUser, { timeoutMs })) ||
            deriveDisplayName(firebaseUser);

          if (!resolvedName) {
            clearSessionState();
            finish({ status: 'unavailable', reason: 'missing-display-name', firebaseUser });
            return;
          }

          syncApprovedSession(firebaseUser, resolvedName);
          finish({
            status: 'authorized',
            firebaseUser,
            username: resolvedName
          });
        } catch (error) {
          clearSessionState();
          finish({
            status: 'unavailable',
            reason: error?.message || 'approval-check-failed',
            firebaseUser
          });
        }
      },
      (error) => {
        clearSessionState();
        finish({
          status: 'unavailable',
          reason: error?.message || 'auth-listener-failed'
        });
      }
    );

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        clearSessionState();
        finish({ status: 'unavailable', reason: 'approval-timeout' });
      }, timeoutMs);
    }
  });
}
