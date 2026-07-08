/**
 * auth.js — MemoryBook Authentication
 *
 * SECURITY MODEL:
 *   - Only existing approved couple accounts can access this application.
 *   - Public self-service signup is disabled.
 *   - Login uses email/password only.
 *   - Username lookup stays disabled on the client.
 *   - Guest access is disabled for private data protection.
 */

import { state } from '../core/state.js';

const FIREBASE_CDN = 'https://www.gstatic.com/firebasejs/10.14.1';
const AUTH_NOTICE_KEY = 'memorybook_auth_notice';

function setAuthNotice(message) {
  try {
    if (message) sessionStorage.setItem(AUTH_NOTICE_KEY, message);
    else sessionStorage.removeItem(AUTH_NOTICE_KEY);
  } catch {
    // Non-fatal in private browsing / restricted storage modes.
  }
}

// ─── Core Auth Object ─────────────────────────────────────────────────────────

export const Auth = {

  getCurrentSession() {
    return localStorage.getItem('memorybook_active_session');
  },

  isAuthenticated() {
    return !!this.getCurrentSession();
  },

  isGuest() {
    return this.getCurrentSession() === 'Guest';
  },

  // ── Registration Count ─────────────────────────────────────────────────────
  async checkRegistrationStatus(db) {
    return { count: 2, isOpen: false };
  },

  // ── Verify Registered Account ──────────────────────────────────────────────
  // After Firebase Auth succeeds, confirm this account was registered via MemoryBook
  // (i.e., a Firestore user document exists). Fail closed if that verification
  // cannot complete so unknown Firebase users are never allowed through.
  async verifyRegisteredAccount(uid, db) {
    void db;
    const { verifyApprovedUser } = await import('../services/authService.js');
    return verifyApprovedUser({ uid }, { timeoutMs: 5000 });
  },

  // ── Register ───────────────────────────────────────────────────────────────
  async register(username, email, password) {
    throw new Error('MemoryBook is private. New account creation is disabled.');
  },

  // ── Login ──────────────────────────────────────────────────────────────────
  async login(loginInput, password) {
    if (!loginInput?.trim()) throw new Error('Please enter your account email.');
    if (!password?.trim()) throw new Error('Please enter your password.');
    if (!loginInput.includes('@')) {
      throw new Error('Use your account email to sign in. Username sign-in is disabled.');
    }

    const { auth: fbAuth, db } = await import('../firebase/firebase-config.js');
    if (!fbAuth || !db) throw new Error('Firebase is offline. Try again shortly.');

    const { signInWithEmailAndPassword } = await import(`${FIREBASE_CDN}/firebase-auth.js`);
    const { resolveApprovedDisplayName } = await import('../services/authService.js');

    window.__LOGIN_IN_PROGRESS__ = true;

    let emailToUse = loginInput.trim();
    let resolvedUsername = '';

    // Firebase Auth sign-in
    let firebaseUser;
    try {
      const cred = await signInWithEmailAndPassword(fbAuth, emailToUse, password);
      firebaseUser = cred.user;
    } catch (err) {
      window.__LOGIN_IN_PROGRESS__ = false;
      // Give a clean user-friendly error
      throw new Error('Incorrect email or password.');
    }

    // Verify the account was registered via MemoryBook (not injected from console)
    const isRegistered = await this.verifyRegisteredAccount(firebaseUser.uid, db);
    if (!isRegistered) {
      const { signOut } = await import(`${FIREBASE_CDN}/firebase-auth.js`);
      await signOut(fbAuth).catch(() => {});
      this.clearSessionState();
      setAuthNotice('Access denied. This account is not approved for this private MemoryBook.');
      window.__LOGIN_IN_PROGRESS__ = false;
      throw new Error('Access denied. This account is not authorized for MemoryBook.');
    }

    // Resolve display username from Firestore user doc
    resolvedUsername = await resolveApprovedDisplayName(firebaseUser, { timeoutMs: 5000 });

    if (!resolvedUsername) {
      // Derive from email as fallback
      const prefix = emailToUse.split('@')[0];
      resolvedUsername = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
    }

    // Write session to localStorage
    localStorage.setItem('memorybook_active_uid', firebaseUser.uid);
    localStorage.setItem('memorybook_active_session', resolvedUsername);
    localStorage.setItem('memorybook_active_user', resolvedUsername);
    setAuthNotice('');

    // 🚨 DISABLED PER EMERGENCY STABILITY INSTRUCTIONS
    // await this._registerDevice(firebaseUser.uid, db).catch(e => {
    //   console.warn('[MemoryBook] Device registration skipped:', e.message);
    // });

    this._migrateContractKeys(resolvedUsername);

    try { state.restoreUserSession(resolvedUsername); } catch { /* non-fatal */ }

    window.__LOGIN_IN_PROGRESS__ = false;
    console.log(`[MemoryBook] ✅ Logged in as "${resolvedUsername}"`);
    return true;
  },

  // ── Guest Login ────────────────────────────────────────────────────────────
  loginAsGuest() {
    this.clearSessionState();
    setAuthNotice('Guest access is disabled for this private MemoryBook.');
    throw new Error('Guest access is disabled for this private MemoryBook.');
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  async logout() {
    try {
      const { auth: fbAuth } = await import('../firebase/firebase-config.js');
      const { signOut } = await import(`${FIREBASE_CDN}/firebase-auth.js`);
      if (fbAuth) await signOut(fbAuth);
    } catch { /* ignore */ }

    this.clearSessionState();

    // Reset central router lock so the next page load routes correctly
    window.__MEMORYBOOK_AUTH_LOCK__ = false;

    // Navigate to login — Firebase signOut will also trigger onAuthStateChanged
    window.location.replace('login.html');
  },

  clearSessionState() {
    localStorage.removeItem('memorybook_active_session');
    localStorage.removeItem('memorybook_active_user');
    localStorage.removeItem('memorybook_active_uid');
  },

  // ── Legacy Key Migration ───────────────────────────────────────────────────
  _migrateContractKeys(username) {
    const perUserKey = `memorybook_contract_accepted_${username}`;
    if (localStorage.getItem(perUserKey) === 'true') return;

    try {
      const sigsRaw = localStorage.getItem('memorybook_contract_signatures');
      if (sigsRaw) {
        const sigs = JSON.parse(sigsRaw);
        if (sigs[username]?.accepted === true) {
          localStorage.setItem(perUserKey, 'true');
          return;
        }
      }
    } catch { /* ignore */ }

    for (const k of [
      `memorybook_contract_accepted_${username.toLowerCase()}`,
      `memorybook_contract_accepted_${username.toUpperCase()}`
    ]) {
      if (k !== perUserKey && localStorage.getItem(k) === 'true') {
        localStorage.setItem(perUserKey, 'true');
        return;
      }
    }
  },

  // ── Device Registration ────────────────────────────────────────────────────
  async _registerDevice(uid, db) {
    // 🚨 DISABLED PER EMERGENCY STABILITY INSTRUCTIONS
    return;
  },

  // ── Browser Name Parser ────────────────────────────────────────────────────
  _parseBrowserName(ua) {
    if (!ua) return 'Unknown Browser';
    if (ua.includes('Edg/'))    return 'Microsoft Edge';
    if (ua.includes('Chrome/') && ua.includes('Safari/')) return 'Chrome';
    if (ua.includes('Firefox/')) return 'Firefox';
    if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
    return 'Browser';
  }
};


// ─── UI Controller (login.html only) ─────────────────────────────────────────

if (window.location.pathname.includes('login.html')) {
  let currentMode = 'login';

  // Make _updateRegistrationUI available to submit handler
  async function _updateRegistrationUI() {
    const tabRegister = document.getElementById('tab-register');
    const lockedMsg   = document.getElementById('registration-locked-msg');
    if (tabRegister) tabRegister.style.display = 'none';
    if (lockedMsg) lockedMsg.style.display = 'block';
    if (currentMode === 'register') window.AuthUI.switchTab('login');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    // Apply saved theme immediately
    const theme = localStorage.getItem('memorybook_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    // One-time cleanup of old local auth system
    if (localStorage.getItem('memorybook_auth_patched') !== 'true') {
      localStorage.removeItem('memorybook_users');
      localStorage.setItem('memorybook_auth_patched', 'true');
    }

    const form = document.getElementById('auth-form');
    if (form) form.addEventListener('submit', window.AuthUI.submit);

    const pendingNotice = sessionStorage.getItem(AUTH_NOTICE_KEY);
    if (pendingNotice) {
      const errMsg = document.getElementById('auth-error-msg');
      if (errMsg) errMsg.textContent = pendingNotice;
      sessionStorage.removeItem(AUTH_NOTICE_KEY);
    }

    // Check if registration should be locked
    await _updateRegistrationUI();
  });

  window.AuthUI = {
    switchTab(mode) {
      currentMode = 'login';
      const errMsg = document.getElementById('auth-error-msg');
      if (errMsg) { errMsg.textContent = ''; errMsg.style.color = ''; }

      const tabLogin      = document.getElementById('tab-login');
      const tabRegister   = document.getElementById('tab-register');
      const btnSubmit     = document.getElementById('btn-auth-submit');
      const groupUsername = document.getElementById('group-username');
      const labelEmail    = document.getElementById('label-email');
      const inputEmail    = document.getElementById('auth-email');
      const authUsername  = document.getElementById('auth-username');

      tabLogin?.classList.add('active');
      tabRegister?.classList.remove('active');
      if (btnSubmit) btnSubmit.textContent = 'Sign In';
      if (groupUsername) groupUsername.style.display = 'none';
      if (authUsername) authUsername.required = false;
      if (labelEmail) labelEmail.textContent = 'Account Email';
      if (inputEmail) {
        inputEmail.placeholder = 'Enter your account email';
        inputEmail.type = 'email';
      }

      if (mode !== 'login' && errMsg) {
        errMsg.textContent = 'New account creation is disabled for this private MemoryBook.';
      }
    },

    async submit(e) {
      e.preventDefault();
      const emailOrUsername = document.getElementById('auth-email')?.value.trim() || '';
      const pass            = document.getElementById('auth-password')?.value.trim() || '';
      const username        = document.getElementById('auth-username')?.value.trim() || '';
      const errorMsg        = document.getElementById('auth-error-msg');
      const btn             = document.getElementById('btn-auth-submit');

      if (btn) btn.disabled = true;
      if (errorMsg) {
        errorMsg.style.color = 'var(--color-muted)';
        errorMsg.textContent = '🔐 Verifying...';
      }

      try {
        if (currentMode !== 'login') {
          throw new Error('New account creation is disabled for this private MemoryBook.');
        }

        await Auth.login(emailOrUsername, pass);

        if (errorMsg) errorMsg.textContent = '✨ Syncing your vault...';

      } catch (err) {
        if (errorMsg) {
          errorMsg.style.color = '';
          errorMsg.textContent = err.message;
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    },

    async continueAsGuest() {
      const errorMsg = document.getElementById('auth-error-msg');
      try {
        Auth.loginAsGuest();
      } catch (err) {
        if (errorMsg) {
          errorMsg.style.color = '';
          errorMsg.textContent = err.message;
        }
      }
    }
  };
}

// Expose for logout button in sidebar
window.MemoryAuth = Auth;
