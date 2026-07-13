import { AuthContext } from './AuthContext'
import { isFirebaseConfigured, missingFirebaseConfigMessage } from '../lib/firebaseConfig'

const foundationAuthValue = {
  user: null,
  approvedUser: null,
  isAuthorized: false,
  loading: false,
  authInitialized: true,
  isConfigured: isFirebaseConfigured,
  authError: isFirebaseConfigured ? '' : missingFirebaseConfigMessage,
  signIn: async () => {
    throw new Error('Protected auth shell is not wired yet.')
  },
  signOut: async () => {},
}

export function AuthProvider({ children }) {
  return <AuthContext.Provider value={foundationAuthValue}>{children}</AuthContext.Provider>
}
