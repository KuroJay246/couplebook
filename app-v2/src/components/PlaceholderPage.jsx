import { EmptyState } from './EmptyState'

export function PlaceholderPage({ eyebrow, title, description }) {
  return (
    <section className="page-stack">
      <header className="hero-card hero-card-compact page-frame">
        <div className="page-frame-meta">
          <span className="eyebrow">{eyebrow}</span>
          <span className="folio-mark">Migration placeholder</span>
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <EmptyState
        title="This page is ready for the next chapter."
        description="Its protected frame is in place, but the real content has not been connected here yet."
      />
    </section>
  )
}
