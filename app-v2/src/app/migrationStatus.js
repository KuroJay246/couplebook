import { protectedRouteMeta } from './routeConfig.js'

const ROUTE_STATUS_BY_PATH = Object.freeze({
  '/dashboard': 'complete',
  '/profile': 'complete',
  '/favorites': 'complete',
  '/settings': 'pending',
  '/contract': 'pending',
  '/timeline': 'pending',
  '/gallery': 'pending',
  '/birthday': 'pending',
  '/valentine': 'pending',
  '/confession': 'pending',
})

const ROUTE_SUMMARY_BY_PATH = Object.freeze({
  '/dashboard': 'Read-only home surface is live inside the protected editorial shell.',
  '/profile': 'Shared identity and relationship details now render as a read-only React page.',
  '/favorites': 'Shared preferences now live in one honest read-only collection.',
  '/settings': 'The utility route structure is in place, but the real read-only page is still pending.',
  '/contract': 'Protected contract handling remains intentionally deferred.',
  '/timeline': 'The story route is still waiting on a safe memory read model.',
  '/gallery': 'The visual archive is still waiting on the memory and media migration boundary.',
  '/birthday': 'Protected special-moment content remains pending behind the routed shell.',
  '/valentine': 'Protected special-moment content remains pending behind the routed shell.',
  '/confession': 'Protected special-moment content remains pending behind the routed shell.',
})

export const approvedAccountMigrationGate = Object.freeze({
  jaylan: 'PASS',
  partner: 'NOT TESTED',
  overall: 'HOLD',
})

const SETTINGS_PROGRESS_PATHS = new Set([
  '/dashboard',
  '/profile',
  '/favorites',
  '/settings',
  '/contract',
  '/timeline',
  '/gallery',
  '/birthday',
  '/valentine',
  '/confession',
])

const routeEntries = protectedRouteMeta
  .filter((route) => SETTINGS_PROGRESS_PATHS.has(route.path))
  .map((route) =>
    Object.freeze({
      path: route.path,
      label: route.title,
      group: route.group,
      status: ROUTE_STATUS_BY_PATH[route.path] || 'pending',
      summary: ROUTE_SUMMARY_BY_PATH[route.path] || route.summary,
    }),
  )

export const routeMigrationStatus = Object.freeze({
  entries: Object.freeze(routeEntries),
  completed: Object.freeze(routeEntries.filter((entry) => entry.status === 'complete')),
  pending: Object.freeze(routeEntries.filter((entry) => entry.status !== 'complete')),
})

export function findRouteMigrationStatus(pathname) {
  return routeMigrationStatus.entries.find((entry) => entry.path === pathname) || null
}
