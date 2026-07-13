import { EmptyState } from './EmptyState'

export function PlaceholderPage({ eyebrow, title, description }) {
  return (
    <section className="page-stack">
      <header className="hero-card hero-card-compact">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <EmptyState />
    </section>
  )
}
