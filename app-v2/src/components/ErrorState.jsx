export function ErrorState({
  title = 'Something needs attention',
  description = 'This part of the protected shell is not ready yet.',
  actionLabel = '',
  onAction = null,
  children = null,
}) {
  return (
    <section className="state-card state-card-error" aria-live="polite">
      <div className="state-badge">Notice</div>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
      {actionLabel && typeof onAction === 'function' && (
        <button className="button button-secondary state-action" onClick={onAction} type="button">
          {actionLabel}
        </button>
      )}
    </section>
  )
}
