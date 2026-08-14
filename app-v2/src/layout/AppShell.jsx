import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { protectedRouteMeta } from '../app/routeConfig'
import { useAuth } from '../auth/useAuth'
import { QuickAddMemory } from '../features/memories/QuickAddMemory.jsx'

const NAV_ICON_BY_PATH = {
  '/dashboard': '⌂',
  '/timeline': '◷',
  '/gallery': '□',
  '/profile': '◐',
  '/favorites': '☆',
  '/plans': '+',
  '/settings': '⚙',
  '/contract': '§',
  '/birthday': '✦',
  '/valentine': '♡',
  '/confession': '✎',
}

const PRIMARY_PATHS = new Set(['/dashboard', '/timeline', '/gallery', '/profile', '/favorites', '/plans', '/settings'])
const SHELF_PATHS = new Set(['/contract', '/birthday', '/valentine', '/confession'])

const NAV_ITEMS = protectedRouteMeta.map((route) => ({
  path: route.path,
  label: route.navLabel || route.label,
  mobileLabel: route.label,
  icon: NAV_ICON_BY_PATH[route.path] || '•',
  main: PRIMARY_PATHS.has(route.path),
  shelf: SHELF_PATHS.has(route.path),
  summary: route.summary,
}))

const routePaths = new Set(protectedRouteMeta.map((route) => route.path))
const visibleNavItems = NAV_ITEMS.filter((item) => routePaths.has(item.path))

function surfaceDisplayName(value) {
  if (String(value || '').trim().toLowerCase() === 'approved reader') return 'Jaylan'
  return value
}

function NavList({ items, onNavigate }) {
  return (
    <ul className="nav-links">
      {items.map((item) => (
        <li className="nav-item" key={item.path}>
          <NavLink className="faithful-header-link" onClick={onNavigate} to={item.path}>
            <span className="nav-glyph" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

function MobileNav({ items }) {
  return (
    <div className="mobile-nav-bar faithful-mobile-nav">
      <ul className="mobile-nav-links">
        {items.map((item) => (
          <li className="mobile-nav-item" key={item.path}>
            <NavLink to={item.path}>
              <span className="mobile-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.mobileLabel || item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Sidebar({ items, onClose, onNavigate, open, signOut }) {
  const mainItems = items.filter((item) => item.main)
  const shelfItems = items.filter((item) => item.shelf && !item.main)

  return (
    <>
      <button
        aria-label="Close navigation overlay"
        className={`sidebar-overlay ${open ? 'active' : ''}`}
        onClick={onClose}
        type="button"
      />
      <div className={`sidebar-panel ${open ? 'active' : ''}`} id="sidebar-panel">
        <div className="sidebar-header">
          <div>
            <span className="sidebar-kicker">Couple Book</span>
            <h2 style={{ fontFamily: 'var(--font-accent)' }}>Private Shelf</h2>
          </div>
          <button
            aria-label="Close navigation"
            className="faithful-icon-button"
            onClick={onClose}
            style={{ fontSize: '1.5rem' }}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="sidebar-content">
          <span className="sidebar-section-label">Main Pages</span>
          {mainItems.map((item) => (
            <NavLink className="sidebar-item faithful-sidebar-link" key={item.path} onClick={onNavigate} to={item.path}>
              <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="sidebar-section-label">Keepsakes</span>
          {shelfItems.map((item) => (
            <NavLink className="sidebar-item faithful-sidebar-link" key={item.path} onClick={onNavigate} to={item.path}>
              <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <hr style={{ borderColor: 'var(--border-glass)', margin: '1rem 0' }} />
          <button aria-label="Logout" className="btn btn-secondary faithful-signout" onClick={signOut} type="button">
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const { approvedUser, signOut, user } = useAuth()
  const displayName = surfaceDisplayName(approvedUser?.displayName || approvedUser?.username || user?.email) || 'Guest'
  const mainItems = visibleNavItems.filter((item) => item.main)

  return (
    <div className="app-shell faithful-shell-frame">
      <div id="navigation-shell">
        <header className="glass-header">
          <div className="logo-container">
            <button
              aria-label="Open navigation"
              className="faithful-icon-button"
              onClick={() => setMenuOpen(true)}
              style={{ fontSize: '1.5rem' }}
              type="button"
            >
              ☰
            </button>
            <NavLink className="faithful-header-link logo-container" to="/dashboard">
              <span className="logo-icon">CB</span>
              <span className="logo-copy">
                <span className="logo-text">Couple Book</span>
                <span className="logo-subtitle">Private memory archive</span>
              </span>
            </NavLink>
          </div>
          <nav className="desktop-only-nav faithful-main-nav" aria-label="Main navigation">
            <NavList items={mainItems} onNavigate={() => setMenuOpen(false)} />
          </nav>
          <NavLink aria-label={`Open profile for ${displayName}`} className="user-badge-header" to="/profile">
            <span className="avatar-small" aria-hidden="true" />
            <span className="badge-name">{displayName}</span>
          </NavLink>
          <button className="btn btn-primary shell-quick-add" onClick={() => setQuickAddOpen(true)} type="button">
            Add Memory
          </button>
        </header>
        <MobileNav items={mainItems} />
        <Sidebar
          items={visibleNavItems}
          onClose={() => setMenuOpen(false)}
          onNavigate={() => setMenuOpen(false)}
          open={menuOpen}
          signOut={signOut}
        />
      </div>
      <main className="main-content animate-fade-in">
        <Outlet />
      </main>
      <QuickAddMemory onClose={() => setQuickAddOpen(false)} open={quickAddOpen} />
    </div>
  )
}
