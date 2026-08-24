import { MEMBER_ROLES, SCHEMA_VERSIONS } from '../../../../packages/firebase-contracts/src/index.js';

import { readDocument, requireSchemaVersion, safeString } from '@/services/firestore-readers';
import { memberPath } from '@/services/firestore-paths';

export type CoupleMembership = {
  uid: string;
  active: boolean;
  role: string;
  schemaVersion: number;
};

export async function getCoupleMembership(coupleId: string, uid: string) {
  return readDocument({
    path: memberPath(coupleId, uid),
    normalize: (id, data, warnings) => {
      if (!requireSchemaVersion(data, warnings, SCHEMA_VERSIONS.accessModel)) return null;
      if (data.active !== true) {
        warnings.push('Couple membership is not active.');
        return null;
      }

      const role = safeString(data.role, 40);
      if (role !== MEMBER_ROLES.member) {
        warnings.push('Couple membership role is unsupported.');
        return null;
      }

      return {
        uid: id,
        active: true,
        role,
        schemaVersion: SCHEMA_VERSIONS.accessModel,
      } satisfies CoupleMembership;
    },
  });
}
