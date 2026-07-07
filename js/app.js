// Global App Shell Manager for MemoryBook
import { state } from '../core/state.js';
import { Auth } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  // Apply theme immediately — synchronous, no async delay
  document.documentElement.setAttribute('data-theme', state.getTheme());

  // Single source of truth routing — all routing decisions happen here
  waitForAuthThenRoute();

  // Run health check silently on dashboard
  if (window.location.pathname.endsWith('/dashboard.html')) {
    import('../core/healthCheck.js')
      .then(({ runHealthCheck }) => runHealthCheck())
      .catch(() => {});
  }
});

/**
 * waitForAuthThenRoute()
 *
 * THE ONLY place routing decisions are made in this app.
 *
 * FLOW (exact):
 *   Open App → Check Firebase Auth session
 *   If NOT authenticated → login.html
 *   If authenticated → Check contract status → Dashboard
 */
async function waitForAuthThenRoute() {
  if (window.__MEMORYBOOK_AUTH_LOCK__) return;
  window.__MEMORYBOOK_AUTH_LOCK__ = true;

  const path = window.location.pathname;
  const isLoginPage = path.endsWith('/login.html');
  const isIndexPage = path === '/' || path.endsWith('/index.html');

  if (isIndexPage) {
    window.location.replace('pages/login.html');
    return;
  }

  const isGuest = Auth.isGuest();
  if (isGuest) {
    try {
      sessionStorage.setItem('memorybook_auth_notice', 'Guest access is disabled for this private MemoryBook.');
    } catch { /* ignore */ }
    Auth.clearSessionState();
    if (!isLoginPage) {
      window.location.replace('login.html');
      return;
    }
    window.__MEMORYBOOK_AUTH_LOCK__ = false;
    return;
  }

  // 🚨 DISABLED PER EMERGENCY STABILITY INSTRUCTIONS
  // import('../core/sessionTracker.js').then(({ initSessionTracker }) => {
  //   initSessionTracker();
  // }).catch(() => {});

  try {
    const { auth } = await import('../firebase/firebase-config.js');
    if (!auth) throw new Error('Firebase Auth not available');

    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
    
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!isLoginPage) {
          window.location.replace(isIndexPage ? 'pages/login.html' : 'login.html');
        }
        return;
      }

      // Allow fresh load for each page transition
      window.__MEMORYBOOK_USER_LOADED__ = false;
      
      // Prevent double execution if the listener fires twice for same session
      if (window.__MEMORYBOOK_USER_LOADED__) return;
      window.__MEMORYBOOK_USER_LOADED__ = true;
      // Safety delay prevents flicker loop
      await new Promise(r => setTimeout(r, 300));
      
      // Wait for Auth.login to finish writing to localStorage if it's currently running
      while (window.__LOGIN_IN_PROGRESS__) {
        await new Promise(r => setTimeout(r, 100));
      }

      const activeUsername = Auth.getCurrentSession();
      if (activeUsername && activeUsername !== 'Guest') {
        try {
          const { firestoreSync } = await import('../core/firestoreSync.js');
          await firestoreSync.loadUserData(user.uid, activeUsername);
          state.restoreUserSession(activeUsername);
          firestoreSync.listen(user.uid, activeUsername);
        } catch (syncErr) {
          console.warn('[MemoryBook] Sync skipped:', syncErr.message);
        }
      }

      const accepted = state.isContractAcceptedFor(activeUsername);

      console.log("AUTH STATE:", user);
      console.log("FIRESTORE LOADED:", activeUsername ? "Yes" : "No");
      console.log("CONTRACT STATUS:", accepted);

      if (!accepted) {
        if (!path.endsWith('/dashboard.html')) {
           window.location.replace('dashboard.html');
           return;
        } else {
           injectContractModal();
        }
      } else {
        if (isLoginPage) {
           window.location.replace('dashboard.html');
           return;
        }
      }

      // ONLY entry point
      renderNavigation();
      highlightActiveNav();
      setupProfileBadge();
    });

  } catch (e) {
    console.warn('[MemoryBook] Auth check skipped (offline mode):', e.message);
    const username = Auth.getCurrentSession();
    if (!username && !isLoginPage) {
      window.location.replace('login.html');
      return;
    }
    if (!isLoginPage) {
      renderNavigation();
      highlightActiveNav();
      setupProfileBadge();
    }
  }
}

/**
 * Injects a modal overlay for the contract if not yet accepted.
 */
function injectContractModal() {
  if (document.getElementById('contract-modal-overlay')) return;
  
  const modalHTML = `
    <div id="contract-modal-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; justify-content: center; align-items: center; padding: 1rem; backdrop-filter: blur(5px);">
      <div class="glass-card" style="max-width: 500px; width: 100%; text-align: center; padding: 2rem;">
        <h2 style="color: var(--color-jaylan); margin-bottom: 1rem;">MemoryBook Vault Contract</h2>
        <p style="color: var(--color-secondary-text); margin-bottom: 2rem;">
          By entering this vault, you promise to uphold the love, patience, and memories stored within. This is a safe space.
        </p>
        <button id="btn-accept-contract" class="btn btn-primary" style="width: 100%;">I Promise</button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  document.getElementById('btn-accept-contract').addEventListener('click', () => {
    const username = Auth.getCurrentSession();
    state.acceptContract(username);
    document.getElementById('contract-modal-overlay').remove();
  });
}


// ─── Guest Mode Read-Only Enforcement ───────────────────────────────────────

function _enforceGuestReadOnly() {
  // Add a visible banner
  const banner = document.createElement('div');
  banner.id = 'guest-mode-banner';
  banner.style.cssText = [
    'position: fixed', 'bottom: 70px', 'left: 50%', 'transform: translateX(-50%)',
    'background: rgba(139, 92, 246, 0.15)', 'border: 1px solid rgba(139, 92, 246, 0.4)',
    'color: var(--color-omia)', 'padding: 0.5rem 1.25rem', 'border-radius: 30px',
    'font-size: 0.8rem', 'z-index: 8888', 'backdrop-filter: blur(8px)',
    'pointer-events: none'
  ].join(';');
  banner.textContent = '👀 Guest Mode — Read Only';
  document.body.appendChild(banner);

  // Intercept all button/input/form interactions that could cause writes
  document.addEventListener('click', (e) => {
    const target = e.target.closest('button, [data-write-action]');
    if (!target) return;
    // Allow nav and non-destructive buttons
    const allowedIds = ['btn-sidebar-toggle', 'btn-sidebar-close', 'sidebar-overlay'];
    if (allowedIds.includes(target.id)) return;
    if (target.closest('#navigation-shell')) return;
    if (target.tagName === 'A') return;

    // Block write actions
    e.preventDefault();
    e.stopPropagation();
    _showGuestToast();
  }, true);

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    _showGuestToast();
  }, true);
}

let _toastTimeout = null;
function _showGuestToast() {
  let toast = document.getElementById('guest-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'guest-toast';
    toast.style.cssText = [
      'position: fixed', 'top: 80px', 'left: 50%', 'transform: translateX(-50%)',
      'background: rgba(255, 74, 107, 0.15)', 'border: 1px solid rgba(255, 74, 107, 0.4)',
      'color: #ff4a6b', 'padding: 0.6rem 1.5rem', 'border-radius: 30px',
      'font-size: 0.85rem', 'z-index: 9999', 'backdrop-filter: blur(8px)',
      'transition: opacity 0.3s ease'
    ].join(';');
    document.body.appendChild(toast);
  }
  toast.textContent = '🔒 Sign in to make changes';
  toast.style.opacity = '1';
  clearTimeout(_toastTimeout);
  _toastTimeout = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// Navigation Data Structure
const navRegistry = [
  { label: "Dashboard", file: "dashboard.html", icon: "✨", mainNav: true },
  { label: "Memories", file: "timeline.html", icon: "📖", mainNav: true },
  { label: "Gallery", file: "media.html", icon: "🖼️", mainNav: true },
  { label: "Profiles", file: "profile.html", icon: "👤", mainNav: true },
  { label: "Favorites", file: "favorites.html", icon: "🌟", mainNav: true },
  { label: "Settings", file: "settings.html", icon: "⚙️", mainNav: true },
  // Legacy Modules
  { label: "Birthday", file: "legacy.html?module=omnia-happy-birthday.html", icon: "🎂", mainNav: false },
  { label: "Valentine", file: "legacy.html?module=valentine/index.html", icon: "💌", mainNav: false },
  { label: "Confession", file: "legacy.html?module=confession/index.html", icon: "💖", mainNav: false }
];

function renderNavigation() {
  const shell = document.getElementById('navigation-shell');
  if (!shell) return;

  const activeUser = state.getActiveUser() || { name: 'Guest', avatar: '/assets/photos/anniversary_2025.png' };
  const nameLabel = activeUser.name;
  
  // Build Desktop Nav Links (Main Nav Only)
  const desktopLinks = navRegistry
    .filter(n => n.mainNav)
    .map(n => `<li class="nav-item" data-nav="${n.file.split('.')[0]}"><a href="${n.file}">${n.icon} ${n.label}</a></li>`)
    .join('');

  // Build Mobile Nav Links (Main Nav Only)
  const mobileLinks = navRegistry
    .filter(n => n.mainNav)
    .map(n => `
      <li class="mobile-nav-item" data-nav="${n.file.split('.')[0]}">
        <a href="${n.file}">
          <span class="mobile-nav-icon">${n.icon}</span>
          <span>${n.label}</span>
        </a>
      </li>
    `).join('');

  // Build Sidebar Links (All Links)
  const sidebarLinks = navRegistry
    .map(n => `
      <a href="${n.file}" class="sidebar-item" data-nav="${n.file.split('.')[0]}">
        <span class="sidebar-icon">${n.icon}</span> ${n.label}
      </a>
    `).join('');

  const headerHTML = `
    <header class="glass-header">
      <div class="logo-container" style="display: flex; align-items: center; gap: 1rem;">
        <button id="btn-sidebar-toggle" class="btn-icon" style="font-size: 1.5rem; color: var(--color-primary-text); cursor: pointer; background: transparent; border: none;">☰</button>
        <a href="dashboard.html" style="text-decoration: none; display: flex; align-items: center; gap: 0.75rem; color: inherit;">
          <span class="logo-icon">❤️</span>
          <span class="logo-text">MemoryBook</span>
        </a>
      </div>
      <nav class="desktop-only-nav">
        <ul class="nav-links">
          ${desktopLinks}
        </ul>
      </nav>
      <div class="user-badge-header" style="cursor: pointer;" id="header-user-badge">
        <img src="${activeUser.avatar || '/assets/photos/anniversary_2025.png'}" alt="Avatar" class="avatar-small" id="header-user-avatar">
        <span class="badge-name" id="header-user-name">${nameLabel}</span>
      </div>
    </header>
  `;

  const bottomBarHTML = `
    <div class="mobile-nav-bar">
      <ul class="mobile-nav-links">
        ${mobileLinks}
      </ul>
    </div>
  `;

  const sidebarHTML = `
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <div class="sidebar-panel" id="sidebar-panel">
      <div class="sidebar-header">
        <h2 style="font-family: var(--font-accent);">🧭 Quick Nav</h2>
        <button id="btn-sidebar-close" class="btn-icon" style="font-size: 1.5rem; color: var(--color-primary-text); cursor: pointer; background: transparent; border: none;">&times;</button>
      </div>
      <div class="sidebar-content">
        ${sidebarLinks}
        <hr style="border-color: var(--border-glass); margin: 1rem 0;">
        <button class="btn btn-secondary" onclick="window.MemoryAuth.logout()" style="width: 100%;">🚪 Logout</button>
      </div>
    </div>
  `;

  shell.innerHTML = headerHTML + bottomBarHTML + sidebarHTML;

  // Attach Sidebar Listeners
  const btnToggle = document.getElementById('btn-sidebar-toggle');
  const btnClose = document.getElementById('btn-sidebar-close');
  const overlay = document.getElementById('sidebar-overlay');
  const panel = document.getElementById('sidebar-panel');

  if (btnToggle) btnToggle.addEventListener('click', () => { panel.classList.add('active'); overlay.classList.add('active'); });
  if (btnClose) btnClose.addEventListener('click', () => { panel.classList.remove('active'); overlay.classList.remove('active'); });
  if (overlay) overlay.addEventListener('click', () => { panel.classList.remove('active'); overlay.classList.remove('active'); });
}

function highlightActiveNav() {
  const path = window.location.pathname;
  let activePage = '';
  
  navRegistry.forEach(n => {
    const baseFile = n.file.split('?')[0];
    if (path.includes(baseFile)) {
      if (baseFile === 'legacy.html') {
        const urlParams = new URLSearchParams(window.location.search);
        if (n.file.includes(urlParams.get('module') || '')) {
          activePage = n.file.split('.')[0];
        }
      } else {
        activePage = baseFile.split('.')[0];
      }
    }
  });

  if (!activePage) return;

  const items = document.querySelectorAll('.nav-item, .mobile-nav-item, .sidebar-item');
  items.forEach(item => {
    if (item.getAttribute('data-nav') === activePage) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

function setupProfileBadge() {
  const badge = document.getElementById('header-user-badge');
  if (badge) {
    badge.addEventListener('click', () => {
      window.location.href = 'profile.html';
    });
  }
}
