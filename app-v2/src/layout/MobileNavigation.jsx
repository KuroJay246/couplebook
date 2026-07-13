import { NavLink } from 'react-router-dom'

export function MobileNavigation({ items, onOpenMenu }) {
  const visibleItems = Array.isArray(items) ? items.slice(0, 4) : []

  return (
    <nav aria-label="Primary navigation" className="mobile-nav">
      {visibleItems.map((item) => (
        <NavLink
          key={item.path}
          className={({ isActive }) => `mobile-nav-link ${isActive ? 'mobile-nav-link-active' : ''}`}
          to={item.path}
        >
          <strong>{item.shortLabel}</strong>
          <span>{item.label}</span>
        </NavLink>
      ))}
      <button aria-label="Open full navigation" className="mobile-nav-link" onClick={onOpenMenu} type="button">
        <strong>More</strong>
        <span>Menu</span>
      </button>
    </nav>
  )
}
