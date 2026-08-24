import { APPROVED_USER_ACCESS_STATES } from '../../../../packages/firebase-contracts/src/index.js';

import { getCoupleMembership } from '@/services/couple-service';
import { getApprovedUserByUid } from '@/services/user-service';

type FirebaseUserLike = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

export function deriveDisplayName(firebaseUser: FirebaseUserLike, approvedUser: { username: string; profileName: string }) {
  if (approvedUser.profileName) return approvedUser.profileName;
  if (approvedUser.username) return approvedUser.username;

  const source = firebaseUser.displayName || firebaseUser.email || '';
  const prefix = source.split('@')[0] || '';
  if (!prefix) return '';
  return prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
}

export async function resolveApprovedUser(firebaseUser: FirebaseUserLike | null) {
  if (!firebaseUser?.uid) {
    return { status: 'signed-out' as const, approvedUser: null };
  }

  const approvedUser = await getApprovedUserByUid(firebaseUser.uid);
  if (!approvedUser) {
    return { status: 'unauthorized' as const, approvedUser: null };
  }

  if (approvedUser.approved !== true) {
    return { status: 'unauthorized' as const, approvedUser: null };
  }

  if (approvedUser.accessStatus !== APPROVED_USER_ACCESS_STATES.active || !approvedUser.coupleId) {
    return { status: 'pending' as const, approvedUser: null };
  }

  const membership = await getCoupleMembership(approvedUser.coupleId, firebaseUser.uid);
  if (!membership.data) {
    return { status: 'pending' as const, approvedUser: null };
  }

  return {
    status: 'authorized' as const,
    approvedUser: {
      ...approvedUser,
      displayName: deriveDisplayName(firebaseUser, approvedUser),
      memberRole: membership.data.role,
    },
  };
}
