export function ContractView({ model }) {
  const signatures = [model.signatures?.currentUser, model.signatures?.partner].filter(Boolean)
  return (
    <section className="contract-page">
      <header className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Relationship Contract</p>
          <h1 className="page-title">📜 Shared Relationship Contract</h1>
          <p className="page-subtitle">The agreed-upon core principles of our partnership.</p>
        </div>
      </header>
      <div className="glass-card card-utility contract-card-profile">
        <div className="contract-display-container">
          <div className="contract-clause"><div className="contract-clause-title">🤝 Pillar I: Mutual Respect</div><div className="contract-clause-desc">We commit to respecting each other's opinions, career goals, personal spaces, and individual uniqueness.</div></div>
          <div className="contract-clause"><div className="contract-clause-title">🔒 Pillar II: Absolute Trust</div><div className="contract-clause-desc">We pledge complete honesty, loyalty, and support.</div></div>
          <div className="contract-clause"><div className="contract-clause-title">💬 Pillar III: Open Communication</div><div className="contract-clause-desc">We communicate with vulnerability and transparency.</div></div>
          <div className="contract-clause"><div className="contract-clause-title">🚧 Pillar IV: Healthy Boundaries</div><div className="contract-clause-desc">We honor boundaries that support our well-being and individual growth.</div></div>
        </div>
        <div className="contract-status-box">
          {signatures.length > 0 ? signatures.map((record) => (
            <div className="signee-status" key={record.displayName}>
              <div className="signee-name">{record.displayName}</div>
              <span className="badge" style={{ background: record.status === 'signed' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.1)', color: record.status === 'signed' ? '#6ee7b7' : '#f87171' }}>{record.label}</span>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>{record.signedAtLabel}</div>
            </div>
          )) : null}
        </div>
      </div>
    </section>
  )
}
