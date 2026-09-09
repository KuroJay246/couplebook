import { createContext } from 'react'

export const AuthContext = createContext({
  user: null,
  approvedUser: null,
  isAuthorized: false,
  loading: false,
  authInitialized: true,
  isConfigured: false,
  authError: '',
  signIn: async () => {
    throw new Error('Protected auth shell is not wired yet.')
  },
  linkGoogleProvider: async () => {
    throw new Error('Google sign-in linking is not wired yet.')
  },
  signOut: async () => {},
})
