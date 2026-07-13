export function LoadingState({ title = 'Loading private space', description = 'Preparing the protected Couple Book shell.' }) {
  return (
    <section className="state-card" aria-live="polite">
      <div className="state-badge">Loading</div>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  )
}
