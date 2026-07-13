export const LOGIN_PATH = '/login'
export const DEFAULT_AUTHENTICATED_PATH = '/dashboard'

export const protectedRouteMeta = [
  { path: '/dashboard', label: 'Dashboard', shortLabel: 'Home', title: 'Dashboard', summary: 'A warmer private landing space for the day-to-day story.' },
  { path: '/timeline', label: 'Timeline', shortLabel: 'Story', title: 'Timeline', summary: 'The relationship story will settle here once legacy reads are connected.' },
  { path: '/gallery', label: 'Gallery', shortLabel: 'Gallery', title: 'Gallery', summary: 'Curated visual memories will move here after the compatibility layer is wired.' },
  { path: '/profile', label: 'Profile', shortLabel: 'Us', title: 'Profile', summary: 'Shared identity and paired profiles stay intentionally private here.' },
  { path: '/favorites', label: 'Favorites', shortLabel: 'Favorites', title: 'Favorites', summary: 'Cherished things, rituals, and shared preferences will land here.' },
  { path: '/settings', label: 'Settings', shortLabel: 'Settings', title: 'Settings', summary: 'Quiet controls for the private shell and auth state.' },
  { path: '/contract', label: 'Contract', shortLabel: 'Contract', title: 'Contract', summary: 'Protected contract handling moves here with real auth ownership.' },
  { path: '/birthday', label: 'Birthday', shortLabel: 'Birthday', title: 'Birthday', summary: 'Sensitive special moments stay protected behind the routed shell.' },
  { path: '/valentine', label: 'Valentine', shortLabel: 'Valentine', title: 'Valentine', summary: 'Special moments are intentionally placeholders in this migration phase.' },
  { path: '/confession', label: 'Confession', shortLabel: 'Confession', title: 'Confession', summary: 'Direct public access stays retired until content is reintroduced safely.' },
]

export function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return DEFAULT_AUTHENTICATED_PATH
  const [basePath] = String(pathname).split(/[?#]/)
  if (!basePath || basePath === '/') return DEFAULT_AUTHENTICATED_PATH
  return basePath.endsWith('/') && basePath.length > 1 ? basePath.slice(0, -1) : basePath
}

export function isProtectedPath(pathname) {
  const normalizedPath = normalizePathname(pathname)
  return protectedRouteMeta.some((route) => route.path === normalizedPath)
}

export function findRouteMeta(pathname) {
  const normalizedPath = normalizePathname(pathname)
  return protectedRouteMeta.find((route) => route.path === normalizedPath) || null
}

export function resolveProtectedRouteOutcome({ pathname, isLoading, user, isAuthorized }) {
  const normalizedPath = normalizePathname(pathname)

  if (!isProtectedPath(normalizedPath)) {
    return { type: 'allow', path: normalizedPath }
  }

  if (isLoading) {
    return { type: 'loading', path: normalizedPath }
  }

  if (!user) {
    return { type: 'redirect', path: normalizedPath, to: LOGIN_PATH }
  }

  if (!isAuthorized) {
    return { type: 'blocked', path: normalizedPath }
  }

  return { type: 'allow', path: normalizedPath }
}
