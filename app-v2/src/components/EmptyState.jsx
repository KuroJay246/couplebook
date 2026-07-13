export function EmptyState({ title = 'Nothing here yet', description = 'This route is waiting for the compatibility layer and page migration.' }) {
  return (
    <section className="state-card state-card-empty">
      <div className="state-badge">Soon</div>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  )
}
