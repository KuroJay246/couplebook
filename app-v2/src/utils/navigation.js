import { DEFAULT_AUTHENTICATED_PATH, LOGIN_PATH } from '../app/routeConfig'

export function sanitizeReturnPath(candidate, defaultPath = DEFAULT_AUTHENTICATED_PATH) {
  if (!candidate || typeof candidate !== 'string') return defaultPath
  if (!candidate.startsWith('/')) return defaultPath
  if (candidate.startsWith('//')) return defaultPath
  if (candidate === LOGIN_PATH || candidate.startsWith(`${LOGIN_PATH}?`) || candidate.startsWith(`${LOGIN_PATH}#`)) {
    return defaultPath
  }
  return candidate
}

export function getRequestedReturnPath(locationState) {
  const from = locationState?.from
  if (!from?.pathname) return DEFAULT_AUTHENTICATED_PATH
  return sanitizeReturnPath(`${from.pathname}${from.search || ''}${from.hash || ''}`)
}
