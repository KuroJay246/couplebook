export const LOGIN_PATH = '/login'
export const DEFAULT_AUTHENTICATED_PATH = '/dashboard'

export const ROUTE_GROUPS = Object.freeze({
  primary: 'primary',
  shared: 'shared',
  special: 'special',
  utility: 'utility',
})

export const protectedRouteMeta = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    navLabel: 'Home',
    title: 'Dashboard',
    chapter: 'Chapter 01',
    group: ROUTE_GROUPS.primary,
    summary: 'A story-led private home built on the editorial shell and narrow read-only inputs.',
  },
  {
    path: '/timeline',
    label: 'Timeline',
    navLabel: 'Story',
    title: 'Timeline',
    chapter: 'Chapter 02',
    group: ROUTE_GROUPS.primary,
    summary: 'The relationship story will settle here once legacy reads are connected.',
  },
  {
    path: '/gallery',
    label: 'Gallery',
    navLabel: 'Gallery',
    title: 'Gallery',
    chapter: 'Chapter 03',
    group: ROUTE_GROUPS.primary,
    summary: 'Curated visual memories will move here after the compatibility layer is wired.',
  },
  {
    path: '/profile',
    label: 'Profile',
    navLabel: 'Us',
    title: 'Profile',
    chapter: 'Chapter 04',
    group: ROUTE_GROUPS.primary,
    summary: 'Shared identity and paired profiles stay intentionally private here.',
  },
  {
    path: '/favorites',
    label: 'Favorites',
    navLabel: 'Favorites',
    title: 'Favorites',
    group: ROUTE_GROUPS.shared,
    summary: 'Read-only shared favorites now stay here, with exact overlap shown only when it is honestly preserved.',
  },
  {
    path: '/contract',
    label: 'Contract',
    navLabel: 'Contract',
    title: 'Contract',
    group: ROUTE_GROUPS.shared,
    summary: 'Protected contract handling moves here with real auth ownership.',
  },
  {
    path: '/birthday',
    label: 'Birthday',
    navLabel: 'Birthday',
    title: 'Birthday',
    group: ROUTE_GROUPS.special,
    accent: 'gold',
    summary: 'Sensitive special moments stay protected behind the routed shell.',
  },
  {
    path: '/valentine',
    label: 'Valentine',
    navLabel: 'Valentine',
    title: 'Valentine',
    group: ROUTE_GROUPS.special,
    accent: 'rose',
    summary: 'Special moments are intentionally placeholders in this migration phase.',
  },
  {
    path: '/confession',
    label: 'Confession',
    navLabel: 'Confession',
    title: 'Confession',
    group: ROUTE_GROUPS.special,
    accent: 'oxblood',
    summary: 'Direct public access stays retired until content is reintroduced safely.',
  },
  {
    path: '/settings',
    label: 'Settings',
    navLabel: 'Settings',
    title: 'Settings',
    group: ROUTE_GROUPS.utility,
    summary: 'Read-only account, privacy, and migration notes stay here without exposing live controls or writes.',
  },
]

const routeMetaByPath = new Map(protectedRouteMeta.map((route) => [route.path, route]))

export function getRoutesByGroup(group) {
  return protectedRouteMeta.filter((route) => route.group === group)
}

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
  return routeMetaByPath.get(normalizedPath) || null
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
