import { useContext } from 'react'
import { CompatibilityContext } from './CompatibilityContext.js'

export function useCompatibilityData() {
  return useContext(CompatibilityContext)
}
