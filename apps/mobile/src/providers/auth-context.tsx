import { createContext } from 'react';

export type MobileApprovedUser = {
  uid: string;
  username: string;
  profileName: string;
  displayName: string;
  coupleId: string;
  appearanceTheme: string | null;
  theme: string | null;
  memberRole: string;
};

export type AuthContextValue = {
  user: { uid: string; email: string | null; displayName: string | null } | null;
  approvedUser: MobileApprovedUser | null;
  isAuthorized: boolean;
  loading: boolean;
  authInitialized: boolean;
  isConfigured: boolean;
  authError: string;
  signIn: (email: string, password: string) => Promise<unknown>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  approvedUser: null,
  isAuthorized: false,
  loading: true,
  authInitialized: false,
  isConfigured: false,
  authError: '',
  signIn: async () => {
    throw new Error('Couple Book mobile auth is not ready.');
  },
  signOut: async () => {},
});
