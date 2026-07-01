/**
 * sessionTracker.js — MemoryBook Inactivity Tracker
 *
 * Tracks user activity (mouse, touch, keyboard, scroll).
 * - 30 minutes of inactivity: Forces logout.
 * - 25 minutes of inactivity: Shows a warning modal.
 */

import { Auth } from '../js/auth.js';
import { state } from './state.js';

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME_MS = 25 * 60 * 1000;     // 25 minutes

let lastActivityTime = Date.now();
let warningTimeout = null;
let logoutTimeout = null;
let isWarningVisible = false;

function resetTimers() {
  if (isWarningVisible) return; // Don't reset if warning is up, wait for user choice
  
  lastActivityTime = Date.now();
  
  clearTimeout(warningTimeout);
  clearTimeout(logoutTimeout);

  warningTimeout = setTimeout(showWarningModal, WARNING_TIME_MS);
  logoutTimeout = setTimeout(forceLogout, INACTIVITY_LIMIT_MS);
}

function showWarningModal() {
  if (isWarningVisible) return;
  isWarningVisible = true;

  const modalHTML = `
    <div id="session-warning-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center; padding: 1rem; backdrop-filter: blur(5px);">
      <div class="glass-card" style="max-width: 400px; width: 100%; text-align: center; padding: 2rem;">
        <h2 style="color: #ff4a6b; margin-bottom: 1rem;">Session Expiring</h2>
        <p style="color: var(--color-secondary-text); margin-bottom: 2rem;">
          Your session will expire in 5 minutes due to inactivity.
        </p>
        <div style="display: flex; gap: 1rem;">
          <button id="btn-session-stay" class="btn btn-primary" style="flex: 1;">Stay Logged In</button>
          <button id="btn-session-logout" class="btn btn-secondary" style="flex: 1;">Logout Now</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  document.getElementById('btn-session-stay').addEventListener('click', () => {
    document.getElementById('session-warning-modal').remove();
    isWarningVisible = false;
    resetTimers();
  });

  document.getElementById('btn-session-logout').addEventListener('click', () => {
    forceLogout();
  });
}

function forceLogout() {
  console.log('[MemoryBook] Inactivity limit reached. Forcing logout.');
  // Save unsaved data (sync to cloud uses firestoreSync internally if needed)
  if (state && typeof state._syncToCloud === 'function') {
    state._syncToCloud();
  }
  Auth.logout();
}

export function initSessionTracker() {
  // 🚨 DISABLED PER EMERGENCY STABILITY INSTRUCTIONS
  // Prevents auth heartbeat checks and forced logouts
  return;
}

async function _verifyDeviceToken() {
  // 🚨 DISABLED PER EMERGENCY STABILITY INSTRUCTIONS
  return;
}
