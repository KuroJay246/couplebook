import { ChapterHeader, EditorialEmptyState } from './PageLayout'

export function PlaceholderPage({ eyebrow, title, description }) {
  return (
    <section className="page-stack">
      <ChapterHeader
        eyebrow={eyebrow}
        folio="Migration placeholder"
        title={title}
        description={description}
      />
      <EditorialEmptyState
        title="This page is ready for the next chapter."
        description="Its protected frame is in place, but the real content has not been connected here yet."
      />
    </section>
  )
}
