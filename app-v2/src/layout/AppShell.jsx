import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { protectedRouteMeta } from '../app/routeConfig'
import { useAuth } from '../auth/useAuth'
import { MobileNavigation } from './MobileNavigation'

const primaryRoutes = protectedRouteMeta.filter((route) => {
  return ['/dashboard', '/timeline', '/gallery'].includes(route.path)
})

const sharedRoutes = protectedRouteMeta.filter((route) => {
  return ['/profile', '/favorites'].includes(route.path)
})

const quietRoutes = protectedRouteMeta.filter((route) => {
  return ['/settings', '/contract'].includes(route.path)
})

const specialRoutes = protectedRouteMeta.filter((route) => {
  return ['/birthday', '/valentine', '/confession'].includes(route.path)
})

function SidebarGroup({ title, routes, onNavigate }) {
  return (
    <section className="sidebar-group">
      <p className="sidebar-heading">{title}</p>
      <div className="sidebar-links">
        {routes.map((route) => (
          <NavLink
            key={route.path}
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            onClick={onNavigate}
            to={route.path}
          >
            <span>{route.label}</span>
            <small>{route.shortLabel}</small>
          </NavLink>
        ))}
      </div>
    </section>
  )
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { approvedUser, signOut, user } = useAuth()
  const currentRoute = protectedRouteMeta.find((route) => route.path === location.pathname) || protectedRouteMeta[0]
  const displayName = approvedUser?.displayName || approvedUser?.username || user?.email || 'Approved account'
  const mobileRoutes = [...primaryRoutes, ...sharedRoutes.slice(0, 1)]

  return (
    <div className="app-shell">
      <aside className="shell-sidebar shell-sidebar-desktop">
        <div className="brand-panel">
          <span className="eyebrow">Couple Book</span>
          <h1>A private journal kept for two.</h1>
          <p>The protected shell is being rebuilt as one quiet place, with legacy reads layered in only where they are safe.</p>
        </div>
        <SidebarGroup onNavigate={() => setMenuOpen(false)} routes={primaryRoutes} title="Primary story" />
        <SidebarGroup onNavigate={() => setMenuOpen(false)} routes={sharedRoutes} title="Shared space" />
        <SidebarGroup onNavigate={() => setMenuOpen(false)} routes={quietRoutes} title="Quiet utilities" />
        <SidebarGroup onNavigate={() => setMenuOpen(false)} routes={specialRoutes} title="Special moments" />
        <div className="account-panel">
          <p className="account-label">Private access</p>
          <strong>{displayName}</strong>
          <span>{user?.email || 'Awaiting sign-in'}</span>
          <button className="button button-secondary" onClick={() => signOut()} type="button">
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
          <aside className="shell-sidebar shell-sidebar-mobile">
            <div className="brand-panel">
              <span className="eyebrow">Couple Book</span>
              <h1>A private journal kept for two.</h1>
              <p>The static site stays intact while this quieter shell grows in parallel.</p>
            </div>
            <SidebarGroup onNavigate={() => setMenuOpen(false)} routes={primaryRoutes} title="Primary story" />
            <SidebarGroup onNavigate={() => setMenuOpen(false)} routes={sharedRoutes} title="Shared space" />
            <SidebarGroup onNavigate={() => setMenuOpen(false)} routes={quietRoutes} title="Quiet utilities" />
            <SidebarGroup onNavigate={() => setMenuOpen(false)} routes={specialRoutes} title="Special moments" />
          </aside>
        </div>
      )}

      <div className="shell-frame">
        <header className="shell-header">
          <button className="button button-secondary shell-menu-button" onClick={() => setMenuOpen(true)} type="button">
            Menu
          </button>
          <div className="shell-header-copy">
            <span className="eyebrow">Current page</span>
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

        <MobileNavigation items={mobileRoutes} onOpenMenu={() => setMenuOpen(true)} />
      </div>
    </div>
  )
}
