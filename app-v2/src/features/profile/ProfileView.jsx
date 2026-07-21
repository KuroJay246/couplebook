import { Link } from 'react-router-dom'
import { EditorialEmptyState, EditorialSection, SharedSpaceHeader } from '../../components/PageLayout'
import { WriteWorkflowPanel } from '../../components/WriteWorkflowPanel'

function renderProfileStatusLabel(status) {
  if (status === 'ready') return 'Read-only profile'
  if (status === 'partial') return 'Partial bridge'
  if (status === 'unavailable') return 'Source unavailable'
  return 'Waiting on profile data'
}

function renderCompatibilityStateLabel(compatibilityState) {
  if (compatibilityState === 'loading') return 'Refreshing'
  if (compatibilityState === 'error') return 'Needs review'
  if (compatibilityState === 'ready') return 'Ready'
  return 'Waiting'
}

function describeProfileState(model) {
  if (model.status === 'ready') {
    return 'The paired profiles, milestones, and shared favorites now sit together in one quieter relationship spread.'
  }

  if (model.status === 'partial') {
    return 'Some relationship details are available, but the full paired spread still depends on the read-only compatibility bridge.'
  }

  if (model.status === 'unavailable') {
    return 'This shared spread is ready, but profile details are still unavailable on this routed origin. The page stays honest instead of inventing names or dates.'
  }

  return 'The shared relationship frame is ready, but the paired profile details have not surfaced in this routed shell yet.'
}

function OpeningNote({ model }) {
  const peopleCount = model.people.length
  const warningCount = model.warnings.length

  return (
    <div className="profile-opening-note">
      <span className="source-status-pill">{renderProfileStatusLabel(model.status)}</span>
      <ul className="profile-opening-list">
        <li>{peopleCount >= 2 ? `${peopleCount} voices preserved` : 'Paired profiles still pending'}</li>
        <li>{model.sharedHighlights.length > 0 ? `${model.sharedHighlights.length} shared highlights visible` : 'Shared highlights still quiet'}</li>
        <li>{warningCount > 0 ? `${warningCount} warnings remain explicit` : 'No hidden write-back paths'}</li>
      </ul>
    </div>
  )
}

function ProfilePersonPanel({ person }) {
  return (
    <article className="profile-person-panel">
      <div className="profile-person-meta">
        <span className="folio-mark">{person.avatarStatus === 'provided' ? 'Portrait saved' : 'Portrait pending'}</span>
        <span className="profile-person-status">{person.bioStatus === 'ready' ? 'Personal note' : 'Bio pending'}</span>
      </div>
      <div className="profile-person-copy">
        <h3>{person.displayName}</h3>
        <p>{person.bio || 'A personal note has not been carried into this routed shell yet.'}</p>
      </div>
      <dl className="profile-detail-list">
        {person.details.map((detail) => (
          <div className="profile-detail-row" key={detail.key}>
            <dt>{detail.label}</dt>
            <dd className={detail.status === 'ready' ? '' : 'profile-detail-empty'}>{detail.value || 'Not available yet'}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}

function PeopleSection({ model }) {
  return (
    <EditorialSection
      className="profile-section"
      description="One shared relationship spread comes first; account-style controls and editing stay deferred."
      eyebrow="Shared spread"
      title="We are the subject of this book."
    >
      {model.people.length > 0 ? (
        <div className="profile-spread-grid">
          {model.people.map((person) => (
            <ProfilePersonPanel key={person.id} person={person} />
          ))}
        </div>
      ) : (
        <EditorialEmptyState
          description="This route is ready for the paired spread, but it will not invent names, birthdays, or bios on its own."
          title="Profile details are still waiting on a safe read-only source."
          titleAs="h3"
        />
      )}
    </EditorialSection>
  )
}

function MilestonesSection({ relationship }) {
  const hasContent = relationship.anniversaries.length > 0 || relationship.milestones.length > 0

  return (
    <EditorialSection
      className="profile-section"
      description="Joined dates, birthdays, and contract milestones stay nearby without overwhelming the shared opening."
      eyebrow="Milestones"
      title="Anniversaries and milestones stay close."
    >
      {hasContent ? (
        <div className="profile-milestone-grid">
          <article className="profile-note-card">
            <span className="folio-mark">Anniversaries</span>
            {relationship.anniversaries.length > 0 ? (
              <ul className="profile-note-list">
                {relationship.anniversaries.map((item) => (
                  <li key={item.id}>
                    <strong>{item.label}</strong>
                    <p>{item.dateLabel || 'Date pending'}</p>
                    <span>{item.summary}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="profile-note-empty">Joined-date views have not reached this shell yet.</p>
            )}
          </article>

          <article className="profile-note-card">
            <span className="folio-mark">Milestones</span>
            {relationship.milestones.length > 0 ? (
              <ul className="profile-note-list">
                {relationship.milestones.map((item) => (
                  <li key={item.id}>
                    <strong>{item.label}</strong>
                    <p>{item.value || 'Not available yet'}</p>
                    <span>{item.kind}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="profile-note-empty">Milestone details are still waiting on the compatibility bridge.</p>
            )}
          </article>
        </div>
      ) : (
        <EditorialEmptyState
          description="Joined dates, birthdays, and contract milestones will appear here once the read-only profile bridge has more to work with."
          title="Milestones are still pending."
          titleAs="h3"
        />
      )}
    </EditorialSection>
  )
}

function HighlightsSection({ model }) {
  return (
    <EditorialSection
      className="profile-section"
      description="Favorites should feel like quiet marginal notes from the relationship, not another settings list."
      eyebrow="Shared highlights"
      title="Shared favorites surface as gentle highlights."
    >
      {model.sharedHighlights.length > 0 ? (
        <ul className="profile-highlight-list">
          {model.sharedHighlights.map((highlight) => (
            <li className="profile-highlight-chip" key={highlight.id}>
              <strong>{highlight.label}</strong>
              <span>
                {highlight.owner} {highlight.category} {highlight.count > 1 ? `(${highlight.count})` : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EditorialEmptyState
          description="The page keeps the space ready for shared favorites, but it will not fabricate highlights when the preserved list is empty."
          title="No favorite highlights are available yet."
          titleAs="h3"
        />
      )}
    </EditorialSection>
  )
}

function RelatedEntriesSection({ entries }) {
  return (
    <EditorialSection
      className="profile-section"
      description="Contract and favorites remain reachable from here without taking over the shared relationship spread."
      eyebrow="Related entries"
      title="Contract and favorites stay one step down."
    >
      <div className="profile-entry-grid">
        {Object.values(entries).map((entry) => (
          <Link className="profile-entry-card" key={entry.href} to={entry.href}>
            <span className="profile-entry-status">{entry.status}</span>
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
      className="profile-section"
      description="Profile is still using only the read-only compatibility inputs while editing remains deferred."
      eyebrow="Source status"
      title="Source status remains explicit."
    >
      <div className="source-status-toolbar">
        <div className="source-status-copy">
          <span className="source-status-pill">{renderCompatibilityStateLabel(compatibilityState)}</span>
          <p>The migrated route will distinguish unavailable, empty, and partial profile data instead of pretending the relationship spread is complete.</p>
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
              <span>{item.warningCount} warnings</span>
            </div>
          </article>
        ))}
      </div>

      {model.warnings.length > 0 ? (
        <div className="warning-ledger">
          <h3>Current warnings</h3>
          <ul>
            {model.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </EditorialSection>
  )
}

export function ProfileView({ compatibilityError, compatibilityState, model, onRefresh }) {
  return (
    <section className="profile-page">
      <SharedSpaceHeader
        actions={[
          { href: model.entries.favorites.href, label: 'Open favorites' },
          { href: model.entries.contract.href, label: 'Open contract', tone: 'secondary' },
        ]}
        aside={<OpeningNote model={model} />}
        className="profile-hero"
        description={describeProfileState(model)}
        eyebrow="Shared space"
        folio={renderProfileStatusLabel(model.status)}
        title={model.relationship.title}
      />

      <WriteWorkflowPanel kind="profile" onRefresh={onRefresh} />
      <PeopleSection model={model} />
      <MilestonesSection relationship={model.relationship} />
      <HighlightsSection model={model} />
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
