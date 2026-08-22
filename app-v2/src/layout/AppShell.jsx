import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BookHeart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gift,
  Heart,
  HeartHandshake,
  House,
  Images,
  LogOut,
  Menu,
  NotebookTabs,
  PenSquare,
  ScrollText,
  Settings,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import { protectedRouteMeta } from '../app/routeConfig'
import { useAuth } from '../auth/useAuth'
import { BrandMark } from '../components/BrandMark'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx'
import { QuickAddMemory } from '../features/memories/QuickAddMemory.jsx'
import { useTheme } from '../theme/useTheme.js'
import { mobilePrimaryNavigation } from '../utils/navigation.js'

const NAV_ICON_BY_NAME = {
  BookHeart,
  Gift,
  Heart,
  HeartHandshake,
  House,
  Images,
  NotebookTabs,
  PenSquare,
  ScrollText,
  Settings,
  Star,
}

const desktopNavGroups = [
  { label: 'In the book', items: ['/dashboard', '/timeline', '/gallery', '/profile', '/plans'] },
  { label: 'Keepsakes', items: ['/favorites', '/contract'] },
  { label: 'Private pages', items: ['/birthday', '/valentine', '/confession', '/settings'] },
]

const mobileMoreGroups = [
  { label: 'More', items: ['/favorites', '/contract', '/birthday', '/valentine', '/confession', '/settings'] },
]

function surfaceDisplayName(value) {
  if (String(value || '').trim().toLowerCase() === 'approved reader') return 'Jaylan'
  return value
}

function getRouteItems(paths) {
  return paths
    .map((path) => protectedRouteMeta.find((route) => route.path === path))
    .filter(Boolean)
    .map((route) => ({
      ...route,
      iconComponent: NAV_ICON_BY_NAME[route.icon] || Sparkles,
    }))
}

function SidebarContent({ collapsed = false, groups, onNavigate, onRequestSignOut, onToggleCollapsed }) {
  const { approvedUser, user } = useAuth()
  const displayName = surfaceDisplayName(approvedUser?.displayName || approvedUser?.username || user?.email) || 'Private reader'

  return (
    <div className="cb-shell-frame flex h-full min-h-0 flex-col">
      <div className={`relative flex items-center ${collapsed ? 'justify-center px-3' : 'justify-between px-5'} pb-5 pt-6`}>
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="block focus:outline-none"
          aria-label="Go to Home"
        >
          <BrandMark compact={collapsed} />
        </Link>
        {typeof onToggleCollapsed === 'function' ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`${collapsed ? 'absolute right-[-0.95rem] top-6' : ''} cb-motion-standard hidden min-h-10 min-w-10 items-center justify-center rounded-full border px-0 lg:inline-flex`}
            style={{
              borderColor: 'var(--cb-border)',
              background: 'color-mix(in srgb, var(--cb-surface-raised) 88%, transparent)',
              color: 'var(--cb-text-secondary)',
            }}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        ) : null}
      </div>

      <div className={`${collapsed ? 'mx-3 px-2 py-3' : 'mx-4 px-4 py-4'} cb-nav-panel overflow-hidden`}>
        <Link to="/profile" onClick={onNavigate} className="flex w-full min-w-0 items-center justify-between gap-3 text-left">
          <span className="min-w-0 flex-1 overflow-hidden">
            <span className={collapsed ? 'sr-only' : 'cb-kicker'}>
              Shared between two
            </span>
            <span className={`${collapsed ? 'sr-only' : 'mt-2 block'} max-w-full truncate text-sm font-semibold`} style={{ color: 'var(--cb-text)' }}>
              {displayName}
            </span>
            <span className={`${collapsed ? 'sr-only' : 'mt-1 block'} max-w-full truncate text-xs`} style={{ color: 'var(--cb-text-muted)' }}>
              Private shared journal
            </span>
            {collapsed ? <HeartHandshake className="mx-auto size-5" style={{ color: 'var(--cb-text-secondary)' }} aria-hidden="true" /> : null}
          </span>
          {!collapsed ? <ChevronDown className="size-4 shrink-0" style={{ color: 'var(--cb-text-muted)' }} aria-hidden="true" /> : null}
        </Link>
      </div>

      <nav className="mt-5 min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
        {groups.map((group) => (
          <div className="mb-5" key={group.label}>
            <p className={collapsed ? 'sr-only' : 'cb-kicker px-3'}>{group.label}</p>
            <div className="mt-2 space-y-1">
              {getRouteItems(group.items).map(({ path, navLabel, label, iconComponent: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={onNavigate}
                  title={collapsed ? navLabel || label : undefined}
                  aria-label={collapsed ? navLabel || label : undefined}
                  className={({ isActive }) =>
                    `cb-motion-standard cb-nav-link group relative flex min-h-11 items-center rounded-2xl py-2.5 ${
                      collapsed ? 'justify-center px-2' : 'gap-3 px-3.5'
                    } ${isActive ? 'cb-nav-link-active' : ''}`
                  }
                >
                  <Icon className="size-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <span className={collapsed ? 'sr-only' : 'flex-1 text-sm font-semibold'}>{navLabel || label}</span>
                  {collapsed ? (
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute left-[calc(100%+0.65rem)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold shadow-xl group-hover:block group-focus-visible:block"
                      style={{
                        background: 'var(--cb-surface-raised)',
                        color: 'var(--cb-text)',
                        border: '1px solid var(--cb-border)',
                      }}
                    >
                      {navLabel || label}
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t p-3" style={{ borderColor: 'var(--cb-nav-border)' }}>
        <p className={collapsed ? 'sr-only' : 'cb-kicker px-3'}>Account</p>
        <div className={`mt-2 flex items-center ${collapsed ? 'justify-center' : 'gap-3'} rounded-2xl px-2.5 py-2.5`} style={{ background: 'color-mix(in srgb, var(--cb-surface) 88%, transparent)' }}>
          <div
            className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold uppercase"
            style={{
              background: 'color-mix(in srgb, var(--cb-accent-soft) 88%, transparent)',
              color: 'var(--cb-text)',
            }}
          >
            {(displayName || 'A').slice(0, 1)}
          </div>
          <div className={collapsed ? 'sr-only' : 'min-w-0 flex-1'}>
            <p className="truncate text-xs font-semibold" style={{ color: 'var(--cb-text)' }}>Private access</p>
            <p className="truncate text-[10px]" style={{ color: 'var(--cb-text-muted)' }}>{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={onRequestSignOut}
            className="cb-motion-standard inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl p-2.5"
            style={{ color: 'var(--cb-text-secondary)' }}
            aria-label="Sign out"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [signOutState, setSignOutState] = useState({ open: false, pending: false })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const menuButtonRef = useRef(null)
  const mobilePanelRef = useRef(null)
  const location = useLocation()
  const { approvedUser, signOut, user } = useAuth()
  const { activeThemeDefinition } = useTheme()
  const displayName = surfaceDisplayName(approvedUser?.displayName || approvedUser?.username || user?.email) || 'Private reader'
  const mobileItems = useMemo(
    () =>
      mobilePrimaryNavigation(protectedRouteMeta).map((route) => ({
        ...route,
        iconComponent: NAV_ICON_BY_NAME[route.icon] || Sparkles,
      })),
    [],
  )
  const currentRoute = protectedRouteMeta.find((route) => route.path === location.pathname) || protectedRouteMeta[0]

  useEffect(() => {
    if (!menuOpen) return undefined
    const previous = document.activeElement
    const menuButton = menuButtonRef.current
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const focusFirst = () => {
      const focusables = Array.from(mobilePanelRef.current?.querySelectorAll(focusableSelector) || [])
      focusables[0]?.focus()
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
        return
      }
      if (event.key !== 'Tab') return

      const focusables = Array.from(mobilePanelRef.current?.querySelectorAll(focusableSelector) || [])
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.setTimeout(focusFirst, 0)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previous === menuButton || previous?.isConnected) {
        menuButton?.focus()
      }
    }
  }, [menuOpen])

  async function handleSignOut() {
    setSignOutState({ open: true, pending: true })
    try {
      await signOut()
    } finally {
      setSignOutState({ open: false, pending: false })
    }
  }

  return (
    <div className="cb-app-shell">
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 lg:block"
        style={{ width: sidebarCollapsed ? '92px' : '272px' }}
      >
        <SidebarContent
          collapsed={sidebarCollapsed}
          groups={desktopNavGroups}
          onRequestSignOut={() => setSignOutState({ open: true, pending: false })}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0"
            style={{ background: 'rgba(12, 10, 16, 0.68)', backdropFilter: 'blur(12px)' }}
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
            type="button"
          />
          <aside
            ref={mobilePanelRef}
            className="relative h-[100dvh] w-[min(20rem,calc(100vw-2rem))] overflow-hidden shadow-2xl"
            style={{ background: 'var(--cb-nav-bg)' }}
            aria-modal="true"
            role="dialog"
            aria-label="Navigation menu"
          >
            <button
              className="absolute right-3 top-3 z-10 rounded-xl p-2"
              style={{ color: 'var(--cb-text-secondary)' }}
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              type="button"
            >
              <X className="size-5" />
            </button>
            <SidebarContent
              groups={mobileMoreGroups}
              onNavigate={() => setMenuOpen(false)}
              onRequestSignOut={() => setSignOutState({ open: true, pending: false })}
            />
          </aside>
        </div>
      ) : null}

      <div
        className="main-content min-w-0 transition-[padding] duration-200 lg:pl-[var(--shell-sidebar-width)]"
        style={{ '--shell-sidebar-width': sidebarCollapsed ? '92px' : '272px' }}
      >
        <header className="cb-shell-header app-safe-top sticky top-0 z-20 px-3 pb-4 pt-3 sm:px-6 lg:px-8">
          <div className="cb-page-container flex items-center gap-3">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen(true)}
              className="cb-button cb-button-secondary inline-flex min-h-11 min-w-11 items-center justify-center px-0 lg:hidden"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="cb-kicker">{currentRoute.chapter || 'Private shared journal'}</p>
              <h1 className="cb-page-title mt-1 truncate text-2xl sm:text-3xl">{currentRoute.title}</h1>
              <p className="cb-body-copy mt-2 hidden text-sm sm:block">{currentRoute.summary}</p>
            </div>
            <div className="hidden items-center gap-2 xl:flex">
              <span className="cb-shell-meta-pill">{activeThemeDefinition.name}</span>
              <span className="cb-shell-meta-pill">{displayName}</span>
            </div>
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className="cb-button cb-button-primary hidden min-h-11 px-4 sm:inline-flex"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Add Memory
            </button>
          </div>
        </header>

        <main className="px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:py-7">
          <div className="cb-page-container">
            <section className="cb-shell-hero mb-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="cb-shell-meta-pill">{currentRoute.navLabel || currentRoute.label}</span>
                <span className="cb-shell-meta-pill">Theme: {activeThemeDefinition.name}</span>
              </div>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] xl:items-end">
                <div>
                  <h2 className="cb-page-title text-3xl sm:text-4xl">
                    One quiet place for your memories, plans, and private pages.
                  </h2>
                  <p className="cb-body-copy mt-3 max-w-3xl text-sm">
                    Couple Book keeps the relationship content first. Navigation stays predictable, the shell stays restrained, and every route opens with the same protected foundation.
                  </p>
                </div>
                <div className="cb-shell-banner grid gap-3 p-4">
                  <div>
                    <p className="cb-kicker">Right now</p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>{currentRoute.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to="/profile" className="cb-button cb-button-secondary inline-flex min-h-10 px-4">
                      Open Us
                    </Link>
                    <button
                      type="button"
                      onClick={() => setQuickAddOpen(true)}
                      className="cb-button cb-button-primary inline-flex min-h-10 px-4 sm:hidden"
                    >
                      Add Memory
                    </button>
                  </div>
                </div>
              </div>
            </section>
            <Outlet />
          </div>
        </main>

        <nav className="mobile-tab-bar lg:hidden" aria-label="Mobile navigation">
          {mobileItems.map(({ path, navLabel, label, iconComponent: Icon }) => (
            <NavLink key={path} to={path} className={({ isActive }) => `mobile-tab-item ${isActive ? 'mobile-tab-item-active' : ''}`}>
              <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
              <span>{navLabel || label}</span>
            </NavLink>
          ))}
          <button type="button" onClick={() => setMenuOpen(true)} className="mobile-tab-item" aria-label="Open all navigation">
            <Menu className="size-5" strokeWidth={1.8} aria-hidden="true" />
            <span>More</span>
          </button>
        </nav>
      </div>

      <QuickAddMemory onClose={() => setQuickAddOpen(false)} open={quickAddOpen} />
      <ConfirmDialog
        confirmLabel="Sign out"
        message="This closes the approved Couple Book session on this device and returns to the sign-in screen."
        onCancel={() => setSignOutState({ open: false, pending: false })}
        onConfirm={handleSignOut}
        open={signOutState.open}
        pending={signOutState.pending}
        recordName={user?.email}
        title="Sign out of Couple Book?"
      />
    </div>
  )
}
