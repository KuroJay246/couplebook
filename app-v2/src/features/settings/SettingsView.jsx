import { useState } from 'react'

const PANELS = [
  { key: 'appearance', label: '🎨 Appearance & Theme' },
  { key: 'anniversary', label: '💞 Anniversary Config' },
  { key: 'privacy', label: '🔒 Privacy & Security' },
  { key: 'accounts', label: '🔐 Account Management' },
  { key: 'data', label: '💾 Data Management' },
]

export function SettingsView({ model }) {
  const [active, setActive] = useState('appearance')
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
        <div className="glass-card card-utility settings-panel-shell">
          <div className={`settings-panel ${active === 'appearance' ? 'active' : ''}`}>
            <h3 style={{ fontFamily: 'var(--font-accent)', marginBottom: '0.5rem' }}>Appearance Theme</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary-text)', marginBottom: '1.25rem' }}>Change how MemoryBook looks on your device.</p>
            <div className="theme-picker-grid">
              {['Glassmorphism Dark', 'Crisp Light', 'Warm Sunset', 'Kuromi Gothic'].map((theme) => (
                <div className="theme-card-option" key={theme}><div className="theme-preview-color"><div className="color-dot" style={{ background: '#ff4a6b' }} /><div className="color-dot" style={{ background: '#8b5cf6' }} /><div className="color-dot" style={{ background: '#0a0c10', border: '1.5px solid var(--border-glass)' }} /></div><div className="theme-card-option-name">{theme}</div></div>
              ))}
            </div>
          </div>
          <div className={`settings-panel ${active === 'anniversary' ? 'active' : ''}`}>
            <h3 style={{ fontFamily: 'var(--font-accent)', marginBottom: '0.5rem' }}>Anniversary View Preference</h3>
            <div className="form-group"><label className="form-label" htmlFor="setting-anniversary-view">Primary Dashboard View</label><select className="form-select" id="setting-anniversary-view" defaultValue={model.appearance?.anniversaryView?.value || 'dual'}><option value="dual">Show Both Perspectives</option><option value="jaylan">Jaylan's View</option><option value="omia">Omia's View</option></select></div>
          </div>
          <div className={`settings-panel ${active === 'privacy' ? 'active' : ''}`}>
            <h3 style={{ fontFamily: 'var(--font-accent)', marginBottom: '0.5rem' }}>Privacy Toggles</h3>
            {['Private approved access only', 'Browser storage cannot sign you in'].map((label) => <div className="toggle-item" key={label}><div className="toggle-label-container"><span className="toggle-title">{label}</span><span className="toggle-desc">Protected by the current Firebase session.</span></div><label className="switch"><input checked readOnly type="checkbox" /><span className="slider" /></label></div>)}
          </div>
          <div className={`settings-panel ${active === 'accounts' ? 'active' : ''}`}>
            <h3 style={{ fontFamily: 'var(--font-accent)', marginBottom: '0.5rem' }}>Account Management</h3>
            <div className="glass-card card-utility settings-subcard"><h4>{model.account.displayName}</h4><p style={{ color: 'var(--color-secondary-text)' }}>{model.account.note}</p></div>
          </div>
          <div className={`settings-panel ${active === 'data' ? 'active' : ''}`}>
            <h3 style={{ fontFamily: 'var(--font-accent)', marginBottom: '0.5rem', color: '#ef4444' }}>Restricted Account Controls</h3>
            <div className="glass-card card-utility settings-subcard danger-card"><h4>Protected Account Management</h4><p style={{ color: 'var(--color-secondary-text)' }}>Destructive cloud cleanup is intentionally blocked in the browser.</p></div>
          </div>
        </div>
      </div>
    </section>
  )
}
