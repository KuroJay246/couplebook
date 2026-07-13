export function EmptyState({
  title = 'This part of the book is still being prepared.',
  description = 'The protected frame is ready, but the archived content has not been connected here yet.',
}) {
  return (
    <section className="state-card state-card-empty">
      <div className="state-badge">In progress</div>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  )
}
