import { useContext } from 'react'
import { ThemeContext } from './ThemeContext.js'

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('ThemeProvider is required before using Couple Book theme controls.')
  return value
}

