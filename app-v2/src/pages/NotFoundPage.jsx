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
      <div className="rounded-[24px] border border-[#ead7df] bg-[#fffdfd] p-6">
        <EditorialEmptyState
          description="Use the main chapters or the secondary navigation to return to a verified protected route."
          support="Unknown paths do not load static rollback pages or bypass authorization."
          title="Protected route fallback."
          titleAs="h3"
        />
        <nav aria-label="Return to verified routes" className="mt-6 flex flex-wrap justify-center gap-3">
          <Link className="inline-flex min-h-10 items-center rounded-xl border border-[#dcc2cd] px-4 text-xs font-bold text-[#6f5462] hover:bg-[#fff5f8]" to="/dashboard">Home</Link>
          <Link className="inline-flex min-h-10 items-center rounded-xl border border-[#dcc2cd] px-4 text-xs font-bold text-[#6f5462] hover:bg-[#fff5f8]" to="/timeline">Story</Link>
          <Link className="inline-flex min-h-10 items-center rounded-xl border border-[#dcc2cd] px-4 text-xs font-bold text-[#6f5462] hover:bg-[#fff5f8]" to="/gallery">Album</Link>
          <Link className="inline-flex min-h-10 items-center rounded-xl border border-[#dcc2cd] px-4 text-xs font-bold text-[#6f5462] hover:bg-[#fff5f8]" to="/settings">Settings</Link>
        </nav>
      </div>
    </UtilitySection>
  )
}
