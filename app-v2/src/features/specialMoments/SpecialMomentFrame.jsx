import { Link } from 'react-router-dom'
import { EditorialEmptyState, EditorialSection, QuietStatus, SharedSpaceHeader } from '../../components/PageLayout'
import { getSpecialMomentConfig } from './specialMomentConfig.js'

function SpecialMomentNavigation() {
  return (
    <nav aria-label="Return to the shared book" className="special-moment-return-nav">
      <Link to="/dashboard">Home</Link>
      <Link to="/timeline">Timeline</Link>
      <Link to="/gallery">Gallery</Link>
    </nav>
  )
}

function SpecialMomentStatus({ config }) {
  return (
    <QuietStatus
      className="special-moment-status"
      description="This frame proves the protected route, shared navigation, and safe migration state before private content returns."
      eyebrow="Content migration pending"
      items={[
        'Protected route',
        'Private content not bundled',
        `${config.label} accent: ${config.accentDescription}`,
      ]}
      title="The page belongs to the book, but the content stays held back."
    />
  )
}

export function SpecialMomentFrame({ momentKey }) {
  const config = getSpecialMomentConfig(momentKey)

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
        aside={<SpecialMomentStatus config={config} />}
        className="special-moment-hero"
        description={config.summary}
        eyebrow="Protected special moment"
        folio={config.migrationState}
        title={config.title}
      />

      <EditorialSection
        className="special-moment-section"
        description="This shared frame keeps special moments inside the same protected Couple Book shell instead of reopening old public static pages."
        eyebrow={config.label}
        title="Private content migration is pending."
      >
        <div className="special-moment-panel">
          <EditorialEmptyState
            description="The content for this special page will return later through protected runtime sources. Nothing private is copied into the public React bundle here."
            support="No old HTML, companion media, motion effects, or static-page dependencies are imported."
            title="Reserved for a later protected content migration."
            titleAs="h3"
          />
          <SpecialMomentNavigation />
        </div>
      </EditorialSection>
    </section>
  )
}
