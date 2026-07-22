import { Link } from 'react-router-dom'

function personTone(index) {
  return index === 0 ? 'jaylan' : 'omia'
}

function ProfileCard({ person, index }) {
  const tone = personTone(index)
  return (
    <div className={`glass-card card-story profile-card ${tone}-side`}>
      <div className="profile-avatar-container">
        <div className="profile-avatar" aria-hidden="true" />
      </div>
      <h2 className="profile-name">{person.displayName}</h2>
      <span className="badge" style={{ background: tone === 'jaylan' ? 'rgba(255, 74, 107, 0.15)' : 'rgba(139, 92, 246, 0.15)', color: tone === 'jaylan' ? 'var(--color-jaylan)' : 'var(--color-omia)', marginBottom: '1rem' }}>Partner</span>
      <p className="profile-bio">{person.bio || 'A personal note is waiting to be written.'}</p>
      <div className="profile-meta-list">
        {(person.details || []).slice(0, 3).map((detail) => (
          <div className="profile-meta-item" key={detail.key}>
            <span className="profile-meta-label">{detail.label}:</span>
            <span className="profile-meta-val">{detail.value || '-'}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} type="button">Edit Profile</button>
        <Link className="btn btn-primary" style={{ flex: 1 }} to="/favorites">View Favorites</Link>
      </div>
    </div>
  )
}

export function ProfileView({ model }) {
  return (
    <section className="profile-page">
      <header className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Shared Profile</p>
          <h1 className="page-title">👥 Relationship Profiles</h1>
          <p className="page-subtitle">Manage personal bios, shared preferences, and the relationship contract inside one paired space.</p>
        </div>
      </header>

      <div className="profiles-layout">
        {(model.people || []).map((person, index) => <ProfileCard index={index} key={person.id} person={person} />)}
        <div className="glass-card card-utility contract-card-profile">
          <h2 style={{ fontFamily: 'var(--font-accent)', fontWeight: 700, textAlign: 'center', marginBottom: '1rem' }}>📜 Shared Relationship Contract</h2>
          <p style={{ color: 'var(--color-secondary-text)', textAlign: 'center', fontSize: '0.85rem' }}>The agreed-upon core principles of our partnership.</p>
          <div className="contract-display-container">
            <div className="contract-clause"><div className="contract-clause-title">🤝 Pillar I: Mutual Respect</div><div className="contract-clause-desc">We commit to respecting each other's opinions, goals, personal spaces, and individual uniqueness.</div></div>
            <div className="contract-clause"><div className="contract-clause-title">🔒 Pillar II: Absolute Trust</div><div className="contract-clause-desc">We pledge honesty, loyalty, and support while guarding our commitments to one another.</div></div>
            <div className="contract-clause"><div className="contract-clause-title">💬 Pillar III: Open Communication</div><div className="contract-clause-desc">We communicate with vulnerability and transparency, listening to understand each other.</div></div>
            <div className="contract-clause"><div className="contract-clause-title">🚧 Pillar IV: Healthy Boundaries</div><div className="contract-clause-desc">We honor boundaries that support emotional, mental, and social well-being.</div></div>
          </div>
          <div className="contract-status-box">
            <div className="signee-status"><div className="signee-name">Jaylan</div><span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#6ee7b7' }}>Protected</span></div>
            <div className="signee-status"><div className="signee-name">Omia</div><span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>Pending</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}
