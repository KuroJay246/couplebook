import { Link } from 'react-router-dom'
import { EditorialEmptyState, EditorialSection, QuietStatus, SharedSpaceHeader } from '../../components/PageLayout'
import { getSpecialMomentConfig } from './specialMomentConfig.js'
import { useSpecialMomentContent } from './useSpecialMomentContent.js'

function SpecialMomentNavigation() {
  return (
    <nav aria-label="Return to the shared book" className="special-moment-return-nav">
      <Link to="/dashboard">Home</Link>
      <Link to="/timeline">Timeline</Link>
      <Link to="/gallery">Gallery</Link>
    </nav>
  )
}

function renderContentStatusLabel(status) {
  if (status === 'ready') return 'Runtime content connected'
  if (status === 'partial') return 'Partial runtime content'
  if (status === 'loading') return 'Checking runtime source'
  if (status === 'invalid') return 'Runtime content held back'
  if (status === 'empty') return 'No runtime content'
  return 'Runtime source unavailable'
}

function SpecialMomentStatus({ config, model }) {
  return (
    <QuietStatus
      className="special-moment-status"
      description="This page reads only from protected runtime content sources after the routed shell authorizes the viewer."
      eyebrow={renderContentStatusLabel(model.status)}
      items={[
        'Protected route',
        'Private content not bundled',
        'Read-only runtime source',
        `${config.label} accent: ${config.accentDescription}`,
      ]}
      title="The private chapter stays outside the public JavaScript bundle."
    />
  )
}

function SpecialMomentSourceStatus({ model }) {
  return (
    <QuietStatus
      className="special-moment-source-status"
      description="This status reports the privacy boundary without exposing paths, filenames, raw source data, or private content."
      eyebrow="Runtime boundary"
      items={[
        model.privacy.privateContentBundled ? 'Needs review' : 'No private content bundled',
        model.privacy.runtimeOnly ? 'Runtime-only content' : 'Runtime boundary unavailable',
        `Connection: ${model.sourceStatus.connection}`,
      ]}
      title="Content source stays narrow."
      tone={model.status === 'invalid' ? 'warning' : 'default'}
    />
  )
}

function SpecialMomentMediaStatus({ media }) {
  return (
    <aside className={`special-moment-media-status special-moment-media-status-${media.status}`}>
      <span className="folio-mark">Companion media</span>
      <h3>
        {media.status === 'none'
          ? 'No companion media'
          : media.status === 'private-legacy-reference'
            ? 'Media preserved privately'
            : 'Media unavailable in this build'}
      </h3>
      <p>{media.note}</p>
    </aside>
  )
}

function SpecialMomentSection({ section }) {
  const heading = section.heading ? <h3>{section.heading}</h3> : null

  if (section.kind === 'quote') {
    return (
      <figure className="special-moment-content-section special-moment-content-quote">
        {heading}
        {section.content ? <blockquote>{section.content}</blockquote> : null}
      </figure>
    )
  }

  if (section.kind === 'list' || section.kind === 'timeline') {
    const ListTag = section.kind === 'timeline' ? 'ol' : 'ul'
    return (
      <section className={`special-moment-content-section special-moment-content-${section.kind}`}>
        {heading}
        {section.content ? <p>{section.content}</p> : null}
        <ListTag>
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ListTag>
      </section>
    )
  }

  return (
    <section className={`special-moment-content-section special-moment-content-${section.kind}`}>
      {heading}
      {section.content ? <p>{section.content}</p> : null}
      {section.items.length > 0 ? (
        <ul>
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function SpecialMomentRuntimeContent({ model }) {
  if (model.status === 'loading') {
    return (
      <div className="special-moment-panel special-moment-panel-unavailable" aria-live="polite">
        <EditorialEmptyState
          description="Couple Book is checking for a protected runtime source before this private chapter opens."
          support="No fallback public static page is requested."
          title="Checking runtime content."
          titleAs="h3"
        />
      </div>
    )
  }

  if (!model.moment) {
    return (
      <div className="special-moment-panel special-moment-panel-unavailable">
        <EditorialEmptyState
          description={model.config.unavailableDescription}
          support="The route is migrated and protected, but private text is not copied into the public React bundle."
          title={model.config.unavailableTitle}
          titleAs="h3"
        />
        <SpecialMomentNavigation />
      </div>
    )
  }

  return (
    <article className="special-moment-document">
      <header className="special-moment-document-header">
        <span className="folio-mark">Runtime-only private chapter</span>
        <h2>{model.moment.title}</h2>
        {model.moment.subtitle ? <p>{model.moment.subtitle}</p> : null}
        {model.moment.date ? <time dateTime={model.moment.date}>{model.moment.date}</time> : null}
      </header>
      <div className="special-moment-content-stack">
        {model.moment.sections.map((section) => (
          <SpecialMomentSection key={section.id} section={section} />
        ))}
      </div>
      <SpecialMomentNavigation />
    </article>
  )
}

export function SpecialMomentFrame({ momentKey }) {
  const config = getSpecialMomentConfig(momentKey)
  const { model } = useSpecialMomentContent(momentKey)

  if (!config) {
    return (
      <EditorialEmptyState
        description="This protected special-moment route is not configured for the migrated shell."
        title="Special moment unavailable."
      />
    )
  }

  return (
    <section className={`special-moment-page special-moment-page-${config.accent}`}>
      <SharedSpaceHeader
        actions={[
          { href: '/timeline', label: 'Open timeline' },
          { href: '/gallery', label: 'Open gallery', tone: 'secondary' },
        ]}
        aside={<SpecialMomentStatus config={config} model={model} />}
        className="special-moment-hero"
        description={config.summary}
        eyebrow="Protected special moment"
        folio={config.migrationState}
        title={config.title}
      />

      <EditorialSection
        className="special-moment-section"
        description="Private text renders only when a runtime source returns normalized safe sections. Otherwise this page stays honest about what is unavailable."
        eyebrow={config.label}
        title="Private content now uses a runtime-only boundary."
      >
        <SpecialMomentRuntimeContent model={model} />
        <div className="special-moment-support-grid">
          <SpecialMomentMediaStatus media={model.media} />
          <SpecialMomentSourceStatus model={model} />
        </div>
      </EditorialSection>
    </section>
  )
}
