/**
 * healthCheck.js — MemoryBook Diagnostic Utility
 *
 * Runs a series of checks on Firebase connectivity and data integrity.
 * Called silently on dashboard load. All output goes to the browser console.
 *
 * Usage:
 *   import { runHealthCheck } from '../core/healthCheck.js';
 *   runHealthCheck(); // fire-and-forget
 */

const PASS = '✅';
const FAIL = '❌';
const WARN = '⚠️';

export async function runHealthCheck() {
  console.group('🩺 MemoryBook Health Check');
  const results = [];

  // ── 1. Firebase Initialized ─────────────────────────────────────────
  let app = null, db = null, authInstance = null;
  try {
    const mod = await import('../firebase/firebase-config.js');
    app = mod.app;
    db = mod.db;
    authInstance = mod.auth;
    results.push({ label: 'Firebase Initialized', ok: !!app, detail: app ? 'App ready' : 'initializeApp failed' });
  } catch (e) {
    results.push({ label: 'Firebase Initialized', ok: false, detail: e.message });
  }

  // ── 2. Firebase Auth Connected ──────────────────────────────────────
  results.push({
    label: 'Firebase Auth Connected',
    ok: !!authInstance,
    detail: authInstance ? 'Auth ready' : 'Auth instance is null'
  });

  // ── 3. Firestore Connected ──────────────────────────────────────────
  results.push({
    label: 'Firestore Connected',
    ok: !!db,
    detail: db ? 'Firestore ready' : 'DB instance is null'
  });

  // ── 4. User Session Present ─────────────────────────────────────────
  const username = localStorage.getItem('memorybook_active_session');
  const uid = localStorage.getItem('memorybook_active_uid');
  const isGuest = username === 'Guest';
  results.push({
    label: 'User Session',
    ok: !!username && !isGuest,
    warn: isGuest,
    detail: isGuest
      ? 'Guest mode is disabled for this private app — sign in with an approved account'
      : username
        ? `Logged in as: ${username}`
        : 'No active session'
  });

  if (db && uid && username && username !== 'Guest') {
    try {
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');

      // ── 5. User Firestore Document ──────────────────────────────────
      const userRef = doc(db, 'users', uid);
      const userSnap = await Promise.race([
        getDoc(userRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);

      const userExists = userSnap.exists();
      results.push({ label: 'User Cloud Document', ok: userExists, detail: userExists ? 'Document found' : 'No Firestore document for this user' });

      if (userExists) {
        const data = userSnap.data();

        // ── 6. Theme Synced ───────────────────────────────────────────
        const localTheme = localStorage.getItem(`memorybook_theme_${username}`) || localStorage.getItem('memorybook_theme');
        const cloudTheme = data.theme;
        const themeMatch = !cloudTheme || localTheme === cloudTheme;
        results.push({
          label: 'Theme Synced',
          ok: themeMatch,
          detail: themeMatch ? `Theme: ${cloudTheme || localTheme}` : `Mismatch — local: ${localTheme}, cloud: ${cloudTheme}`
        });

        // ── 7. Contract Synced ────────────────────────────────────────
        const localContract = localStorage.getItem(`memorybook_contract_accepted_${username}`) === 'true';
        const cloudContract = data.contractAccepted === true;
        const contractOk = localContract === cloudContract || cloudContract;
        results.push({
          label: 'Contract Synced',
          ok: contractOk,
          detail: contractOk ? `Accepted: ${cloudContract}` : `Local: ${localContract}, Cloud: ${cloudContract}`
        });

        // ── 8. Favorites Synced ───────────────────────────────────────
        const hasFavoritesCloud = data.favorites && Object.keys(data.favorites).length > 0;
        const hasFavoritesLocal = !!localStorage.getItem('memorybook_favorites');
        results.push({
          label: 'Favorites Synced',
          ok: hasFavoritesCloud || !hasFavoritesLocal,
          detail: hasFavoritesCloud ? 'Cloud favorites present' : 'No cloud favorites (may be empty)'
        });

        // ── 9. Profile Synced ─────────────────────────────────────────
        const hasProfileCloud = data.profile && Object.keys(data.profile).length > 0;
        results.push({
          label: 'Profile Synced',
          ok: !!hasProfileCloud,
          detail: hasProfileCloud ? `Profile: ${data.profile.name || username}` : 'No cloud profile data'
        });
      }

    } catch (e) {
      results.push({ label: 'Cloud Checks', ok: false, detail: `Skipped — ${e.message}` });
    }
  } else if (isGuest) {
    results.push({ label: 'Cloud Checks', ok: true, warn: true, detail: 'Skipped — Guest mode has no cloud document' });
  } else {
    results.push({ label: 'Cloud Checks', ok: false, detail: 'Skipped — no active session' });
  }

  // ── 10. Private Registration Model ────────────────────────────────────────────
  results.push({
    label: 'Registration Status',
    ok: true,
    detail: '🔒 Registration is closed for this private couple app.'
  });

  // ── 11. Active Devices Check ────────────────────────────────────────────────
  if (db && uid && !isGuest) {
    try {
      const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
      const q = query(collection(db, 'devices'), where('userId', '==', uid));
      const snap = await Promise.race([
        getDocs(q),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);
      results.push({
        label: 'Active Devices',
        ok: true,
        detail: `${snap.size} device(s) linked to this account`
      });
    } catch (e) {
      results.push({ label: 'Active Devices', ok: false, detail: e.message });
    }
  }

  // ── Output Report ─────────────────────────────────────────────────────
  console.log('');
  results.forEach(r => {
    const icon = r.warn ? WARN : r.ok ? PASS : FAIL;
    console.log(`  ${icon} ${r.label}${r.detail ? ' — ' + r.detail : ''}`);
  });

  const failed = results.filter(r => !r.ok && !r.warn);
  const warned = results.filter(r => r.warn);
  console.log('');
  if (failed.length === 0 && warned.length === 0) {
    console.log('  🎉 All checks passed! MemoryBook is healthy.');
  } else if (failed.length === 0) {
    console.log(`  ${WARN} ${warned.length} warning(s) — app is functional.`);
  } else {
    console.warn(`  ${FAIL} ${failed.length} check(s) need attention.`);
  }
  console.groupEnd();
}

export default runHealthCheck;
