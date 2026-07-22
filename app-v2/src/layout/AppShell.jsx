import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { protectedRouteMeta } from '../app/routeConfig'
import { useAuth } from '../auth/useAuth'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '✨', main: true },
  { path: '/timeline', label: 'Memories', icon: '📖', main: true },
  { path: '/gallery', label: 'Gallery', icon: '🖼️', main: true },
  { path: '/profile', label: 'Profiles', icon: '👤', main: true },
  { path: '/favorites', label: 'Favorites', icon: '🌟', main: true },
  { path: '/settings', label: 'Settings', icon: '⚙️', main: true },
  { path: '/contract', label: 'Contract', icon: '📜', main: false },
  { path: '/birthday', label: 'Birthday', icon: '🎂', main: false },
  { path: '/valentine', label: 'Valentine', icon: '💌', main: false },
  { path: '/confession', label: 'Confession', icon: '💖', main: false },
]

const routePaths = new Set(protectedRouteMeta.map((route) => route.path))
const visibleNavItems = NAV_ITEMS.filter((item) => routePaths.has(item.path))

function NavList({ items, onNavigate }) {
  return (
    <ul className="nav-links">
      {items.map((item) => (
        <li className="nav-item" key={item.path}>
          <NavLink className="faithful-header-link" onClick={onNavigate} to={item.path}>
            <span aria-hidden="true">{item.icon}</span>
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
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Sidebar({ items, onClose, onNavigate, open, signOut }) {
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
          <h2 style={{ fontFamily: 'var(--font-accent)' }}>🧭 Quick Nav</h2>
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
          {items.map((item) => (
            <NavLink className="sidebar-item faithful-sidebar-link" key={item.path} onClick={onNavigate} to={item.path}>
              <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          <hr style={{ borderColor: 'var(--border-glass)', margin: '1rem 0' }} />
          <button className="btn btn-secondary faithful-signout" onClick={signOut} type="button">
            🚪 Logout
          </button>
        </div>
      </div>
    </>
  )
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { approvedUser, signOut, user } = useAuth()
  const displayName = approvedUser?.displayName || approvedUser?.username || user?.email || 'Guest'
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
              <span className="logo-icon">❤️</span>
              <span className="logo-text">MemoryBook</span>
            </NavLink>
          </div>
          <nav className="desktop-only-nav faithful-main-nav" aria-label="Main navigation">
            <NavList items={mainItems} onNavigate={() => setMenuOpen(false)} />
          </nav>
          <NavLink aria-label={`Open profile for ${displayName}`} className="user-badge-header" to="/profile">
            <span className="avatar-small" aria-hidden="true" />
            <span className="badge-name">{displayName}</span>
          </NavLink>
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
    </div>
  )
}
