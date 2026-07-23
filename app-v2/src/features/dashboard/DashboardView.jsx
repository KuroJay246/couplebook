import { Link } from 'react-router-dom'

function parseDateLabel(value) {
  const parsed = Date.parse(value || '')
  return Number.isNaN(parsed) ? null : new Date(parsed)
}

function buildOnThisDay(items = []) {
  const now = new Date()
  return items.find((item) => {
    const date = parseDateLabel(item.dateLabel)
    return date && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  }) || null
}

function RecentMemories({ section }) {
  const items = section.items || []
  const onThisDay = buildOnThisDay(items)
  return (
    <section className="glass-card card-story recent-memories-card dashboard-feature-card">
      <div className="recent-header">
        <div>
          <p className="dashboard-section-kicker">Latest Chapter</p>
          <h2 className="recent-title">Recent memories worth reopening</h2>
          <p className="dashboard-section-copy">The newest moments stay close, with one quick path back to the wider story when you want it.</p>
        </div>
        <Link className="btn btn-secondary recent-link-button" to="/timeline">View All</Link>
      </div>
      {onThisDay ? (
        <div className="glass-card card-utility faithful-summary-card" style={{ marginBottom: '1rem' }}>
          <p className="dashboard-section-kicker">On This Day</p>
          <h3 className="dashboard-subtitle" style={{ marginBottom: '0.35rem' }}>{onThisDay.title}</h3>
          <p className="dashboard-section-copy" style={{ marginBottom: 0 }}>{onThisDay.description}</p>
        </div>
      ) : null}
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

function RelationshipSummary({ model }) {
  const summary = [
    { label: 'Memories saved', value: model.recentMemories?.totalCount || 0 },
    { label: 'Special pages', value: (model.specialMoments?.items || []).length },
    { label: 'Birthday reminders', value: (model.milestones?.birthdayCards || []).length },
  ]

  return (
    <section className="glass-card card-utility faithful-summary-card">
      <div className="dashboard-section-heading">
        <div>
          <p className="dashboard-section-kicker">Relationship Summary</p>
          <h3 className="dashboard-subtitle">What feels closest right now</h3>
          <p className="dashboard-section-copy">Quick access to the pages you are most likely to reopen.</p>
        </div>
      </div>
      <div className="faithful-stat-grid">
        {summary.map((item) => (
          <div className="faithful-stat-tile" key={item.label}>
            <span className="faithful-stat-value">{item.value}</span>
            <span className="faithful-stat-label">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="faithful-inline-actions">
        <Link className="btn btn-primary" to="/favorites">Open Favorites</Link>
        <Link className="btn btn-secondary" to="/contract">Open Contract</Link>
      </div>
    </section>
  )
}

export function DashboardView({ model }) {
  return (
    <section className="dashboard-page">
      <header className="page-header page-header--split">
        <div className="page-heading">
          <p className="page-eyebrow">Private Home</p>
          <h1 className="page-title">A place for the moments that still feel alive.</h1>
          <p className="page-subtitle">Your shared story, gallery, favorite things, and relationship milestones stay together here in one personal keepsake space.</p>
        </div>
        <div className="page-actions">
          <span className="utility-chip">Shared home</span>
          <Link className="btn btn-secondary" to="/timeline">Open Story</Link>
        </div>
      </header>

      <div className="dashboard-grid">
        <section className="glass-card card-hero dashboard-story-band">
          <div className="dashboard-story-copy">
            <p className="dashboard-section-kicker">Story Entrance</p>
            <h2 className="dashboard-story-title">Pick up where your story left off.</h2>
            <p className="dashboard-story-text">This private home opens like the first page of your memory book: recent moments first, upcoming dates close behind, and the sentimental pages always within reach.</p>
            <div className="dashboard-story-actions">
              <Link className="btn btn-primary" to="/timeline">Continue The Story</Link>
              <Link className="btn btn-secondary" to="/gallery">Open Gallery</Link>
              <Link className="btn btn-secondary" to="/favorites">Favorite Things</Link>
            </div>
          </div>
          <div className="dashboard-story-aside">
            <span className="utility-chip">Warm, private, and personal</span>
            <div className="dashboard-story-pill-list">
              <span className="dashboard-story-pill">Recent memories first</span>
              <span className="dashboard-story-pill">Upcoming dates stay visible</span>
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
          <RelationshipSummary model={model} />
          <SpecialMoments section={model.specialMoments} />
        </div>
        <Milestones section={model.milestones} />
        <section className="dashboard-nav-shell">
          <div className="dashboard-section-heading">
            <div>
              <p className="dashboard-section-kicker">Quick Access</p>
              <h3 className="dashboard-subtitle">Everything important stays one step away</h3>
            </div>
          </div>
          <div className="quick-nav-container">
            <Link className="glass-card card-utility nav-card" to="/timeline"><div className="nav-card-icon">📖</div><div className="nav-card-title">Memories Book</div></Link>
            <Link className="glass-card card-utility nav-card" to="/gallery"><div className="nav-card-icon">🖼️</div><div className="nav-card-title">Media Gallery</div></Link>
            <Link className="glass-card card-utility nav-card" to="/profile"><div className="nav-card-icon">👤</div><div className="nav-card-title">Profiles & Contract</div></Link>
            <Link className="glass-card card-utility nav-card" to="/settings"><div className="nav-card-icon">⚙️</div><div className="nav-card-title">Settings & Theme</div></Link>
            <Link className="glass-card card-utility nav-card" to="/birthday"><div className="nav-card-icon">🎂</div><div className="nav-card-title">Birthday Page</div></Link>
            <Link className="glass-card card-utility nav-card" to="/valentine"><div className="nav-card-icon">💌</div><div className="nav-card-title">Valentine Page</div></Link>
            <Link className="glass-card card-utility nav-card" to="/confession"><div className="nav-card-icon">💖</div><div className="nav-card-title">Confession Page</div></Link>
          </div>
        </section>
      </div>
    </section>
  )
}
