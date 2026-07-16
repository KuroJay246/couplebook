import { Link } from 'react-router-dom'
import { EditorialEmptyState, UtilitySection } from '../components/PageLayout'

export function NotFoundPage() {
  return (
    <UtilitySection
      action={{ href: '/dashboard', label: 'Return home' }}
      className="not-found-section"
      description="This path is not part of the migrated Couple Book route map, so the protected shell keeps you inside the book instead of opening a detached page."
      eyebrow="Route review"
      title="That page is not in the book."
    >
      <div className="special-moment-panel special-moment-panel-unavailable">
        <EditorialEmptyState
          description="Use the main chapters or the secondary navigation to return to a verified protected route."
          support="Unknown paths do not load static rollback pages or bypass authorization."
          title="Protected route fallback."
          titleAs="h3"
        />
        <nav aria-label="Return to verified routes" className="special-moment-return-nav">
          <Link to="/dashboard">Home</Link>
          <Link to="/timeline">Timeline</Link>
          <Link to="/gallery">Gallery</Link>
          <Link to="/settings">Settings</Link>
        </nav>
      </div>
    </UtilitySection>
  )
}
