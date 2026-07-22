import { Link } from 'react-router-dom'
import { getSpecialMomentConfig } from './specialMomentConfig.js'
import { useSpecialMomentContent } from './useSpecialMomentContent.js'

const COPY = {
  birthday: {
    className: 'special-page-birthday',
    badge: '🎂',
    title: 'Birthday Page',
    fallback: 'A private birthday chapter from the legacy book.',
  },
  valentine: {
    className: 'special-page-valentine',
    badge: '💌',
    title: 'Valentine Page',
    fallback: 'A private Valentine chapter from the legacy book.',
  },
  confession: {
    className: 'special-page-confession',
    badge: '💖',
    title: 'Confession Page',
    fallback: 'A private confession chapter from the legacy book.',
  },
}

function sectionText(model) {
  const sections = model.moment?.sections || []
  const text = sections.flatMap((section) => [section.content, ...(section.items || [])]).filter(Boolean)
  return text.length > 0 ? text : [model.moment?.subtitle || model.config?.summary || 'This private moment is protected inside Couple Book.']
}

function SpecialMomentSections({ model, fallback }) {
  const sections = model.moment?.sections || []

  if (sections.length === 0) {
    return sectionText(model).slice(0, 3).map((paragraph) => (
      <p key={paragraph}>{paragraph || fallback}</p>
    ))
  }

  return sections.slice(0, 4).map((section) => (
    <section className="special-page-section" key={section.id || section.heading || section.content}>
      {section.heading ? <h2>{section.heading}</h2> : null}
      {section.content ? <p>{section.content}</p> : null}
      {section.items?.length > 0 ? (
        <ul className="special-page-list">
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  ))
}

export function SpecialMomentFrame({ momentKey }) {
  const config = getSpecialMomentConfig(momentKey)
  const { model } = useSpecialMomentContent(momentKey)
  const copy = COPY[momentKey] || COPY.confession
  const title = model.moment?.title || config?.title || copy.title

  return (
    <section className={`special-page-standalone ${copy.className}`}>
      <main className="card glass-card" aria-live="polite">
        <div className="badge">{copy.badge}</div>
        <h1>{title}</h1>
        <SpecialMomentSections model={model} fallback={copy.fallback} />
        <div className="actions">
          <Link className="btn btn-primary" to="/dashboard">Return to Dashboard</Link>
          <Link className="btn btn-secondary" to="/gallery">Open Gallery</Link>
        </div>
      </main>
    </section>
  )
}
