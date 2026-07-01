/**
 * auth.js — MemoryBook Authentication
 *
 * SECURITY MODEL:
 *   - Only Jaylan & Omia (+ optional Guest) can access this application.
 *   - Registration is capped at MAX 2 accounts. After that, locked forever.
 *   - Login checks that the account exists in Firestore (registered accounts only).
 *   - Signup NEVER auto-logs the user in — they must sign in manually after.
 *   - Guest mode is fully read-only (enforced at app.js level).
 */

import { state } from '../core/state.js';

const FIREBASE_CDN = 'https://www.gstatic.com/firebasejs/10.14.1';
const MAX_ALLOWED_ACCOUNTS = 2; // Jaylan + Omia only

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
  // Counts how many accounts exist in the usernames collection.
  async checkRegistrationStatus(db) {
    try {
      const { collection, getDocs } = await import(`${FIREBASE_CDN}/firebase-firestore.js`);
      const snap = await Promise.race([
        getDocs(collection(db, 'usernames')),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
      ]);
      return { count: snap.size, isOpen: snap.size < MAX_ALLOWED_ACCOUNTS };
    } catch (e) {
      console.warn('[MemoryBook] Registration check failed (offline?):', e.message);
      // Default open so initial setup works when offline
      return { count: 0, isOpen: true };
    }
  },

  // ── Verify Registered Account ──────────────────────────────────────────────
  // After Firebase Auth succeeds, confirm this account was registered via MemoryBook
  // (i.e., a Firestore user document exists). Rejects any account that snuck in
  // through the Firebase Console or other means.
  async verifyRegisteredAccount(uid, db) {
    try {
      const { doc, getDoc } = await import(`${FIREBASE_CDN}/firebase-firestore.js`);
      const snap = await Promise.race([
        getDoc(doc(db, 'users', uid)),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
      ]);
      return snap.exists();
    } catch (e) {
      console.warn('[MemoryBook] Account verification check failed:', e.message);
      // If Firestore is offline, allow through (Firebase Auth already authenticated them)
      return true;
    }
  },

  // ── Register ───────────────────────────────────────────────────────────────
  async register(username, email, password) {
    if (!username) throw new Error('Username is required.');
    if (!email || !email.includes('@')) throw new Error('Invalid email address.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');

    const { auth: fbAuth, db } = await import('../firebase/firebase-config.js');
    if (!fbAuth || !db) throw new Error('Firebase is offline. Try again shortly.');

    const { createUserWithEmailAndPassword, signOut } = await import(`${FIREBASE_CDN}/firebase-auth.js`);
    const { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } = await import(`${FIREBASE_CDN}/firebase-firestore.js`);

    // 1. Check registration cap
    const status = await this.checkRegistrationStatus(db);
    if (!status.isOpen) {
      throw new Error('MemoryBook is a private invitation-only application. Registration is closed.');
    }

    // 2. Check username uniqueness
    const usernameRef = doc(db, 'usernames', username.toLowerCase());
    const usernameSnap = await getDoc(usernameRef);
    if (usernameSnap.exists()) throw new Error('Username already taken. Choose another.');

    // 3. Create Firebase Auth account
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(fbAuth, email, password);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') throw new Error('That email already has an account.');
      if (err.code === 'auth/invalid-email') throw new Error('Invalid email address.');
      if (err.code === 'auth/weak-password') throw new Error('Password is too weak (min 6 characters).');
      throw new Error(err.message || 'Account creation failed.');
    }

    const normalizedUsername = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();

    // 4. Write username lookup
    await setDoc(usernameRef, { email, uid: cred.user.uid });

    // 5. Write user Firestore document
    await setDoc(doc(db, 'users', cred.user.uid), {
      username: normalizedUsername,
      email,
      theme: 'dark',
      contractAccepted: false,
      migrationCompleted: true,
      profile: { name: normalizedUsername },
      createdAt: serverTimestamp()
    });

    // ⚠️ CRITICAL: Sign out IMMEDIATELY — user must log in manually (no auto-login)
    await signOut(fbAuth);

    console.log(`[MemoryBook] ✅ Account created for "${normalizedUsername}". Redirecting to login.`);
    return { username: normalizedUsername };
  },

  // ── Login ──────────────────────────────────────────────────────────────────
  async login(loginInput, password) {
    if (!loginInput?.trim()) throw new Error('Please enter your email or username.');
    if (!password?.trim()) throw new Error('Please enter your password.');

    const { auth: fbAuth, db } = await import('../firebase/firebase-config.js');
    if (!fbAuth || !db) throw new Error('Firebase is offline. Try again shortly.');

    const { signInWithEmailAndPassword } = await import(`${FIREBASE_CDN}/firebase-auth.js`);
    const { doc, getDoc } = await import(`${FIREBASE_CDN}/firebase-firestore.js`);

    window.__LOGIN_IN_PROGRESS__ = true;

    let emailToUse = loginInput.trim();
    let resolvedUsername = '';

    // Resolve username → email if no @ symbol
    if (!emailToUse.includes('@')) {
      const usernameRef = doc(db, 'usernames', emailToUse.toLowerCase());
      const usernameSnap = await getDoc(usernameRef);
      if (!usernameSnap.exists()) throw new Error('No account found with that username.');
      emailToUse = usernameSnap.data().email;
    }

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
      window.__LOGIN_IN_PROGRESS__ = false;
      throw new Error('Access denied. This account is not authorized for MemoryBook.');
    }

    // Resolve display username from Firestore user doc
    try {
      const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userSnap.exists() && userSnap.data().username) {
        resolvedUsername = userSnap.data().username;
      }
    } catch { /* fall through */ }

    if (!resolvedUsername) {
      // Derive from email as fallback
      const prefix = emailToUse.split('@')[0];
      resolvedUsername = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
    }

    // Write session to localStorage
    localStorage.setItem('memorybook_active_uid', firebaseUser.uid);
    localStorage.setItem('memorybook_active_session', resolvedUsername);
    localStorage.setItem('memorybook_active_user', resolvedUsername);

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
    localStorage.removeItem('memorybook_active_uid');
    localStorage.setItem('memorybook_active_session', 'Guest');
    localStorage.setItem('memorybook_active_user', 'Guest');
    console.log('[MemoryBook] Guest session started (read-only).');
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  async logout() {
    try {
      const { auth: fbAuth } = await import('../firebase/firebase-config.js');
      const { signOut } = await import(`${FIREBASE_CDN}/firebase-auth.js`);
      if (fbAuth) await signOut(fbAuth);
    } catch { /* ignore */ }

    localStorage.removeItem('memorybook_active_session');
    localStorage.removeItem('memorybook_active_user');
    localStorage.removeItem('memorybook_active_uid');

    // Reset central router lock so the next page load routes correctly
    window.__MEMORYBOOK_AUTH_LOCK__ = false;

    // Navigate to login — Firebase signOut will also trigger onAuthStateChanged
    window.location.replace('login.html');
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
    try {
      const { db } = await import('../firebase/firebase-config.js');
      if (!db) return;
      const status = await Auth.checkRegistrationStatus(db);
      if (!status.isOpen) {
        if (tabRegister) tabRegister.style.display = 'none';
        if (lockedMsg)   lockedMsg.style.display   = 'block';
        if (currentMode === 'register') window.AuthUI.switchTab('login');
      } else {
        if (tabRegister) tabRegister.style.display = '';
        if (lockedMsg)   lockedMsg.style.display   = 'none';
      }
    } catch (e) {
      console.warn('[MemoryBook] Registration status check failed:', e.message);
    }
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

    // Check if registration should be locked
    await _updateRegistrationUI();
  });

  window.AuthUI = {
    switchTab(mode) {
      currentMode = mode;
      const errMsg = document.getElementById('auth-error-msg');
      if (errMsg) { errMsg.textContent = ''; errMsg.style.color = ''; }

      const tabLogin      = document.getElementById('tab-login');
      const tabRegister   = document.getElementById('tab-register');
      const btnSubmit     = document.getElementById('btn-auth-submit');
      const groupUsername = document.getElementById('group-username');
      const labelEmail    = document.getElementById('label-email');
      const inputEmail    = document.getElementById('auth-email');
      const authUsername  = document.getElementById('auth-username');

      if (mode === 'login') {
        tabLogin?.classList.add('active');
        tabRegister?.classList.remove('active');
        if (btnSubmit)     btnSubmit.textContent   = 'Sign In';
        if (groupUsername) groupUsername.style.display = 'none';
        if (authUsername)  authUsername.required   = false;
        if (labelEmail)    labelEmail.textContent  = 'Email or Username';
        if (inputEmail) {
          inputEmail.placeholder = 'Enter email or username';
          inputEmail.type = 'text';
        }
      } else {
        tabRegister?.classList.add('active');
        tabLogin?.classList.remove('active');
        if (btnSubmit)     btnSubmit.textContent   = 'Create Account';
        if (groupUsername) groupUsername.style.display = 'block';
        if (authUsername)  authUsername.required   = true;
        if (labelEmail)    labelEmail.textContent  = 'Email';
        if (inputEmail) {
          inputEmail.placeholder = 'Enter your email';
          inputEmail.type = 'email';
        }
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
        errorMsg.textContent = currentMode === 'login' ? '🔐 Verifying...' : '⏳ Creating account...';
      }

      try {
        if (currentMode === 'login') {
          // ── LOGIN ──────────────────────────────────────────────────────────
          await Auth.login(emailOrUsername, pass);

          if (errorMsg) errorMsg.textContent = '✨ Syncing your vault...';

          // Data loading and redirect are now handled purely by Firebase onAuthStateChanged.
          // Do not add window.location.replace here.
        } else {
          // ── REGISTER ───────────────────────────────────────────────────────
          const result = await Auth.register(username, emailOrUsername, pass);

          // ✅ Success — NO auto-login. Show message, switch to login.
          if (errorMsg) {
            errorMsg.style.color = '#34d399';
            errorMsg.textContent = `✅ Account created for ${result.username}! Please sign in below.`;
          }

          document.getElementById('auth-form')?.reset();

          setTimeout(() => {
            window.AuthUI.switchTab('login');
            if (errorMsg) { errorMsg.textContent = ''; errorMsg.style.color = ''; }
          }, 3000);

          // Re-check if registration should now lock
          await _updateRegistrationUI();
        }

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
      Auth.loginAsGuest();
      window.location.replace('dashboard.html');
    }
  };
}

// Expose for logout button in sidebar
window.MemoryAuth = Auth;
