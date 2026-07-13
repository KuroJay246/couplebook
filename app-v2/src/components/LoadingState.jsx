export function LoadingState({
  title = 'Opening the private archive',
  description = 'Checking sign-in and preparing the protected shell.',
}) {
  return (
    <section className="state-card" aria-live="polite">
      <div className="state-badge">Preparing</div>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  )
}
