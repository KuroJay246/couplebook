import { Link } from 'react-router-dom'
import { EmptyState } from './ui/EmptyState.jsx'

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
    <Tag className={joinClasses('rounded-[24px] border border-[#ead7df] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]', tone !== 'default' ? `editorial-section-${tone}` : '', className)}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow ? <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">{eyebrow}</span> : null}
          <h2 className="mt-2 font-serif text-3xl text-[#24131d]">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7a6170]">{description}</p> : null}
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
    <div>
      <EmptyState title={title} description={description} />
      {support ? <p className="mt-4 text-center text-xs text-[#8a6f7c]">{support}</p> : null}
      <TitleTag className="sr-only">{title}</TitleTag>
    </div>
  )
}
