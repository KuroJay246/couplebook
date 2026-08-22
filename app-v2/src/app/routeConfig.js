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
    label: 'Home',
    navLabel: 'Home',
    title: 'Home',
    chapter: 'Chapter 01',
    group: ROUTE_GROUPS.primary,
    icon: 'House',
    mobilePrimary: true,
    summary: 'Relationship highlights, featured memories, and what matters today.',
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
    summary: 'An editorial journal of memories, milestones, and restored chapters.',
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
    summary: 'A private shared photo book for saved images, videos, and protected uploads.',
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
    summary: 'The two of you, your dates, favorites, and the personal details that shape the book.',
  },
  {
    path: '/favorites',
    label: 'Favorites',
    navLabel: 'Favorites',
    title: 'Favorites',
    group: ROUTE_GROUPS.shared,
    icon: 'Star',
    summary: 'The saved foods, songs, places, and little details you keep reaching for.',
  },
  {
    path: '/plans',
    label: 'Plans',
    navLabel: 'Plans',
    title: 'Plans',
    group: ROUTE_GROUPS.primary,
    icon: 'NotebookTabs',
    mobilePrimary: true,
    summary: 'Date ideas, trips, goals, and moments waiting to happen.',
  },
  {
    path: '/contract',
    label: 'Contract',
    navLabel: 'Contract',
    title: 'Contract',
    group: ROUTE_GROUPS.shared,
    icon: 'ScrollText',
    summary: 'A document-style reading surface for your shared agreement and acceptance status.',
  },
  {
    path: '/birthday',
    label: 'Birthday',
    navLabel: 'Birthday',
    title: 'Birthday',
    group: ROUTE_GROUPS.special,
    accent: 'gold',
    icon: 'Gift',
    summary: 'A warmer chapter for birthday messages, celebrations, and private notes.',
  },
  {
    path: '/valentine',
    label: 'Valentine',
    navLabel: 'Valentine',
    title: 'Valentine',
    group: ROUTE_GROUPS.special,
    accent: 'rose',
    icon: 'Heart',
    summary: 'A love-letter reading flow for Valentine notes and protected content.',
  },
  {
    path: '/confession',
    label: 'Confession',
    navLabel: 'Confession',
    title: 'Confession',
    group: ROUTE_GROUPS.special,
    accent: 'oxblood',
    icon: 'PenSquare',
    summary: 'A quieter private reading space for confessions and intimate writing.',
  },
  {
    path: '/settings',
    label: 'More',
    navLabel: 'More',
    title: 'More',
    group: ROUTE_GROUPS.utility,
    icon: 'Settings',
    summary: 'Appearance, special pages, privacy details, and personal account actions.',
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
