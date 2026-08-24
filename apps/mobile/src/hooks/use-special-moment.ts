import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  subscribeSpecialMoment,
  type MobileSpecialMomentRecord,
} from '@/services/special-moment-service';

type SpecialMomentState = {
  loading: boolean;
  error: string;
  warnings: string[];
  moment: MobileSpecialMomentRecord | null;
};

const initialState: SpecialMomentState = {
  loading: true,
  error: '',
  warnings: [],
  moment: null,
};

export function useSpecialMoment(momentKey: string) {
  const { approvedUser, isAuthorized } = useAuth();
  const [state, setState] = useState<SpecialMomentState>(initialState);
  const canSubscribe = Boolean(isAuthorized && approvedUser?.coupleId);

  useEffect(() => {
    if (!canSubscribe || !approvedUser?.coupleId) {
      return undefined;
    }

    return subscribeSpecialMoment({
      coupleId: approvedUser.coupleId,
      momentKey,
      onUpdate: setState,
    });
  }, [approvedUser?.coupleId, canSubscribe, momentKey]);

  if (!canSubscribe) {
    return {
      loading: false,
      error: 'This special moment needs an approved couple session.',
      warnings: ['This special moment needs an approved couple session.'],
      moment: null,
    };
  }

  return state;
}
