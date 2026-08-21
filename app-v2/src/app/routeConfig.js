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
    title: 'Home',
    chapter: 'Chapter 01',
    group: ROUTE_GROUPS.primary,
    icon: 'House',
    mobilePrimary: true,
    summary: 'Today in Us, On This Day, and the next actions across your private memory book.',
  },
  {
    path: '/timeline',
    label: 'Timeline',
    navLabel: 'Story',
    title: 'Story',
    chapter: 'Chapter 02',
    group: ROUTE_GROUPS.primary,
    icon: 'BookHeart',
    mobilePrimary: true,
    summary: 'Browse the relationship timeline with year navigation, restored memories, and anchored entries.',
  },
  {
    path: '/gallery',
    label: 'Gallery',
    navLabel: 'Album',
    title: 'Album',
    chapter: 'Chapter 03',
    group: ROUTE_GROUPS.primary,
    icon: 'Images',
    mobilePrimary: true,
    summary: 'Group photos and videos into a cleaner private album surface without exposing production media paths.',
  },
  {
    path: '/profile',
    label: 'Profile',
    navLabel: 'Us',
    title: 'Us',
    chapter: 'Chapter 04',
    group: ROUTE_GROUPS.primary,
    icon: 'HeartHandshake',
    mobilePrimary: true,
    summary: 'Shared profile details, relationship identity, and couple-scoped information stay private here.',
  },
  {
    path: '/favorites',
    label: 'Favorites',
    navLabel: 'Favorites',
    title: 'Favorites',
    group: ROUTE_GROUPS.shared,
    icon: 'Star',
    summary: 'Read-only shared favorites now stay here, with exact overlap shown only when it is honestly preserved.',
  },
  {
    path: '/plans',
    label: 'Plans',
    navLabel: 'Plans',
    title: 'Plans',
    group: ROUTE_GROUPS.shared,
    icon: 'NotebookTabs',
    mobilePrimary: true,
    summary: 'Couple-scoped ideas, planned dates, and completed plans can safely become memories.',
  },
  {
    path: '/contract',
    label: 'Contract',
    navLabel: 'Contract',
    title: 'Contract',
    group: ROUTE_GROUPS.shared,
    icon: 'ScrollText',
    summary: 'Read-only contract status and document framing now live here inside the protected shell.',
  },
  {
    path: '/birthday',
    label: 'Birthday',
    navLabel: 'Birthday',
    title: 'Birthday',
    group: ROUTE_GROUPS.special,
    accent: 'gold',
    icon: 'Gift',
    summary: 'Protected birthday content now uses a runtime-only source boundary.',
  },
  {
    path: '/valentine',
    label: 'Valentine',
    navLabel: 'Valentine',
    title: 'Valentine',
    group: ROUTE_GROUPS.special,
    accent: 'rose',
    icon: 'Heart',
    summary: 'Protected Valentine content now uses a runtime-only source boundary.',
  },
  {
    path: '/confession',
    label: 'Confession',
    navLabel: 'Confession',
    title: 'Confession',
    group: ROUTE_GROUPS.special,
    accent: 'oxblood',
    icon: 'PenSquare',
    summary: 'Protected confession content now uses a runtime-only source boundary.',
  },
  {
    path: '/settings',
    label: 'Settings',
    navLabel: 'Settings',
    title: 'Settings',
    group: ROUTE_GROUPS.utility,
    icon: 'Settings',
    summary: 'Read-only account, privacy, and migration notes stay here without exposing live controls or writes.',
  },
]

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

export function resolveProtectedRouteOutcome({ pathname, isLoading, user, isAuthorized }) {
  const normalizedPath = normalizePathname(pathname)

  if (isLoading) {
    return { type: 'loading', path: normalizedPath }
  }

  if (!user) {
    return { type: 'redirect', path: normalizedPath, to: LOGIN_PATH }
  }

  if (!isAuthorized) {
    return { type: 'blocked', path: normalizedPath }
  }

  return { type: 'allow', path: isProtectedPath(normalizedPath) ? normalizedPath : DEFAULT_AUTHENTICATED_PATH }
}
