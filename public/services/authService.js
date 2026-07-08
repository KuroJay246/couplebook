import { getUserDoc, getUserProfileSummary, userDocExists } from './userService.js';

export async function verifyApprovedUser(firebaseUser, options = {}) {
  if (!firebaseUser?.uid) return false;

  try {
    return await userDocExists(firebaseUser.uid, options);
  } catch (error) {
    console.warn('[MemoryBook] Account verification check failed:', error.message);
    return false;
  }
}

export async function getApprovedUserProfile(firebaseUser, options = {}) {
  if (!firebaseUser?.uid) return null;

  try {
    const snapshot = await getUserDoc(firebaseUser.uid, options);
    if (!snapshot.exists()) return null;
    return snapshot.data() || null;
  } catch (error) {
    console.warn('[MemoryBook] Approved user profile read failed:', error.message);
    return null;
  }
}

export async function resolveApprovedDisplayName(firebaseUser, options = {}) {
  if (!firebaseUser?.uid) return '';

  try {
    const summary = await getUserProfileSummary(firebaseUser.uid, options);
    return summary?.username || '';
  } catch (error) {
    console.warn('[MemoryBook] Approved display name resolution failed:', error.message);
    return '';
  }
}
