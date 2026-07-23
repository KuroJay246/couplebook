import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'

function personTone(index) {
  return index === 0 ? 'jaylan' : 'omia'
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

function isOwnerProfile(person, approvedUser) {
  const currentNames = [approvedUser?.username, approvedUser?.displayName, approvedUser?.profileName].map(normalizeName).filter(Boolean)
  return currentNames.includes(normalizeName(person.id)) || currentNames.includes(normalizeName(person.displayName))
}

function daysTogether(value) {
  if (!value) return null
  const start = new Date(value)
  if (Number.isNaN(start.getTime())) return null
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

function ProfileEditDialog({ onClose, onSave, person, status }) {
  const firstFieldRef = useRef(null)
  const [form, setForm] = useState(() => ({
    name: person?.displayName || '',
    bio: person?.bio || '',
    anniversaryView: person?.anniversaryView || 'dual',
    joinedDate: person?.joinedDate || '',
    birthday: person?.birthday || '',
  }))

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await onSave(form)
  }

  return createPortal(
    <dialog aria-labelledby="profile-edit-title" className="modal-overlay active faithful-modal-open" onCancel={onClose} open>
      <form className="modal-container faithful-edit-form" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h3 className="modal-title" id="profile-edit-title">Edit profile</h3>
          <button aria-label="Close profile form" className="modal-close" onClick={onClose} type="button">×</button>
        </div>
        <div className="modal-body">
          <label className="form-group">
            <span className="form-label">Display name</span>
            <input className="form-input" onChange={(event) => updateField('name', event.target.value)} ref={firstFieldRef} required type="text" value={form.name} />
          </label>
          <label className="form-group">
            <span className="form-label">Bio</span>
            <textarea className="form-textarea" onChange={(event) => updateField('bio', event.target.value)} rows={5} value={form.bio} />
          </label>
          <label className="form-group">
            <span className="form-label">Anniversary view</span>
            <select className="form-select" onChange={(event) => updateField('anniversaryView', event.target.value)} value={form.anniversaryView}>
              <option value="dual">Both perspectives</option>
              <option value="jaylan">Jaylan perspective</option>
              <option value="omia">Omia perspective</option>
            </select>
          </label>
          <label className="form-group">
            <span className="form-label">Joined date</span>
            <input className="form-input" onChange={(event) => updateField('joinedDate', event.target.value)} type="date" value={form.joinedDate || ''} />
          </label>
          <label className="form-group">
            <span className="form-label">Birthday</span>
            <input className="form-input" onChange={(event) => updateField('birthday', event.target.value)} type="date" value={form.birthday || ''} />
          </label>
          {status?.message ? <p className={`workflow-feedback ${status.kind === 'error' ? 'workflow-feedback-error' : 'workflow-feedback-success'}`} role="status">{status.message}</p> : null}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} type="button">Cancel</button>
          <button className="btn btn-primary" disabled={status?.saving} type="submit">{status?.saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </dialog>,
    document.body,
  )
}

function ProfileCard({ canEdit, onEdit, person, index }) {
  const tone = personTone(index)
  const togetherDays = daysTogether(person.joinedDate)
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
            <span className="profile-meta-val">{detail.value || 'Still to be added'}</span>
          </div>
        ))}
        {togetherDays !== null ? (
          <div className="profile-meta-item">
            <span className="profile-meta-label">Days together:</span>
            <span className="profile-meta-val">{togetherDays}</span>
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {canEdit ? <button className="btn btn-secondary" onClick={() => onEdit(person)} style={{ flex: 1 }} type="button">Edit Profile</button> : null}
        <Link className="btn btn-primary" style={{ flex: 1 }} to="/favorites">View Favorites</Link>
      </div>
    </div>
  )
}

export function ProfileView({ model, onRefresh }) {
  const writer = useOwnerWrite(onRefresh)
  const [editingPerson, setEditingPerson] = useState(null)
  const [status, setStatus] = useState({ kind: '', message: '', saving: false })
  const people = useMemo(() => {
    const basePeople = model.people || []
    if (!writer.approvedUser || basePeople.some((person) => isOwnerProfile(person, writer.approvedUser))) return basePeople
    const displayName = writer.approvedUser.displayName || writer.approvedUser.username || 'Jaylan'
    return [{
      id: writer.approvedUser.username || displayName,
      displayName,
      bio: '',
      anniversaryView: 'dual',
      joinedDate: '',
      birthday: '',
      details: [],
    }, ...basePeople]
  }, [model.people, writer.approvedUser])

  async function saveProfile(payload) {
    setStatus({ kind: '', message: '', saving: true })
    try {
      await writer.saveProfile(payload)
      setStatus({ kind: 'success', message: 'Profile saved.', saving: false })
      setEditingPerson(null)
    } catch (error) {
      setStatus({ kind: 'error', message: error?.message || 'Editing is temporarily unavailable.', saving: false })
    }
  }

  return (
    <section className="profile-page">
      <header className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Shared Profile</p>
          <h1 className="page-title">👥 Relationship Profiles</h1>
          <p className="page-subtitle">Keep both profiles, the relationship timeline, and your shared commitments together in one paired space.</p>
        </div>
      </header>

      <section className="glass-card card-utility faithful-summary-card">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-section-kicker">Relationship Snapshot</p>
            <h2 className="dashboard-subtitle">{model.relationship?.title || 'Shared profile'}</h2>
            <p className="dashboard-section-copy">{model.relationship?.summary}</p>
          </div>
        </div>
        <div className="faithful-stat-grid">
          <div className="faithful-stat-tile">
            <span className="faithful-stat-value">{people.length}</span>
            <span className="faithful-stat-label">profiles in view</span>
          </div>
          <div className="faithful-stat-tile">
            <span className="faithful-stat-value">{(model.relationship?.anniversaries || []).length}</span>
            <span className="faithful-stat-label">anniversary views</span>
          </div>
          <div className="faithful-stat-tile">
            <span className="faithful-stat-value">{(model.relationship?.milestones || []).length}</span>
            <span className="faithful-stat-label">milestones saved</span>
          </div>
        </div>
      </section>

      <div className="profiles-layout">
        {people.map((person, index) => (
          <ProfileCard
            canEdit={isOwnerProfile(person, writer.approvedUser)}
            index={index}
            key={person.id}
            onEdit={(nextPerson) => {
              setStatus({ kind: '', message: '', saving: false })
              setEditingPerson(nextPerson)
            }}
            person={person}
          />
        ))}
        <div className="glass-card card-utility contract-card-profile">
          <h2 style={{ fontFamily: 'var(--font-accent)', fontWeight: 700, textAlign: 'center', marginBottom: '1rem' }}>📜 Shared Relationship Contract</h2>
          <p style={{ color: 'var(--color-secondary-text)', textAlign: 'center', fontSize: '0.85rem' }}>A quick look at the promises, milestones, and next step back into the full agreement page.</p>
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
          <div className="faithful-inline-actions" style={{ justifyContent: 'center', marginTop: '1rem' }}>
            <Link className="btn btn-primary" to="/contract">Open Contract</Link>
            <Link className="btn btn-secondary" to="/favorites">View Shared Favorites</Link>
          </div>
        </div>
      </div>
      {status.message && !editingPerson ? <p className={`workflow-feedback ${status.kind === 'error' ? 'workflow-feedback-error' : 'workflow-feedback-success'}`} role="status">{status.message}</p> : null}
      {editingPerson ? <ProfileEditDialog onClose={() => setEditingPerson(null)} onSave={saveProfile} person={editingPerson} status={status} /> : null}
    </section>
  )
}
