import { createContext } from 'react';

import { DefaultCoupleBookThemeId, getCoupleBookTheme } from '@/constants/couplebook-theme';

type MobileThemeDefinition = ReturnType<typeof getCoupleBookTheme>;

export type MobileMemoryRecord = {
  id: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  mediaState: string;
  specialMomentType: string;
  revision: number;
  schemaVersion: number;
  status: 'active' | 'archived';
  isVideo: boolean;
};

export type MobilePlanRecord = {
  id: string;
  title: string;
  category: string;
  status: 'idea' | 'planned' | 'completed' | 'archived';
  targetDate: string;
  notes: string;
  convertedMemoryId: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  schemaVersion: number;
};

export type MobileProfileRecord = {
  uid: string;
  name: string;
  bio: string;
  anniversaryView: string;
  joinedDate: string;
  birthday: string;
  revision: number;
};

export type MobileFavoritesRecord = {
  uid: string;
  favorites: Record<string, string[]>;
  revision: number;
  schemaVersion: number;
};

export type MobileSettingsRecord = {
  id: string;
  appearanceTheme: string;
  theme: string;
  anniversaryView: string;
  privacy: {
    localOnlyMode: boolean;
    reducedMotion: boolean;
  };
  revision: number;
  schemaVersion: number;
};

export type CoupleDataContextValue = {
  loading: boolean;
  error: string;
  warnings: string[];
  themeId: string;
  theme: MobileThemeDefinition;
  memories: MobileMemoryRecord[];
  plans: MobilePlanRecord[];
  profiles: MobileProfileRecord[];
  favorites: MobileFavoritesRecord[];
  sharedSettings: MobileSettingsRecord | null;
  privateSettings: MobileSettingsRecord | null;
};

const defaultTheme = getCoupleBookTheme(DefaultCoupleBookThemeId);

export const CoupleDataContext = createContext<CoupleDataContextValue>({
  loading: false,
  error: '',
  warnings: [],
  themeId: DefaultCoupleBookThemeId,
  theme: defaultTheme,
  memories: [],
  plans: [],
  profiles: [],
  favorites: [],
  sharedSettings: null,
  privateSettings: null,
});
