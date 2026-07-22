import { Link } from 'react-router-dom'

function joinClasses(...values) {
  return values.filter(Boolean).join(' ')
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

function EditorialSection({
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

export function EditorialEmptyState({ description, support = null, title, titleAs: TitleTag = 'h2' }) {
  return (
    <div className="editorial-empty-state">
      <TitleTag>{title}</TitleTag>
      <p>{description}</p>
      {support ? <span className="state-support">{support}</span> : null}
    </div>
  )
}
