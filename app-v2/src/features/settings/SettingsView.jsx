import { useState } from 'react'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'

const PANELS = [
  { key: 'appearance', label: '🎨 Appearance & Theme' },
  { key: 'anniversary', label: '💞 Anniversary Config' },
  { key: 'privacy', label: '🔒 Privacy & Security' },
  { key: 'accounts', label: '🔐 Account Management' },
  { key: 'data', label: '💾 Data Management' },
]

const THEMES = [
  { key: 'paper', label: 'Glassmorphism Dark' },
  { key: 'rose', label: 'Crisp Light' },
  { key: 'olive', label: 'Warm Sunset' },
  { key: 'plum', label: 'Kuromi Gothic' },
]

export function SettingsView({ model, onRefresh }) {
  const [active, setActive] = useState('appearance')
  const writer = useOwnerWrite(onRefresh)
  const [form, setForm] = useState(() => ({
    theme: model.appearance?.preservedTheme?.value || 'paper',
    anniversaryView: model.appearance?.anniversaryView?.value || 'dual',
    localOnlyMode: model.appearance?.privacy?.localOnlyMode === true,
    reducedMotion: model.appearance?.privacy?.reducedMotion === true,
  }))
  const [status, setStatus] = useState({ kind: '', message: '', saving: false })

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function saveSettings(event) {
    event.preventDefault()
    setStatus({ kind: '', message: '', saving: true })
    try {
      await writer.saveSettings(form)
      setStatus({ kind: 'success', message: 'Settings saved.', saving: false })
    } catch (error) {
      setStatus({ kind: 'error', message: error?.message || 'Editing is temporarily unavailable.', saving: false })
    }
  }

  return (
    <section className="settings-page">
      <header className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Care And Privacy</p>
          <h1 className="page-title">⚙️ Application Settings</h1>
          <p className="page-subtitle">Adjust themes, preferences, and account visibility details without changing the private app boundaries.</p>
        </div>
      </header>
      <div className="settings-grid">
        <div className="settings-menu">
          {PANELS.map((panel) => (
            <button className={`settings-menu-item ${active === panel.key ? 'active' : ''}`} key={panel.key} onClick={() => setActive(panel.key)} type="button">{panel.label}</button>
          ))}
        </div>
        <form className="glass-card card-utility settings-panel-shell" onSubmit={saveSettings}>
          <div className={`settings-panel ${active === 'appearance' ? 'active' : ''}`}>
            <h3 style={{ fontFamily: 'var(--font-accent)', marginBottom: '0.5rem' }}>Appearance Theme</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary-text)', marginBottom: '1.25rem' }}>Change how MemoryBook looks on your device.</p>
            <div className="theme-picker-grid">
              {THEMES.map((theme) => (
                <button aria-pressed={form.theme === theme.key} className={`theme-card-option ${form.theme === theme.key ? 'active' : ''}`} key={theme.key} onClick={() => updateField('theme', theme.key)} type="button"><div className="theme-preview-color"><div className="color-dot" style={{ background: '#ff4a6b' }} /><div className="color-dot" style={{ background: '#8b5cf6' }} /><div className="color-dot" style={{ background: '#0a0c10', border: '1.5px solid var(--border-glass)' }} /></div><div className="theme-card-option-name">{theme.label}</div></button>
              ))}
            </div>
          </div>
          <div className={`settings-panel ${active === 'anniversary' ? 'active' : ''}`}>
            <h3 style={{ fontFamily: 'var(--font-accent)', marginBottom: '0.5rem' }}>Anniversary View Preference</h3>
            <div className="form-group"><label className="form-label" htmlFor="setting-anniversary-view">Primary Dashboard View</label><select className="form-select" id="setting-anniversary-view" onChange={(event) => updateField('anniversaryView', event.target.value)} value={form.anniversaryView}><option value="dual">Show Both Perspectives</option><option value="jaylan">Jaylan's View</option><option value="omia">Omia's View</option></select></div>
          </div>
          <div className={`settings-panel ${active === 'privacy' ? 'active' : ''}`}>
            <h3 style={{ fontFamily: 'var(--font-accent)', marginBottom: '0.5rem' }}>Privacy Toggles</h3>
            {[
              { key: 'localOnlyMode', label: 'Keep private reads on this device', description: 'Helpful when reviewing Couple Book on a trusted browser.' },
              { key: 'reducedMotion', label: 'Reduce motion', description: 'Keep transitions quieter while preserving the approved look.' },
            ].map((item) => {
              const label = item.label
              const id = `setting-${label.toLowerCase().replaceAll(' ', '-')}`
              return (
                <div className="toggle-item" key={label}>
                  <div className="toggle-label-container">
                    <span className="toggle-title" id={`${id}-label`}>{label}</span>
                    <span className="toggle-desc">{item.description}</span>
                  </div>
                  <label className="switch" htmlFor={id}>
                    <input aria-labelledby={`${id}-label`} checked={form[item.key]} id={id} onChange={(event) => updateField(item.key, event.target.checked)} type="checkbox" />
                    <span className="slider" />
                  </label>
                </div>
              )
            })}
          </div>
          <div className={`settings-panel ${active === 'accounts' ? 'active' : ''}`}>
            <h3 style={{ fontFamily: 'var(--font-accent)', marginBottom: '0.5rem' }}>Account Management</h3>
            <div className="glass-card card-utility settings-subcard"><h4>{model.account.displayName}</h4><p style={{ color: 'var(--color-secondary-text)' }}>{model.account.note}</p></div>
          </div>
          <div className={`settings-panel ${active === 'data' ? 'active' : ''}`}>
            <h3 style={{ fontFamily: 'var(--font-accent)', marginBottom: '0.5rem', color: '#ef4444' }}>Restricted Account Controls</h3>
            <div className="glass-card card-utility settings-subcard danger-card"><h4>Protected Account Management</h4><p style={{ color: 'var(--color-secondary-text)' }}>Destructive cloud cleanup is intentionally blocked in the browser.</p></div>
          </div>
          <div className="workflow-actions">
            <button className="btn btn-primary" disabled={status.saving} type="submit">{status.saving ? 'Saving...' : 'Save Settings'}</button>
          </div>
          {status.message ? <p className={`workflow-feedback ${status.kind === 'error' ? 'workflow-feedback-error' : 'workflow-feedback-success'}`} role="status">{status.message}</p> : null}
        </form>
      </div>
    </section>
  )
}
