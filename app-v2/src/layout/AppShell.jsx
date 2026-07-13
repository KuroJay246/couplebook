import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { DEFAULT_AUTHENTICATED_PATH, ROUTE_GROUPS, findRouteMeta, getRoutesByGroup } from '../app/routeConfig'
import { useAuth } from '../auth/useAuth'
import { MobileNavigation } from './MobileNavigation'

const primaryRoutes = getRoutesByGroup(ROUTE_GROUPS.primary)
const sharedRoutes = getRoutesByGroup(ROUTE_GROUPS.shared)
const specialRoutes = getRoutesByGroup(ROUTE_GROUPS.special)
const utilityRoutes = getRoutesByGroup(ROUTE_GROUPS.utility)

function PrimaryRouteLink({ onNavigate, route }) {
  return (
    <NavLink
      className={({ isActive }) => `chapter-link ${isActive ? 'chapter-link-active' : ''}`}
      onClick={onNavigate}
      to={route.path}
    >
      <span className="chapter-link-label">{route.navLabel}</span>
      <small className="chapter-link-title">{route.label}</small>
    </NavLink>
  )
}

function SecondaryRouteLink({ onNavigate, route, tone = 'shared' }) {
  return (
    <NavLink
      className={({ isActive }) => `rail-link rail-link-${tone} ${isActive ? 'rail-link-active' : ''}`}
      onClick={onNavigate}
      to={route.path}
    >
      <span>{route.label}</span>
      {tone === 'special' ? <small>{route.title}</small> : null}
    </NavLink>
  )
}

function SecondaryMenuSection({ onNavigate, routes, title, tone = 'shared' }) {
  return (
    <section className="secondary-sheet-group">
      <p className="sidebar-heading">{title}</p>
      <div className="secondary-sheet-links">
        {routes.map((route) => (
          <SecondaryRouteLink key={route.path} onNavigate={onNavigate} route={route} tone={tone} />
        ))}
      </div>
    </section>
  )
}

function getRouteContext(route) {
  if (route.group === ROUTE_GROUPS.primary) {
    return route.chapter || route.navLabel
  }

  if (route.group === ROUTE_GROUPS.shared) {
    return 'Shared space'
  }

  if (route.group === ROUTE_GROUPS.special) {
    return 'Special moment'
  }

  return 'Quiet utility'
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { approvedUser, signOut, user } = useAuth()
  const currentRoute = findRouteMeta(location.pathname) || findRouteMeta(DEFAULT_AUTHENTICATED_PATH)
  const displayName = approvedUser?.displayName || approvedUser?.username || user?.email || 'Approved account'

  return (
    <div className="app-shell">
      <aside className="shell-sidebar shell-sidebar-desktop">
        <div className="shell-identity">
          <div className="brand-panel">
            <span className="eyebrow">Couple Book</span>
            <h1>A private journal kept for two.</h1>
            <p>The main journey now stays limited to Home, Story, Gallery, and Us while every quieter route sits lower in the book.</p>
          </div>
          <nav aria-label="Primary destinations" className="rail-primary">
            {primaryRoutes.map((route) => (
              <PrimaryRouteLink key={route.path} onNavigate={() => setMenuOpen(false)} route={route} />
            ))}
          </nav>
        </div>

        <section className="rail-section">
          <p className="sidebar-heading">Shared details</p>
          <div className="rail-links">
            {sharedRoutes.map((route) => (
              <SecondaryRouteLink key={route.path} onNavigate={() => setMenuOpen(false)} route={route} />
            ))}
          </div>
        </section>

        <section className="rail-section rail-section-special">
          <p className="sidebar-heading">Special moments</p>
          <div className="rail-links">
            {specialRoutes.map((route) => (
              <SecondaryRouteLink key={route.path} onNavigate={() => setMenuOpen(false)} route={route} tone="special" />
            ))}
          </div>
        </section>

        <div className="account-panel">
          <p className="account-label">Utilities</p>
          <div className="rail-links">
            {utilityRoutes.map((route) => (
              <SecondaryRouteLink key={route.path} onNavigate={() => setMenuOpen(false)} route={route} tone="utility" />
            ))}
          </div>
          <div className="account-panel-copy">
            <strong>{displayName}</strong>
            <span>{user?.email || 'Awaiting sign-in'}</span>
          </div>
          <button className="button button-secondary utility-signout" onClick={() => signOut()} type="button">
            Sign out
          </button>
        </div>
      </aside>

      {menuOpen && (
        <div className="shell-overlay" role="presentation">
          <button
            aria-label="Close navigation"
            className="shell-overlay-dismiss"
            onClick={() => setMenuOpen(false)}
            type="button"
          />
          <aside aria-label="Secondary navigation" className="secondary-sheet">
            <div className="secondary-sheet-card">
              <div className="secondary-sheet-header">
                <div>
                  <span className="eyebrow">Contents</span>
                  <h2>Everything beyond the main journey.</h2>
                </div>
                <button className="button button-secondary" onClick={() => setMenuOpen(false)} type="button">
                  Close
                </button>
              </div>

              <div className="secondary-sheet-account">
                <strong>{displayName}</strong>
                <span>{user?.email || 'Approved archive access'}</span>
              </div>

              <SecondaryMenuSection onNavigate={() => setMenuOpen(false)} routes={sharedRoutes} title="Shared details" />
              <SecondaryMenuSection onNavigate={() => setMenuOpen(false)} routes={specialRoutes} title="Special moments" tone="special" />
              <section className="secondary-sheet-group">
                <p className="sidebar-heading">Utilities</p>
                <div className="secondary-sheet-links">
                  {utilityRoutes.map((route) => (
                    <SecondaryRouteLink key={route.path} onNavigate={() => setMenuOpen(false)} route={route} tone="utility" />
                  ))}
                </div>
              </section>

              <button className="button button-secondary utility-signout" onClick={() => signOut()} type="button">
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="shell-frame">
        <header className="shell-header">
          <button className="button button-secondary shell-menu-button" onClick={() => setMenuOpen(true)} type="button">
            More
          </button>
          <div className="shell-header-copy">
            <span className="eyebrow">{getRouteContext(currentRoute)}</span>
            <h2>{currentRoute.title}</h2>
            <p>{currentRoute.summary}</p>
          </div>
          <div className="shell-header-user">
            <strong>{displayName}</strong>
            <span>{user?.email || 'Approved archive access'}</span>
          </div>
        </header>

        <main className="shell-content">
          <Outlet />
        </main>

        <MobileNavigation items={primaryRoutes} onOpenMenu={() => setMenuOpen(true)} />
      </div>
    </div>
  )
}
