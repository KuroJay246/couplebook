import { Link } from 'react-router-dom'

function SectionHeader({ action, description, eyebrow, title }) {
  return (
    <div className="dashboard-section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? (
        <Link className={`button ${action.tone === 'secondary' ? 'button-secondary' : 'button-primary'}`} to={action.href}>
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}

function renderCompatibilityStateLabel(compatibilityState) {
  if (compatibilityState === 'loading') return 'Refreshing'
  if (compatibilityState === 'error') return 'Needs review'
  if (compatibilityState === 'ready') return 'Ready'
  return 'Partial'
}

function RecentMemoriesSection({ section }) {
  return (
    <section className="dashboard-panel dashboard-panel-recent">
      <SectionHeader
        action={section.action}
        description={section.description}
        eyebrow={section.eyebrow}
        title={section.title}
      />

      {section.state === 'ready' && section.items.length > 0 ? (
        <ul className="memory-card-list">
          {section.items.map((item) => (
            <li className="memory-card" key={item.id}>
              <div className="memory-card-meta">
                <span className="memory-card-date">{item.dateLabel || 'Undated'}</span>
                <span className="memory-card-kind">{item.mediaKind === 'video' ? 'Video memory' : 'Memory note'}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <span className="memory-card-footnote">{item.mediaLabel}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="dashboard-empty-block">
          <h3>{section.emptyState.title}</h3>
          <p>{section.emptyState.description}</p>
        </div>
      )}
    </section>
  )
}

function AnniversaryCard({ card }) {
  return (
    <article className="milestone-card" key={card.id}>
      <div className="milestone-card-header">
        <strong>{card.label}</strong>
        <span>{card.dateLabel || 'Date pending'}</span>
      </div>
      <div className="milestone-counter-grid">
        <div className="milestone-counter-box">
          <span>{String(card.duration.years).padStart(2, '0')}</span>
          <small>Years</small>
        </div>
        <div className="milestone-counter-box">
          <span>{String(card.duration.months).padStart(2, '0')}</span>
          <small>Months</small>
        </div>
        <div className="milestone-counter-box">
          <span>{String(card.duration.days).padStart(2, '0')}</span>
          <small>Days</small>
        </div>
        <div className="milestone-counter-box">
          <span>{String(card.duration.seconds).padStart(2, '0')}</span>
          <small>Seconds</small>
        </div>
      </div>
      <p className="milestone-summary">{card.totalDaysLabel}</p>
    </article>
  )
}

function BirthdayCard({ card }) {
  return (
    <li className="birthday-card" key={card.id}>
      <div>
        <strong>{card.label}</strong>
        <span>{card.dateLabel || 'Date pending'}</span>
      </div>
      <div className="birthday-card-countdown">
        <strong>{card.countdownLabel}</strong>
        <span>{card.ageLabel}</span>
      </div>
    </li>
  )
}

function MilestonesSection({ section }) {
  return (
    <section className="dashboard-panel dashboard-panel-milestones">
      <SectionHeader description={section.description} eyebrow={section.eyebrow} title={section.title} />

      {section.hasContent ? (
        <div className="milestone-stack">
          {section.anniversaryCards.length > 0 ? (
            <div className="milestone-group">
              <div className="milestone-group-heading">
                <h3>Anniversary views</h3>
                <p>Relationship time stays present without becoming the first thing the page says.</p>
              </div>
              <div className="milestone-card-grid">
                {section.anniversaryCards.map((card) => (
                  <AnniversaryCard card={card} key={card.id} />
                ))}
              </div>
            </div>
          ) : null}

          {section.birthdayCards.length > 0 ? (
            <div className="milestone-group">
              <div className="milestone-group-heading">
                <h3>Upcoming birthdays</h3>
                <p>Special dates stay visible here while the surrounding profile surfaces continue to migrate.</p>
              </div>
              <ul className="birthday-card-list">
                {section.birthdayCards.map((card) => (
                  <BirthdayCard card={card} key={card.id} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="dashboard-empty-block">
          <h3>{section.emptyState.title}</h3>
          <p>{section.emptyState.description}</p>
        </div>
      )}
    </section>
  )
}

function SpecialMomentsSection({ section }) {
  return (
    <section className="dashboard-panel dashboard-panel-special">
      <SectionHeader description={section.description} eyebrow={section.eyebrow} title={section.title} />
      <div className="story-link-list">
        {section.items.map((item) => (
          <Link className="story-link-card" key={item.href} to={item.href}>
            <div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </div>
            <span className="story-link-arrow" aria-hidden="true">
              {">"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function SourceStateSection({ compatibilityError, compatibilityState, onRefresh, section }) {
  return (
    <section className="dashboard-panel dashboard-panel-source">
      <SectionHeader description={section.description} eyebrow={section.eyebrow} title={section.title} />

      <div className="source-status-toolbar">
        <div className="source-status-copy">
          <span className="source-status-pill">{renderCompatibilityStateLabel(compatibilityState)}</span>
          <p>Read-only legacy inputs remain explicit while this Dashboard route is migrated.</p>
        </div>
        <button className="button button-secondary" onClick={onRefresh} type="button">
          Refresh reads
        </button>
      </div>

      {compatibilityError ? (
        <div className="dashboard-inline-alert">
          <strong>Compatibility refresh issue</strong>
          <p>{compatibilityError}</p>
        </div>
      ) : null}

      <div className="source-status-grid">
        {section.items.map((item) => (
          <article className="source-card" key={item.key}>
            <div className="source-card-header">
              <strong>{item.title}</strong>
              <span className={`source-card-status source-card-status-${item.status}`}>{item.status}</span>
            </div>
            <p>{item.summary}</p>
            <div className="source-card-meta">
              <span>{item.sourceLabel}</span>
              <span>{item.warningCount} warnings</span>
            </div>
          </article>
        ))}
      </div>

      {section.warnings.length > 0 ? (
        <div className="warning-ledger">
          <h3>Current warnings</h3>
          <ul>
            {section.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

function SupportingNavigationSection({ section }) {
  return (
    <section className="dashboard-panel dashboard-panel-supporting">
      <SectionHeader description={section.description} eyebrow={section.eyebrow} title={section.title} />
      <div className="supporting-link-grid">
        {section.items.map((item) => (
          <Link className="supporting-link-card" key={item.href} to={item.href}>
            <span className="supporting-link-label">{item.label}</span>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function DashboardView({ compatibilityError, compatibilityState, model, onRefresh }) {
  return (
    <section className="dashboard-page">
      <header className="hero-card hero-card-compact page-frame dashboard-hero">
        <div className="page-frame-meta">
          <span className="eyebrow">{model.hero.eyebrow}</span>
          <span className="folio-mark">{model.hero.dateLabel}</span>
        </div>
        <div className="dashboard-hero-layout">
          <div className="dashboard-hero-copy">
            <h1>{model.hero.title}</h1>
            <p>{model.hero.description}</p>
            <div className="dashboard-hero-actions">
              {model.hero.actions.map((action) => (
                <Link
                  className={`button ${action.tone === 'secondary' ? 'button-secondary' : 'button-primary'}`}
                  key={action.href}
                  to={action.href}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
          <aside className="dashboard-hero-aside">
            <div className="dashboard-now-card">
              <span className="folio-mark">Right now</span>
              <strong>{model.hero.timestampLabel}</strong>
              <p>{model.hero.dateLabel}</p>
            </div>
            <ul className="dashboard-note-list">
              {model.hero.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </aside>
        </div>
      </header>

      <div className="dashboard-grid">
        <RecentMemoriesSection section={model.recentMemories} />
        <MilestonesSection section={model.milestones} />
        <SpecialMomentsSection section={model.specialMoments} />
        <SourceStateSection
          compatibilityError={compatibilityError}
          compatibilityState={compatibilityState}
          onRefresh={onRefresh}
          section={model.sourceState}
        />
        <SupportingNavigationSection section={model.supportingNavigation} />
      </div>
    </section>
  )
}
