import { protectedRouteMeta } from './routeConfig.js'

const ROUTE_STATUS_BY_PATH = Object.freeze({
  '/dashboard': 'complete',
  '/profile': 'complete',
  '/favorites': 'complete',
  '/settings': 'complete',
  '/contract': 'complete',
  '/timeline': 'complete',
  '/gallery': 'complete',
  '/birthday': 'complete',
  '/valentine': 'complete',
  '/confession': 'complete',
})

const ROUTE_SUMMARY_BY_PATH = Object.freeze({
  '/dashboard': 'Read-only home surface is live inside the protected editorial shell.',
  '/profile': 'Shared identity and relationship details now render as a read-only React page.',
  '/favorites': 'Shared preferences now live in one honest read-only collection.',
  '/settings': 'Read-only account, privacy, and migration notes now live inside the routed utility page.',
  '/contract': 'Read-only contract status and document framing now live inside the protected routed shell.',
  '/timeline': 'Read-only story chapters now render from the safe memory read model.',
  '/gallery': 'Read-only visual archive metadata now renders without private media previews.',
  '/birthday': 'Protected runtime-content page is live; production content connection remains pending.',
  '/valentine': 'Protected runtime-content page is live; production content connection remains pending.',
  '/confession': 'Protected runtime-content page is live; production content connection remains pending.',
})

export const specialMomentContentConnectionStatus = Object.freeze({
  birthday: 'development-only',
  valentine: 'development-only',
  confession: 'development-only',
  productionCutover: 'pending',
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

const routeEntries = protectedRouteMeta.flatMap((route) => {
  if (!SETTINGS_PROGRESS_PATHS.has(route.path)) return []

  return [
    Object.freeze({
      path: route.path,
      label: route.title,
      group: route.group,
      status: ROUTE_STATUS_BY_PATH[route.path] || 'pending',
      summary: ROUTE_SUMMARY_BY_PATH[route.path] || route.summary,
    }),
  ]
})

export const routeMigrationStatus = Object.freeze({
  entries: Object.freeze(routeEntries),
  completed: Object.freeze(routeEntries.filter((entry) => entry.status === 'complete')),
  pending: Object.freeze(routeEntries.filter((entry) => entry.status !== 'complete')),
})

export function findRouteMigrationStatus(pathname) {
  return routeMigrationStatus.entries.find((entry) => entry.path === pathname) || null
}
