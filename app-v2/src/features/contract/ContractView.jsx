import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'

export function ContractView({ model, onRefresh }) {
  const writer = useOwnerWrite(onRefresh)
  const [status, setStatus] = useState({ kind: '', message: '', saving: false })
  const currentAcceptance = model.acceptance?.currentUser
  const accepted = currentAcceptance?.status === 'accepted'
  const agreementSections = model.agreement?.sections || []
  const history = model.history || []
  const acceptanceCards = [model.acceptance?.currentUser, model.acceptance?.partner].filter(Boolean)

  async function handleAccept() {
    if (accepted) return
    if (!window.confirm('Record your acceptance of the relationship contract?')) return
    setStatus({ kind: '', message: '', saving: true })
    try {
      await writer.acceptContract()
      setStatus({ kind: 'success', message: 'Contract acceptance recorded.', saving: false })
    } catch (error) {
      setStatus({ kind: 'error', message: error?.message || 'Editing is temporarily unavailable.', saving: false })
    }
  }

  return (
    <section className="contract-page">
      <header className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Relationship Contract</p>
          <h1 className="page-title">📜 Shared Relationship Contract</h1>
          <p className="page-subtitle">The promises you are keeping, the current status of each record, and the agreement history that is safe to show here.</p>
        </div>
      </header>
      <div className="glass-card card-utility contract-card-profile">
        {model.agreement?.version ? (
          <div className="faithful-chip-list" style={{ marginBottom: '1rem' }}>
            <span className="utility-chip">Version {model.agreement.version}</span>
            <span className="utility-chip">{accepted ? 'Your acceptance is recorded' : 'Waiting on your acceptance'}</span>
          </div>
        ) : null}
        <div className="contract-display-container">
          {agreementSections.length > 0 ? agreementSections.map((section) => (
            <div className="contract-clause" key={section.id}>
              <div className="contract-clause-title">{section.heading}</div>
              {section.paragraphs?.map((paragraph) => <div className="contract-clause-desc" key={paragraph}>{paragraph}</div>)}
              {section.clauses?.length > 0 ? (
                <ul className="special-page-list">
                  {section.clauses.map((clause) => <li key={clause}>{clause}</li>)}
                </ul>
              ) : null}
            </div>
          )) : (
            <>
              <div className="contract-clause"><div className="contract-clause-title">🤝 Pillar I: Mutual Respect</div><div className="contract-clause-desc">We commit to respecting each other's opinions, career goals, personal spaces, and individual uniqueness.</div></div>
              <div className="contract-clause"><div className="contract-clause-title">🔒 Pillar II: Absolute Trust</div><div className="contract-clause-desc">We pledge complete honesty, loyalty, and support.</div></div>
              <div className="contract-clause"><div className="contract-clause-title">💬 Pillar III: Open Communication</div><div className="contract-clause-desc">We communicate with vulnerability and transparency.</div></div>
              <div className="contract-clause"><div className="contract-clause-title">🚧 Pillar IV: Healthy Boundaries</div><div className="contract-clause-desc">We honor boundaries that support our well-being and individual growth.</div></div>
            </>
          )}
        </div>
        <div className="contract-status-box">
          {acceptanceCards.length > 0 ? acceptanceCards.map((record) => (
            <div className="signee-status" key={record.displayName}>
              <div className="signee-name">{record.displayName}</div>
              <span className="badge" style={{ background: record.status === 'accepted' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.1)', color: record.status === 'accepted' ? '#6ee7b7' : '#f87171' }}>{record.label}</span>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>{record.acceptedAtLabel}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-secondary-text)', marginTop: '0.35rem' }}>{record.note}</div>
            </div>
          )) : null}
        </div>
        {history.length > 0 ? (
          <div className="glass-card card-utility faithful-summary-card" style={{ marginTop: '1rem' }}>
            <p className="dashboard-section-kicker">Agreement History</p>
            <div className="faithful-list">
              {history.slice(0, 4).map((entry) => (
                <div className="faithful-list-row" key={entry.id}>
                  <div>
                    <strong>{entry.actorDisplayName}</strong>
                    <div className="faithful-empty-copy">{entry.title}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div>{entry.dateLabel}</div>
                    <div className="faithful-empty-copy">{entry.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="actions" style={{ marginTop: '1rem' }}>
          <button className="btn btn-primary" disabled={accepted || status.saving} onClick={handleAccept} type="button">
            {accepted ? 'Accepted' : status.saving ? 'Saving...' : 'Accept Contract'}
          </button>
          <Link className="btn btn-secondary" to="/profile">Back to Profiles</Link>
        </div>
        {status.message ? <p className={`workflow-feedback ${status.kind === 'error' ? 'workflow-feedback-error' : 'workflow-feedback-success'}`} role="status">{status.message}</p> : null}
      </div>
    </section>
  )
}
