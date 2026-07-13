export function ErrorState({ title = 'Something needs attention', description = 'This part of the migration shell is not ready yet.' }) {
  return (
    <section className="state-card state-card-error" aria-live="polite">
      <div className="state-badge">Blocked</div>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  )
}
