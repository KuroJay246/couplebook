import { useEffect, useMemo, useState } from 'react';

import { DefaultCoupleBookThemeId } from '@/constants/couplebook-theme';
import { useAuth } from '@/hooks/use-auth';
import {
  CoupleDataContext,
  type MobileFavoritesRecord,
  type MobileMemoryRecord,
  type MobilePlanRecord,
  type MobileProfileRecord,
  type MobileSettingsRecord,
} from '@/providers/couple-data-context';
import { buildCoupleTheme, subscribeCoupleData } from '@/services/couple-data-service';

type CoupleDataState = {
  loading: boolean;
  error: string;
  warnings: string[];
  themeId: string;
  memories: MobileMemoryRecord[];
  plans: MobilePlanRecord[];
  profiles: MobileProfileRecord[];
  favorites: MobileFavoritesRecord[];
  sharedSettings: MobileSettingsRecord | null;
  privateSettings: MobileSettingsRecord | null;
};

const initialState: CoupleDataState = {
  loading: false,
  error: '',
  warnings: [],
  themeId: DefaultCoupleBookThemeId,
  memories: [],
  plans: [],
  profiles: [],
  favorites: [],
  sharedSettings: null,
  privateSettings: null,
};

export function CoupleDataProvider({ children }: { children: React.ReactNode }) {
  const { approvedUser, isAuthorized, user } = useAuth();
  const [state, setState] = useState<CoupleDataState>(initialState);
  const canSubscribe = Boolean(isAuthorized && approvedUser?.coupleId && user?.uid);

  useEffect(() => {
    if (!canSubscribe || !approvedUser?.coupleId || !user?.uid) {
      return undefined;
    }

    const unsubscribe = subscribeCoupleData({
      coupleId: approvedUser.coupleId,
      uid: user.uid,
      fallbackThemeId:
        approvedUser.appearanceTheme || approvedUser.theme || DefaultCoupleBookThemeId,
      onUpdate: (snapshot) => {
        setState(snapshot);
      },
      onError: (message) => {
        setState((current) => ({
          ...current,
          loading: false,
          error: message,
        }));
      },
    });

    return unsubscribe;
  }, [approvedUser?.appearanceTheme, approvedUser?.coupleId, approvedUser?.theme, canSubscribe, user?.uid]);

  const value = useMemo(() => {
    const resolvedState = canSubscribe
      ? state
      : {
          ...initialState,
          themeId:
            approvedUser?.appearanceTheme || approvedUser?.theme || state.themeId || DefaultCoupleBookThemeId,
        };
    const theme = buildCoupleTheme(
      resolvedState.themeId || approvedUser?.appearanceTheme || DefaultCoupleBookThemeId,
    );

    return {
      ...resolvedState,
      themeId: theme.id,
      theme,
    };
  }, [approvedUser?.appearanceTheme, approvedUser?.theme, canSubscribe, state]);

  return <CoupleDataContext.Provider value={value}>{children}</CoupleDataContext.Provider>;
}
