import { Link } from 'react-router-dom'

function RecentMemories({ section }) {
  const items = section.items || []
  return (
    <section className="glass-card card-story recent-memories-card dashboard-feature-card">
      <div className="recent-header">
        <div>
          <p className="dashboard-section-kicker">Latest Chapter</p>
          <h2 className="recent-title">Recent memories worth reopening</h2>
          <p className="dashboard-section-copy">The newest moments stay at the front so the book opens on what still feels closest.</p>
        </div>
        <Link className="btn btn-secondary recent-link-button" to="/timeline">View All</Link>
      </div>
      <div className="recent-list">
        {items.length > 0 ? items.map((item) => (
          <article className="recent-memory-item" key={item.id}>
            <span className="recent-memory-date">{item.dateLabel || 'Saved memory'}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        )) : (
          <p style={{ gridColumn: 'span 3', textAlign: 'center', color: 'var(--color-muted)', padding: '2rem 0' }}>
            No recent memories are ready yet.
          </p>
        )}
      </div>
    </section>
  )
}

function AnniversaryCard({ card, tone }) {
  return (
    <div className={`glass-card card-story anniversary-card ${tone}-side`}>
      <div className="anniversary-title">
        <span className="anniversary-owner">{tone === 'jaylan' ? '❤️' : '💜'} {card.label}</span>
        <span className="anniversary-date">{card.dateLabel || 'Date pending'}</span>
      </div>
      <div className="counter-grid">
        <div className="counter-box"><div className="counter-number">{String(card.duration.years).padStart(2, '0')}</div><div className="counter-unit">Yrs</div></div>
        <div className="counter-box"><div className="counter-number">{String(card.duration.months).padStart(2, '0')}</div><div className="counter-unit">Mth</div></div>
        <div className="counter-box"><div className="counter-number">{String(card.duration.days).padStart(2, '0')}</div><div className="counter-unit">Days</div></div>
        <div className="counter-box"><div className="counter-number">{String(card.duration.seconds).padStart(2, '0')}</div><div className="counter-unit">Sec</div></div>
      </div>
      <div style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '0.5rem', color: 'var(--color-muted)' }}>{card.totalDaysLabel}</div>
    </div>
  )
}

function Milestones({ section }) {
  const anniversaries = section.anniversaryCards || []
  const birthdays = section.birthdayCards || []
  return (
    <div className="dashboard-column dashboard-column--milestones">
      <div className="glass-card card-story">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-section-kicker">Milestones</p>
            <h3 className="dashboard-subtitle">Dual anniversary counters</h3>
            <p className="dashboard-section-copy">Relationship time stays present as supporting context.</p>
          </div>
        </div>
        <div className="anniversaries-container">
          {anniversaries.map((card, index) => (
            <AnniversaryCard card={card} key={card.id} tone={index === 0 ? 'jaylan' : 'omia'} />
          ))}
        </div>
      </div>
      <div className="glass-card card-story birthdays-card">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-section-kicker">Special Dates</p>
            <h3 className="dashboard-subtitle">Upcoming birthdays</h3>
          </div>
        </div>
        <div className="birthday-list">
          {birthdays.map((card, index) => (
            <div className={`birthday-row birthday-row--${index === 0 ? 'omia' : 'jaylan'}`} key={card.id}>
              <div className="birthday-copy">
                <div className={`birthday-title birthday-title--${index === 0 ? 'omia' : 'jaylan'}`}>{card.label}</div>
                <div className="birthday-meta">{card.dateLabel || 'Date pending'}</div>
              </div>
              <div className="birthday-countdown">
                <div className={`birthday-count birthday-count--${index === 0 ? 'omia' : 'jaylan'}`}>{card.countdownLabel}</div>
                <div className="birthday-age">{card.ageLabel}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SpecialMoments({ section }) {
  return (
    <div className="glass-card card-story special-moments-card">
      <div>
        <p className="dashboard-section-kicker">Special Pages</p>
        <h3 className="dashboard-subtitle">Moments with their own page</h3>
        <p className="dashboard-section-copy">Jump back into the birthday, Valentine, and confession spaces without digging through the full archive.</p>
      </div>
      <div className="special-moment-list">
        {(section.items || []).map((item) => (
          <Link className="special-moment-link" key={item.href} to={item.href}>
            <div className="special-moment-copy">
              <span className="special-moment-title">{item.title}</span>
              <span className="special-moment-subtitle">{item.description}</span>
            </div>
            <span className="special-moment-arrow">↗</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function DashboardView({ model }) {
  return (
    <section className="dashboard-page">
      <header className="page-header page-header--split">
        <div className="page-heading">
          <p className="page-eyebrow">Private Home</p>
          <h1 className="page-title">A place for the moments that still feel alive.</h1>
          <p className="page-subtitle">Your shared story, gallery, and relationship milestones stay together here in one protected keepsake space.</p>
        </div>
        <div className="page-actions">
          <span className="utility-chip">Approved couple app</span>
          <Link className="btn btn-secondary" to="/timeline">Open Story</Link>
        </div>
      </header>

      <div className="dashboard-grid">
        <section className="glass-card card-hero dashboard-story-band">
          <div className="dashboard-story-copy">
            <p className="dashboard-section-kicker">Story Entrance</p>
            <h2 className="dashboard-story-title">Pick up where your story left off.</h2>
            <p className="dashboard-story-text">This private home opens like the first page of your memory book: recent moments first, milestones close behind, and the sentimental pages always within reach.</p>
            <div className="dashboard-story-actions">
              <Link className="btn btn-primary" to="/timeline">Continue The Story</Link>
              <Link className="btn btn-secondary" to="/gallery">Open Gallery</Link>
            </div>
          </div>
          <div className="dashboard-story-aside">
            <span className="utility-chip">Private and approved only</span>
            <div className="dashboard-story-pill-list">
              <span className="dashboard-story-pill">Recent memories first</span>
              <span className="dashboard-story-pill">Milestones stay visible</span>
              <span className="dashboard-story-pill">Special pages stay close</span>
            </div>
          </div>
        </section>

        <RecentMemories section={model.recentMemories} />
        <div className="dashboard-column dashboard-column--support">
          <div className="glass-card card-utility clock-card">
            <p className="dashboard-section-kicker">Right Now</p>
            <div className="live-time">{model.hero.timestampLabel}</div>
            <div className="live-date">{model.hero.dateLabel}</div>
          </div>
          <SpecialMoments section={model.specialMoments} />
        </div>
        <Milestones section={model.milestones} />
        <section className="dashboard-nav-shell">
          <div className="dashboard-section-heading">
            <div>
              <p className="dashboard-section-kicker">Lower Navigation</p>
              <h3 className="dashboard-subtitle">Everything else stays one step down</h3>
            </div>
          </div>
          <div className="quick-nav-container">
            <Link className="glass-card card-utility nav-card" to="/timeline"><div className="nav-card-icon">📖</div><div className="nav-card-title">Memories Book</div></Link>
            <Link className="glass-card card-utility nav-card" to="/gallery"><div className="nav-card-icon">🖼️</div><div className="nav-card-title">Media Gallery</div></Link>
            <Link className="glass-card card-utility nav-card" to="/profile"><div className="nav-card-icon">👤</div><div className="nav-card-title">Profiles & Contract</div></Link>
            <Link className="glass-card card-utility nav-card" to="/settings"><div className="nav-card-icon">⚙️</div><div className="nav-card-title">Settings & Theme</div></Link>
          </div>
        </section>
      </div>
    </section>
  )
}
