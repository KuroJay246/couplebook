import { Link } from 'react-router-dom'

function joinClasses(...values) {
  return values.filter(Boolean).join(' ')
}

function PageHeaderActions({ actions }) {
  if (!Array.isArray(actions) || actions.length === 0) return null

  return (
    <div className="editorial-page-header-actions">
      {actions.map((action) => (
        <Link
          className={`button ${action.tone === 'secondary' ? 'button-secondary' : 'button-primary'}`}
          key={action.href}
          to={action.href}
        >
          {action.label}
        </Link>
      ))}
    </div>
  )
}

function EditorialPageHeader({
  actions = [],
  aside = null,
  className = '',
  description,
  eyebrow,
  folio,
  title,
  tone = 'chapter',
}) {
  return (
    <header className={joinClasses('hero-card', 'hero-card-compact', 'page-frame', 'editorial-page-header', `editorial-page-header-${tone}`, className)}>
      <div className="page-frame-meta">
        <span className="eyebrow">{eyebrow}</span>
        {folio ? <span className="folio-mark">{folio}</span> : null}
      </div>
      <div className="editorial-page-header-layout">
        <div className="editorial-page-header-copy">
          <h1>{title}</h1>
          <p>{description}</p>
          <PageHeaderActions actions={actions} />
        </div>
        {aside ? <aside className="editorial-page-header-aside">{aside}</aside> : null}
      </div>
    </header>
  )
}

export function ChapterHeader(props) {
  return <EditorialPageHeader {...props} tone="chapter" />
}

export function SharedSpaceHeader(props) {
  return <EditorialPageHeader {...props} tone="shared" />
}

export function UtilityPageHeader(props) {
  return <EditorialPageHeader {...props} tone="utility" />
}

function SectionAction({ action }) {
  if (!action) return null

  if (action.href) {
    return (
      <Link className={`button ${action.tone === 'secondary' ? 'button-secondary' : 'button-primary'}`} to={action.href}>
        {action.label}
      </Link>
    )
  }

  return (
    <button className={`button ${action.tone === 'secondary' ? 'button-secondary' : 'button-primary'}`} onClick={action.onClick} type="button">
      {action.label}
    </button>
  )
}

export function EditorialSection({
  action,
  as: Tag = 'section',
  children,
  className = '',
  description,
  eyebrow,
  title,
  tone = 'default',
}) {
  return (
    <Tag className={joinClasses('editorial-section', tone !== 'default' ? `editorial-section-${tone}` : '', className)}>
      <div className="editorial-section-heading">
        <div>
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <SectionAction action={action} />
      </div>
      {children}
    </Tag>
  )
}

export function UtilitySection({ tone = 'utility', ...props }) {
  return <EditorialSection {...props} tone={tone} />
}

export function SettingsGroup({ className = '', description, eyebrow = 'Planned', items = [], title, tone = 'default' }) {
  const headingId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  return (
    <section
      aria-labelledby={`settings-group-${headingId}`}
      className={joinClasses('settings-group', tone !== 'default' ? `settings-group-${tone}` : '', className)}
    >
      <div className="settings-group-header">
        <span className="folio-mark">{eyebrow}</span>
        <h3 id={`settings-group-${headingId}`}>{title}</h3>
        <p>{description}</p>
      </div>
      <ul className="settings-group-list">
        {items.map((item) => (
          <li className="settings-group-item" key={item.label}>
            <div>
              <strong>{item.label}</strong>
              <p>{item.description}</p>
            </div>
            {item.meta ? <span>{item.meta}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function QuietStatus({ className = '', description, eyebrow = 'Status', items = [], title, tone = 'default' }) {
  return (
    <aside className={joinClasses('quiet-status', tone !== 'default' ? `quiet-status-${tone}` : '', className)}>
      <div className="quiet-status-header">
        <span className="folio-mark">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {items.length > 0 ? (
        <ul className="quiet-status-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </aside>
  )
}

export function EditorialEmptyState({ description, support = null, title, titleAs: TitleTag = 'h2' }) {
  return (
    <div className="editorial-empty-state">
      <TitleTag>{title}</TitleTag>
      <p>{description}</p>
      {support ? <span className="state-support">{support}</span> : null}
    </div>
  )
}
