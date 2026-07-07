// Settings controller for MemoryBook
import { state } from '../core/state.js';
import { Auth } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log("SETTINGS LOADED");

  // Hard-close any active overlays/modals that could intercept clicks on this page.
  try {
    const settingsAuthModal = document.getElementById('settings-auth-modal');
    if (settingsAuthModal && settingsAuthModal.style) settingsAuthModal.style.display = 'none';

    document.querySelectorAll('.sidebar-overlay.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.modal-overlay.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.lightbox-overlay.active').forEach(el => el.classList.remove('active'));
  } catch (e) {
    console.warn('SETTINGS overlay cleanup failed:', e);
  }

  initSettingsMenu();
  loadSettings();
  setupSettingsListeners();

  // Load Async Cloud Data
  if (!Auth.isGuest()) {
    loadAccountStats();
    loadDevices();
  }
  loadAdminUsers();
});

// 1. Vertical Sidebar Tab Swapping
function initSettingsMenu() {
  const menuItems = document.querySelectorAll('.settings-menu-item');
  const panels = document.querySelectorAll('.settings-panel');

  let isUnlocked = false;
  const lockedPanels = ['panel-privacy', 'panel-data'];
  let pendingTab = null;

  const modal = document.getElementById('settings-auth-modal');
  const passInput = document.getElementById('settings-auth-password');
  const errorMsg = document.getElementById('settings-auth-error');

  // Debug logging required by the task
  const privacyBtn = document.querySelector('.settings-menu-item[data-target="panel-privacy"]');
  const accountBtn = document.querySelector('.settings-menu-item[data-target="panel-accounts"]');
  const dataBtn = document.querySelector('.settings-menu-item[data-target="panel-data"]');

  console.log("PRIVACY BUTTON:", privacyBtn);
  console.log("ACCOUNT BUTTON:", accountBtn);
  console.log("DATA BUTTON:", dataBtn);

  const openTab = (item) => {
    if (!item) return;

    menuItems.forEach(i => i.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));

    item.classList.add('active');
    const targetPanelId = item.getAttribute('data-target');
    const targetPanel = targetPanelId ? document.getElementById(targetPanelId) : null;
    if (targetPanel) targetPanel.classList.add('active');
  };

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.getAttribute('data-target');

      // Safety: modal elements might be missing in some builds
      if (lockedPanels.includes(targetId) && !isUnlocked) {
        pendingTab = item;
        if (modal) modal.style.display = 'flex';
        if (passInput) setTimeout(() => passInput.focus(), 100);
        return;
      }

      openTab(item);
    });
  });

  // Modal handlers
  document.getElementById('btn-settings-auth-cancel')?.addEventListener('click', () => {
    if (modal && modal.style) modal.style.display = 'none';
    if (passInput) passInput.value = '';
    if (errorMsg) errorMsg.textContent = '';
    pendingTab = null;
  });

  const verifyUnlock = async () => {
    if (!passInput) return;

    const password = passInput.value.trim();
    if (!password) {
      if (errorMsg) errorMsg.textContent = 'Password required.';
      return;
    }

    try {
      const { auth } = await import('../firebase/firebase-config.js');
      if (!auth?.currentUser?.email) {
        throw new Error('You must be signed in online to unlock sensitive settings.');
      }

      const { EmailAuthProvider, reauthenticateWithCredential } = await import(
        'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'
      );

      const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);

      isUnlocked = true;

      if (modal && modal.style) modal.style.display = 'none';
      passInput.value = '';
      if (errorMsg) errorMsg.textContent = '';

      if (pendingTab) {
        openTab(pendingTab);
        pendingTab = null;
      }

      // Security lock reset bug hardening:
      // ensure no overlay remains blocking after unlock.
      try {
        document.querySelectorAll('.modal-overlay.active').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.lightbox-overlay.active').forEach(el => el.classList.remove('active'));
      } catch (_) {}
    } catch (err) {
      if (errorMsg) {
        errorMsg.textContent = err.message === 'Firebase: Error (auth/invalid-credential).'
          ? 'Incorrect password. Access denied.'
          : err.message;
      }
      passInput.value = '';
    }
  };

  document.getElementById('btn-settings-auth-submit')?.addEventListener('click', () => {
    verifyUnlock();
  });
  passInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') verifyUnlock();
  });
}

// 2. Load Settings from State
function loadSettings() {
  const settings = state.getSettings();

  // Active theme card highlight
  highlightThemeCard(settings.theme || 'dark');

  // Anniversary view dropdown
  const annivView = document.getElementById('setting-anniversary-view');
  if (annivView) {
    annivView.value = settings.anniversaryConfig || 'dual';
  }

  // Privacy toggles
  const localOnly = document.getElementById('privacy-local-only');
  const hideOffline = document.getElementById('privacy-hide-offline');

  if (localOnly) {
    localOnly.checked = settings.privacyToggles ? settings.privacyToggles.localOnlyMode : true;
  }
  if (hideOffline) {
    hideOffline.checked = settings.privacyToggles ? settings.privacyToggles.hideOfflineWarning : false;
  }
}

function highlightThemeCard(theme) {
  document.querySelectorAll('.theme-card-option').forEach(card => {
    card.classList.remove('active');
  });

  const activeCard = document.getElementById('theme-' + theme);
  if (activeCard) {
    activeCard.classList.add('active');
  }
}

// 3. Save Preference Listeners
function setupSettingsListeners() {
  const annivView = document.getElementById('setting-anniversary-view');
  const localOnly = document.getElementById('privacy-local-only');
  const hideOffline = document.getElementById('privacy-hide-offline');
  const btnReset = document.getElementById('btn-reset-data');

  const updateSetting = () => {
    const activeTheme = state.getTheme();

    state.saveSettings({
      theme: activeTheme,
      anniversaryConfig: annivView ? annivView.value : 'dual',
      privacyToggles: {
        localOnlyMode: localOnly ? localOnly.checked : true,
        hideOfflineWarning: hideOffline ? hideOffline.checked : false
      }
    });
  };

  if (annivView) annivView.addEventListener('change', updateSetting);
  if (localOnly) localOnly.addEventListener('change', updateSetting);
  if (hideOffline) hideOffline.addEventListener('change', updateSetting);

  // Expose global selectTheme
  window.selectTheme = (themeName) => {
    state.setTheme(themeName);
    highlightThemeCard(themeName);
    updateSetting();
  };

  // Reset Application Data
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      const confirmReset = confirm(
        "Are you sure you want to clear MemoryBook data on this device? This removes this app's local saved memories, profiles, settings, and contract acceptance states from this browser only."
      );
      if (confirmReset) {
        Object.keys(localStorage)
          .filter((key) => key.startsWith('memorybook_'))
          .forEach((key) => localStorage.removeItem(key));
        alert("MemoryBook local device data cleared successfully. Application will now restart.");
        window.location.replace('../index.html');
      }
    });
  }

  // Account Management
  const btnResetContract = document.getElementById('btn-reset-contract');

  if (btnResetContract) {
    btnResetContract.addEventListener('click', () => {
      const confirmRevoke = confirm("Are you sure you want to revoke your signature?");
      if (confirmRevoke) {
        const session = localStorage.getItem('memorybook_active_session') || 'Guest';
        localStorage.removeItem('memorybook_contract_accepted_' + session);
        window.location.replace('dashboard.html'); // Will inject modal
      }
    });
  }
}

// ── Cloud Devices ────────────────────────────────────────────────────────────
async function loadDevices() {
  const container = document.getElementById('device-list');
  if (!container) return;

  const activeUid = localStorage.getItem('memorybook_active_uid');
  if (!activeUid) {
    container.innerHTML = '<div style="text-align: center; color: var(--color-muted);">No active session found.</div>';
    return;
  }

  try {
    const { db } = await import('../firebase/firebase-config.js');
    if (!db) throw new Error('Offline');

    const { collection, query, where, getDocs } = await import(
      'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'
    );

    const q = query(collection(db, 'devices'), where('userId', '==', activeUid));
    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML = '<div style="text-align: center; color: var(--color-muted);">No devices found.</div>';
      return;
    }

    container.innerHTML = '';
    const currentDeviceId = localStorage.getItem('memorybook_device_id');

    function formatDevice(device) {
      if (!device) return { browser: "Unknown", platform: "Unknown", deviceName: "Unknown Device" };
      const browser = device.browser && device.browser.includes("Mozilla") ? "Unknown Browser" : device.browser;
      return {
        ...device,
        browser: browser || "Unknown",
        platform: device.platform || "Unknown"
      };
    }

    snap.forEach(deviceSnap => {
      const rawData = deviceSnap.data();
      const data = formatDevice(rawData);
      const isCurrent = data.deviceId === currentDeviceId;
      const lastSeen = data.lastSeen ? new Date(data.lastSeen.seconds * 1000).toLocaleString() : 'Just now';

      let browserDisplay = data.browser;
      if (browserDisplay && browserDisplay.length > 40) {
        if (browserDisplay.includes('Edg/')) browserDisplay = 'Microsoft Edge';
        else if (browserDisplay.includes('Chrome/') && browserDisplay.includes('Safari/')) browserDisplay = 'Chrome';
        else if (browserDisplay.includes('Firefox/')) browserDisplay = 'Firefox';
        else if (browserDisplay.includes('Safari/') && !browserDisplay.includes('Chrome')) browserDisplay = 'Safari';
        else if (browserDisplay.includes('OPR/') || browserDisplay.includes('Opera/')) browserDisplay = 'Opera';
        else browserDisplay = 'Browser';
      }

      const div = document.createElement('div');
      div.style.cssText =
        'background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); padding: 0.75rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;';

      div.innerHTML =
        '<div>' +
        '<div style="font-weight: 600;">' + (data.deviceName || 'Unknown Device') +
        (isCurrent ? ' <span style="font-size:0.7rem; background:#3b82f6; color:white; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">Current</span>' : '') +
        '</div>' +
        '<div style="font-size: 0.75rem; color: var(--color-secondary-text);">Last Active: ' + lastSeen + '</div>' +
        '<div style="font-size: 0.7rem; color: var(--color-muted);">' + (browserDisplay || 'Browser') + ' / ' + data.platform + '</div>' +
        '</div>' +
        (!isCurrent
          ? '<span style="font-size:0.75rem; color:var(--color-muted);">Remote revoke disabled</span>'
          : '');

      container.appendChild(div);
    });

    const note = document.createElement('div');
    note.style.cssText = 'font-size: 0.75rem; color: var(--color-muted); padding-top: 0.25rem;';
    note.textContent = 'Remote device sign-out is disabled in the browser client until a trusted backend session-management flow exists.';
    container.appendChild(note);
  } catch (e) {
    container.innerHTML = '<div style="text-align: center; color: var(--color-muted);">Failed to load devices (Offline).</div>';
  }
}

// ── Admin Tools ──────────────────────────────────────────────────────────────
async function loadAdminUsers() {
  const container = document.getElementById('admin-user-list');
  if (!container) return;

  container.innerHTML =
    '<div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); padding: 0.9rem; border-radius: 8px; color: var(--color-secondary-text); line-height: 1.5;">' +
    '<strong style="display:block; color: var(--color-primary-text); margin-bottom: 0.35rem;">Client-side cleanup disabled</strong>' +
    'Approved-user management, legacy username cleanup, and account deletion are intentionally blocked in the browser for this private app. Use Firebase Console or a future Admin SDK tool after backup review if account cleanup is ever required.' +
    '</div>';
}

// ── Account Stats ─────────────────────────────────────────────────────────────
async function loadAccountStats() {
  const usernameEl = document.getElementById('stat-username');
  const emailEl = document.getElementById('stat-email');
  const createdEl = document.getElementById('stat-created');
  const lastLoginEl = document.getElementById('stat-last-login');
  const sessionStatusEl = document.getElementById('stat-session-status');
  const syncStatusEl = document.getElementById('stat-sync-status');
  const cloudConnectedEl = document.getElementById('stat-cloud-connected');
  const lastSyncEl = document.getElementById('stat-last-sync');

  if (!usernameEl) return;

  const activeUsername = localStorage.getItem('memorybook_active_session') || 'Jaylan';
  usernameEl.textContent = activeUsername;

  try {
    const { auth } = await import('../firebase/firebase-config.js');
    if (!auth) throw new Error('Offline');

    let currentUser = auth.currentUser;
    if (!currentUser) {
      await new Promise(resolve => {
        const unsubscribe = auth.onAuthStateChanged(user => {
          currentUser = user;
          unsubscribe();
          resolve();
        });
      });
    }

    if (currentUser) {
      emailEl.textContent = currentUser.email || 'N/A';

      const createdDate = currentUser.metadata.creationTime
        ? new Date(currentUser.metadata.creationTime).toLocaleString()
        : 'N/A';
      createdEl.textContent = createdDate;

      const lastLoginDate = currentUser.metadata.lastSignInTime
        ? new Date(currentUser.metadata.lastSignInTime).toLocaleString()
        : 'N/A';
      lastLoginEl.textContent = lastLoginDate;

      localStorage.setItem('memorybook_active_email', currentUser.email || '');
      localStorage.setItem('memorybook_active_created', createdDate);
      localStorage.setItem('memorybook_active_last_login', lastLoginDate);
    } else {
      emailEl.textContent = localStorage.getItem('memorybook_active_email') || 'Offline';
      createdEl.textContent = localStorage.getItem('memorybook_active_created') || 'Offline';
      lastLoginEl.textContent = localStorage.getItem('memorybook_active_last_login') || 'Offline';
    }

    const isOnline = navigator.onLine;
    cloudConnectedEl.innerHTML = isOnline
      ? '<span style="color: #10b981; font-weight: 600;">🟢 Connected</span>'
      : '<span style="color: #ef4444; font-weight: 600;">🔴 Disconnected</span>';

    syncStatusEl.innerHTML = isOnline
      ? '<span style="color: #10b981; font-weight: 600;">✨ Synchronized</span>'
      : '<span style="color: #f59e0b; font-weight: 600;">⚠️ Local Mode</span>';

    lastSyncEl.textContent = isOnline ? 'Just now' : 'Sync pending';
  } catch (e) {
    emailEl.textContent = localStorage.getItem('memorybook_active_email') || 'Offline';
    createdEl.textContent = localStorage.getItem('memorybook_active_created') || 'Offline';
    lastLoginEl.textContent = localStorage.getItem('memorybook_active_last_login') || 'Offline';
    cloudConnectedEl.innerHTML = '<span style="color: #ef4444; font-weight: 600;">🔴 Offline</span>';
    syncStatusEl.innerHTML = '<span style="color: #f59e0b; font-weight: 600;">⚠️ Local Mode</span>';
    lastSyncEl.textContent = 'Sync pending';
  }

  sessionStatusEl.innerHTML = '<span style="color: #10b981; font-weight: 600;">🟢 Active</span>';
}
