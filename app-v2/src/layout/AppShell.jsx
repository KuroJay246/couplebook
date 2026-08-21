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
import { QuickAddMemory } from '../features/memories/QuickAddMemory.jsx'
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
  { label: 'Home', items: ['/dashboard'] },
  { label: 'Book', items: ['/timeline', '/gallery', '/profile', '/plans'] },
  { label: 'Keepsakes', items: ['/favorites', '/contract', '/birthday', '/valentine', '/confession'] },
  { label: 'System', items: ['/settings'] },
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

function SidebarContent({ collapsed = false, groups, onNavigate, onToggleCollapsed }) {
  const { approvedUser, signOut, user } = useAuth()
  const displayName = surfaceDisplayName(approvedUser?.displayName || approvedUser?.username || user?.email) || 'Private reader'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`flex items-center ${collapsed ? 'justify-center px-3' : 'justify-between px-6'} pb-6 pt-6`}>
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="block focus:outline-none focus:ring-2 focus:ring-[#f4d8e6]/60"
          aria-label="Go to Home"
        >
          <BrandMark compact={collapsed} />
        </Link>
        {typeof onToggleCollapsed === 'function' ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`${collapsed ? 'absolute right-[-0.9rem] top-7' : ''} hidden min-h-10 min-w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 p-2.5 text-white/70 transition hover:bg-white/15 hover:text-white lg:inline-flex`}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        ) : null}
      </div>

      <div className={`${collapsed ? 'mx-3 p-2.5' : 'mx-4 p-3.5'} max-w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]`}>
        <Link to="/profile" onClick={onNavigate} className="flex w-full min-w-0 items-center justify-between gap-3 text-left">
          <span className="min-w-0 flex-1 overflow-hidden">
            <span className={`${collapsed ? 'sr-only' : 'mb-2 block text-[9px] font-bold uppercase tracking-[0.24em] text-[#f0ccdb]'}`}>
              Shared archive
            </span>
            <span className={`${collapsed ? 'sr-only' : 'block'} max-w-full truncate text-sm font-medium text-white`}>
              {displayName}
            </span>
            <span className={`${collapsed ? 'sr-only' : 'mt-0.5 block'} max-w-full truncate text-[11px] text-white/70`}>
              Two-person private workspace
            </span>
            {collapsed ? <HeartHandshake className="mx-auto size-5 text-white/80" aria-hidden="true" /> : null}
          </span>
          {!collapsed ? <ChevronDown className="size-4 shrink-0 text-white/65" aria-hidden="true" /> : null}
        </Link>
      </div>

      <nav className="mt-5 min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
        {groups.map((group) => (
          <div className="mb-5" key={group.label}>
            <p className={`${collapsed ? 'sr-only' : 'mb-2 px-3'} text-[9px] font-bold uppercase tracking-[0.22em] text-white/65`}>
              {group.label}
            </p>
            <div className="space-y-1">
              {getRouteItems(group.items).map(({ path, navLabel, label, iconComponent: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={onNavigate}
                  title={collapsed ? navLabel || label : undefined}
                  aria-label={collapsed ? navLabel || label : undefined}
                  className={({ isActive }) =>
                    `group relative flex min-h-10 items-center ${collapsed ? 'justify-center px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d8e6]' : 'gap-3 px-3'} rounded-xl py-2.5 text-[13px] transition ${
                      isActive
                        ? 'bg-[#8f5168] text-white shadow-[0_8px_24px_rgba(143,81,104,0.24)]'
                        : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                    }`
                  }
                >
                  <Icon className="size-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <span className={collapsed ? 'sr-only' : 'flex-1'}>{navLabel || label}</span>
                  {collapsed ? (
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute left-[calc(100%+0.65rem)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#24131d] px-3 py-2 text-xs font-bold text-white shadow-xl ring-1 ring-white/15 group-hover:block group-focus-visible:block"
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

      <div className="shrink-0 border-t border-white/10 p-3">
        <p className={`${collapsed ? 'sr-only' : 'mb-2 px-3'} text-[9px] font-bold uppercase tracking-[0.22em] text-white/65`}>
          Account
        </p>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} rounded-xl bg-black/10 p-2.5`}>
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f7dde6] text-xs font-bold uppercase text-[#24131d]">
            {(displayName || 'A').slice(0, 1)}
          </div>
          <div className={collapsed ? 'sr-only' : 'min-w-0 flex-1'}>
            <p className="truncate text-xs font-medium text-white">Private reader</p>
            <p className="truncate text-[10px] text-white/70">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className={`${collapsed ? 'sr-only' : ''} inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white`}
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const menuButtonRef = useRef(null)
  const mobilePanelRef = useRef(null)
  const location = useLocation()
  const { approvedUser, user } = useAuth()
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

  return (
    <div className="cb-app-shell">
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden bg-[#24131d] transition-[width] duration-200 lg:block"
        style={{ width: sidebarCollapsed ? '84px' : '258px' }}
      >
        <SidebarContent
          collapsed={sidebarCollapsed}
          groups={desktopNavGroups}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-[#120a10]/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
            type="button"
          />
          <aside
            ref={mobilePanelRef}
            className="relative h-[100dvh] w-[min(20rem,calc(100vw-2rem))] overflow-hidden bg-[#24131d] shadow-2xl"
            aria-modal="true"
            role="dialog"
            aria-label="Navigation menu"
          >
            <button
              className="absolute right-3 top-3 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              type="button"
            >
              <X className="size-5" />
            </button>
            <SidebarContent groups={mobileMoreGroups} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div
        className="main-content min-w-0 transition-[padding] duration-200 lg:pl-[var(--shell-sidebar-width)]"
        style={{ '--shell-sidebar-width': sidebarCollapsed ? '84px' : '258px' }}
      >
        <header className="app-safe-top sticky top-0 z-20 border-b border-[#ead7df] bg-[#fff9fb]/90 px-4 py-3.5 backdrop-blur-xl sm:px-7 sm:py-4 lg:px-10">
          <div className="cb-page-container flex items-center gap-4">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-xl border border-[#ecd9e0] bg-white p-2.5 text-[#24131d] lg:hidden"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-serif text-xl sm:text-2xl">{currentRoute.title}</h1>
              <p className="mt-0.5 hidden text-xs text-[#6c5460] sm:block">{currentRoute.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className="hidden min-h-11 items-center gap-2 rounded-xl bg-[#8f5168] px-4 text-xs font-bold text-white shadow-[0_12px_28px_rgba(143,81,104,0.24)] transition hover:bg-[#7c4359] sm:inline-flex"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Add Memory
            </button>
            <div className="hidden items-center gap-2 rounded-full border border-[#ecd9e0] bg-white py-1.5 pl-2 pr-3 sm:flex">
              <span className="grid size-7 place-items-center rounded-full bg-[#f7dde6]">
                <Sparkles className="size-3.5 text-[#8f5168]" aria-hidden="true" />
              </span>
              <span className="max-w-[14rem] truncate text-[11px] font-semibold text-[#6b5460]">{displayName}</span>
            </div>
          </div>
        </header>

        <main className="px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-7 sm:pt-6 lg:px-10 lg:py-7">
          <div className="cb-page-container">
            <section className="mb-4 rounded-xl border border-[#ead7df] bg-white px-3 py-3 shadow-[0_4px_14px_rgba(84,53,67,0.035)] sm:px-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="grid gap-3 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] md:items-center">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">
                      {currentRoute.chapter || 'Private archive'}
                    </p>
                    <p className="mt-1 truncate text-sm font-bold text-[#24131d]">{currentRoute.navLabel || currentRoute.label}</p>
                    <p className="mt-0.5 text-xs text-[#6c5460]">{currentRoute.summary}</p>
                  </div>
                  <div className="min-w-0 border-t border-[#f2e7eb] pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Private scope</p>
                    <p className="mt-1 text-sm leading-5 text-[#4b3942]">
                      Couple-scoped data, protected auth, and owner-write boundaries stay intact while the shell is rebuilt.
                    </p>
                    <p className="mt-1 hidden text-xs leading-5 text-[#806572] sm:block">
                      This branch is rebuilding the shared interface system without changing Couple Book production on August 21, 2026.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Link
                    to="/profile"
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#ecd9e0] px-4 text-xs font-bold text-[#6b5460] hover:bg-[#fff5f8]"
                  >
                    Open Us
                  </Link>
                  <button
                    type="button"
                    onClick={() => setQuickAddOpen(true)}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#24131d] px-4 text-xs font-bold text-white hover:bg-[#3a2130] sm:hidden"
                  >
                    Add Memory
                  </button>
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
    </div>
  )
}
