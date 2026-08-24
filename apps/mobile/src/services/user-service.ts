import {
  APPROVED_USER_ACCESS_STATES,
  SCHEMA_VERSIONS,
} from '../../../../packages/firebase-contracts/src/index.js';

import { readDocument, safeString } from '@/services/firestore-readers';
import { userPath } from '@/services/firestore-paths';

export type ApprovedUserRecord = {
  uid: string;
  username: string;
  coupleId: string;
  approved: boolean;
  accessStatus: string;
  schemaVersion: number | null;
  profileName: string;
  appearanceTheme: string | null;
  theme: string | null;
};

export function normalizeApprovedUserRecord(uid: string, data: Record<string, unknown>) {
  const accessStatus = safeString(data.accessStatus, 40);

  return {
    uid,
    username: safeString(data.username, 80),
    coupleId: safeString(data.coupleId, 120),
    approved: data.approved === true,
    accessStatus: (Object.values(APPROVED_USER_ACCESS_STATES) as string[]).includes(accessStatus)
      ? accessStatus
      : APPROVED_USER_ACCESS_STATES.pending,
    schemaVersion: Number.isInteger(data.schemaVersion) ? Number(data.schemaVersion) : null,
    profileName:
      data.profile && typeof data.profile === 'object'
        ? safeString((data.profile as Record<string, unknown>).name, 80)
        : '',
    appearanceTheme: safeString(data.appearanceTheme, 40) || null,
    theme: safeString(data.theme, 40) || null,
  } satisfies ApprovedUserRecord;
}

export async function getApprovedUserByUid(uid: string) {
  const result = await readDocument({
    path: userPath(uid),
    normalize: (id, data, warnings) => {
      if (data.schemaVersion !== SCHEMA_VERSIONS.accessModel) {
        warnings.push('Approved user schemaVersion is unsupported.');
        return null;
      }

      return normalizeApprovedUserRecord(id, data);
    },
  });

  return result.data;
}
