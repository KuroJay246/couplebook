import { Link } from 'react-router-dom'
import { EditorialEmptyState, EditorialSection, SharedSpaceHeader } from '../../components/PageLayout'
import { WriteWorkflowPanel } from '../../components/WriteWorkflowPanel'
import { describeFavoritesCounts } from './favoritesSelectors.js'

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function renderFavoritesStatusLabel(status) {
  if (status === 'ready') return 'Read-only favorites'
  if (status === 'partial') return 'Partial bridge'
  if (status === 'unavailable') return 'Source unavailable'
  if (status === 'invalid') return 'Needs review'
  return 'Empty collection'
}

function renderCompatibilityStateLabel(compatibilityState) {
  if (compatibilityState === 'loading') return 'Refreshing'
  if (compatibilityState === 'error') return 'Needs review'
  if (compatibilityState === 'ready') return 'Ready'
  return 'Waiting'
}

function describeFavoritesState(model) {
  if (model.status === 'ready' && model.shared.exactMatches.length > 0) {
    return 'Exact overlaps surface softly first, while each person\'s favorites stay legible inside one shared collection.'
  }

  if (model.status === 'ready') {
    return 'Different favorites, one shared collection. The page keeps distinct tastes intact instead of forcing a false overlap.'
  }

  if (model.status === 'partial') {
    return 'One preserved collection is already visible here, while the rest remains patient, read-only, and honest about what has not reconnected yet.'
  }

  if (model.status === 'unavailable') {
    return 'This collection has not been connected here yet. Saved favorites remain safely in the legacy book until the routed shell can read them here.'
  }

  if (model.status === 'invalid') {
    return 'Stored favorites need review before this collection can open safely in the routed shell.'
  }

  return 'This collection is ready for its first entries. Favorites will gather here as the shared book grows.'
}

function OpeningNote({ model }) {
  return (
    <div className="favorites-opening-note">
      <span className="source-status-pill">{renderFavoritesStatusLabel(model.status)}</span>
      <ul className="favorites-opening-list">
        <li>{describeFavoritesCounts(model)}</li>
        <li>
          {model.shared.exactMatches.length > 0
            ? 'Shared entries appear only when the preserved lists truly match.'
            : 'Different favorites, one shared collection.'}
        </li>
        <li>
          {model.sourceStatus.notes.length > 0
            ? model.sourceStatus.notes.length === 1
              ? '1 source note remains explicit'
              : `${pluralize(model.sourceStatus.notes.length, 'source note')} remain explicit`
            : 'No hidden write-back paths'}
        </li>
      </ul>
    </div>
  )
}

function SharedMatchesSection({ shared }) {
  if (shared.exactMatches.length === 0) return null

  return (
    <EditorialSection
      className="favorites-section"
      description="Only exact category matches surface here. Close enough is not treated as the same thing."
      eyebrow="Shared favorites"
      title="What returns for both of you."
    >
      <div className="favorites-shared-grid">
        {shared.categories.map((category) => (
          <article className="favorites-shared-card" key={category.key}>
            <span className="folio-mark">{category.label}</span>
            <ul className="favorites-chip-list">
              {category.items.map((item) => (
                <li key={item.id}>
                  <strong>{item.label}</strong>
                  <span>{pluralize(item.ownerCount, 'saved voice')}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </EditorialSection>
  )
}

function FavoriteCategory({ category, ownerId }) {
  const headingId = `favorites-${ownerId}-${category.key}`

  return (
    <section aria-labelledby={headingId} className="favorites-category-block">
      <div className="favorites-category-heading">
        <h3 id={headingId}>{category.label}</h3>
        <span>{pluralize(category.itemCount, 'entry')}</span>
      </div>
      <ul className="favorites-item-list">
        {category.items.map((item) => (
          <li key={`${ownerId}-${category.key}-${item}`}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

function PersonFavoritesSection({ person }) {
  const ownerDescription =
    person.displayNameSource === 'profile'
      ? 'Saved favorites stay grouped by the categories already preserved for this person.'
      : 'This saved collection keeps the preserved owner label until profile details reconnect here.'

  return (
    <article className="favorites-person-panel">
      <div className="favorites-person-meta">
        <span className="folio-mark">{pluralize(person.categoryCount, 'category')}</span>
        <span className="favorites-person-status">{pluralize(person.itemCount, 'favorite')} visible</span>
      </div>
      <div className="favorites-person-copy">
        <h3>{person.displayName}</h3>
        <p>{ownerDescription}</p>
      </div>
      <div className="favorites-category-stack">
        {person.categories.map((category) => (
          <FavoriteCategory category={category} key={`${person.id}-${category.key}`} ownerId={person.id} />
        ))}
      </div>
      {person.hiddenCategoryCount > 0 ? (
        <p className="favorites-held-note">
          {pluralize(person.hiddenCategoryCount, 'legacy field')} stay tucked away until those categories can be reviewed safely.
        </p>
      ) : null}
    </article>
  )
}

function EmptyCollectionSection({ model }) {
  if (model.status === 'unavailable') {
    return (
      <EditorialEmptyState
        description="Your saved favorites remain safely in the legacy book. This routed page is waiting for the read-only bridge, not pretending the collection is empty."
        title="This collection has not been connected here yet."
        titleAs="h3"
      />
    )
  }

  if (model.status === 'invalid') {
    return (
      <EditorialEmptyState
        description="Stored favorites need review before the collection can open safely here. The page keeps that boundary explicit instead of guessing."
        title="This collection is being held back for review."
        titleAs="h3"
      />
    )
  }

  return (
    <EditorialEmptyState
      description="Favorites will gather here as the shared book grows. The first migrated pass stays read-only and refuses to invent entries."
      title="This collection is ready for its first entries."
      titleAs="h3"
    />
  )
}

function PeopleSection({ model }) {
  return (
    <EditorialSection
      className="favorites-section"
      description="The category rhythm comes from the preserved source, while editing and rewriting stay deferred."
      eyebrow="Collected notes"
      title="Each voice stays legible inside one shared collection."
    >
      {model.people.length > 0 ? (
        <>
          <div className="favorites-spread-grid">
            {model.people.map((person) => (
              <PersonFavoritesSection key={person.id} person={person} />
            ))}
          </div>
          {model.status === 'partial' ? (
            <p className="favorites-partial-note">
              One preserved collection is visible here already. More favorites can reconnect later without rewriting the legacy source.
            </p>
          ) : null}
        </>
      ) : (
        <EmptyCollectionSection model={model} />
      )}
    </EditorialSection>
  )
}

function RelatedEntriesSection({ entries }) {
  return (
    <EditorialSection
      className="favorites-section"
      description="Profile and contract stay reachable from here without turning Favorites into another utility page."
      eyebrow="Related entries"
      title="The shared profile and contract stay close."
    >
      <div className="favorites-link-grid">
        {Object.values(entries).map((entry) => (
          <Link className="favorites-link-card" key={entry.href} to={entry.href}>
            <span className="favorites-link-status">{entry.status}</span>
            <strong>{entry.title}</strong>
            <p>{entry.description}</p>
          </Link>
        ))}
      </div>
    </EditorialSection>
  )
}

function SourceStateSection({ compatibilityError, compatibilityState, model, onRefresh }) {
  return (
    <EditorialSection
      action={{ label: 'Refresh reads', onClick: onRefresh, tone: 'secondary' }}
      className="favorites-section"
      description="Favorites is still using only the read-only compatibility sources while editing remains deferred."
      eyebrow="Source status"
      title="Source status stays quiet but clear."
    >
      <div className="source-status-toolbar">
        <div className="source-status-copy">
          <span className="source-status-pill">{renderCompatibilityStateLabel(compatibilityState)}</span>
          <p>The page distinguishes unavailable, empty, partial, and invalid states instead of flattening them into one generic list.</p>
        </div>
      </div>

      {compatibilityError ? (
        <div className="dashboard-inline-alert">
          <strong>Compatibility refresh issue</strong>
          <p>{compatibilityError}</p>
        </div>
      ) : null}

      <div className="source-status-grid">
        {model.sourceStatus.items.map((item) => (
          <article className="source-card" key={item.key}>
            <div className="source-card-header">
              <strong>{item.label}</strong>
              <span className={`source-card-status source-card-status-${item.status}`}>{item.status}</span>
            </div>
            <p>{item.summary}</p>
            <div className="source-card-meta">
              <span>{item.sourceLabel}</span>
              <span>{pluralize(item.warningCount, 'warning')}</span>
            </div>
          </article>
        ))}
      </div>

      {model.sourceStatus.notes.length > 0 ? (
        <div className="warning-ledger">
          <h3>Still being held back</h3>
          <ul>
            {model.sourceStatus.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </EditorialSection>
  )
}

export function FavoritesView({ compatibilityError, compatibilityState, model, onRefresh }) {
  return (
    <section className="favorites-page">
      <SharedSpaceHeader
        actions={[
          { href: model.entries.profile.href, label: 'Open profile' },
          { href: model.entries.contract.href, label: 'Open contract', tone: 'secondary' },
        ]}
        aside={<OpeningNote model={model} />}
        className="favorites-hero"
        description={describeFavoritesState(model)}
        eyebrow="Shared space"
        folio={renderFavoritesStatusLabel(model.status)}
        title="The things we return to."
      />

      <WriteWorkflowPanel kind="favorites" onRefresh={onRefresh} />
      <SharedMatchesSection shared={model.shared} />
      <PeopleSection model={model} />
      <RelatedEntriesSection entries={model.entries} />
      <SourceStateSection
        compatibilityError={compatibilityError}
        compatibilityState={compatibilityState}
        model={model}
        onRefresh={onRefresh}
      />
    </section>
  )
}
