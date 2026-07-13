import { createContext } from 'react'

export const CompatibilityContext = createContext({
  state: 'empty',
  snapshot: null,
  error: '',
  refresh: () => {},
})
