import { Link } from 'react-router-dom'
import { EditorialEmptyState, EditorialSection, QuietStatus, SharedSpaceHeader } from '../../components/PageLayout'

function renderContractStatusLabel(status) {
  if (status === 'ready') return 'Read-only agreement'
  if (status === 'partial') return 'Status preserved'
  if (status === 'unavailable') return 'Protected source unavailable'
  if (status === 'invalid') return 'Needs review'
  return 'Awaiting agreement record'
}

function renderCompatibilityStateLabel(compatibilityState) {
  if (compatibilityState === 'loading') return 'Refreshing'
  if (compatibilityState === 'error') return 'Needs review'
  if (compatibilityState === 'ready') return 'Ready'
  return 'Waiting'
}

function describeContractState(model) {
  if (model.status === 'ready') {
    return 'The agreement can be read here as a protected document, while signing, editing, and exporting remain deferred.'
  }

  if (model.status === 'partial') {
    return 'This page can preserve acceptance and signature status honestly, even when the agreement wording itself is still waiting on a protected runtime source.'
  }

  if (model.status === 'unavailable') {
    return 'This route is live, but the protected agreement source is not connected on this origin yet. The page keeps that boundary explicit instead of copying the old static wording.'
  }

  if (model.status === 'invalid') {
    return 'Stored contract details need review before this page can trust them as part of the shared book.'
  }

  return 'This route is live and read-only, even when no preserved contract record is available yet.'
}

function OpeningNote({ model }) {
  return (
    <QuietStatus
      className="contract-opening-note"
      description="This migrated page preserves only what can be read safely, without bringing back signing, editing, or browser-storage shortcuts."
      eyebrow={renderContractStatusLabel(model.status)}
      items={model.openingNotes}
      title="The document remains present, but it stays read-only."
    />
  )
}

function AgreementDocumentMeta({ agreement }) {
  const items = [
    { label: 'Document boundary', value: 'Read-only' },
    { label: 'Agreement source', value: agreement.sourceStatus },
  ]

  if (agreement.version) {
    items.push({ label: 'Version', value: agreement.version })
  }

  return (
    <dl className="contract-document-meta">
      {items.map((item) => (
        <div className="contract-document-meta-row" key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function AgreementDocument({ agreement }) {
  if (agreement.status !== 'ready') {
    return (
      <article className="contract-document contract-document-unavailable">
        <div className="contract-document-kicker">
          <span className="folio-mark">Awaiting protected wording</span>
          <p>No private agreement text is copied from the old static files into this routed page.</p>
        </div>
        <EditorialEmptyState
          description={agreement.introduction}
          support={agreement.summary}
          title={agreement.title}
          titleAs="h3"
        />
        <AgreementDocumentMeta agreement={agreement} />
      </article>
    )
  }

  return (
    <article className="contract-document">
      <div className="contract-document-kicker">
        <span className="folio-mark">Protected document</span>
        <p>This migrated Contract page is read-only. Signing, editing, and exporting stay deferred to a later protected phase.</p>
      </div>

      <header className="contract-document-header">
        <div className="contract-document-copy">
          <h3>{agreement.title}</h3>
          <p>{agreement.introduction}</p>
        </div>
        <AgreementDocumentMeta agreement={agreement} />
      </header>

      <div className="contract-document-body">
        {agreement.sections.map((section) => (
          <section className="contract-document-section" key={section.id}>
            <h4>{section.heading}</h4>
            {section.paragraphs.map((paragraph) => (
              <p key={`${section.id}-${paragraph}`}>{paragraph}</p>
            ))}
            {section.clauses.length > 0 ? (
              <ol className="contract-clause-list">
                {section.clauses.map((clause) => (
                  <li key={`${section.id}-${clause}`}>{clause}</li>
                ))}
              </ol>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  )
}

function AgreementSection({ agreement }) {
  return (
    <EditorialSection
      className="contract-section"
      description="Agreement wording appears here only when it comes from a protected runtime source. Otherwise the page stays honest about what has not been restored safely yet."
      eyebrow="Agreement document"
      title="The preserved agreement stays formal, private, and read-only."
    >
      <AgreementDocument agreement={agreement} />
    </EditorialSection>
  )
}

function RecordCard({ record, type }) {
  const dateLabel = type === 'acceptance' ? record.acceptedAtLabel : record.signedAtLabel
  const dateTitle = type === 'acceptance' ? 'Recorded date' : 'Signature date'

  return (
    <article className="contract-record-card">
      <div className="contract-record-card-meta">
        <span className="folio-mark">{record.title}</span>
        <span className={`contract-record-status contract-record-status-${record.status}`}>{record.label}</span>
      </div>
      <div className="contract-record-card-copy">
        <h3>{record.displayName}</h3>
        <p>{record.note}</p>
      </div>
      <dl className="contract-record-detail-list">
        <div className="contract-record-detail-row">
          <dt>{dateTitle}</dt>
          <dd>{dateLabel}</dd>
        </div>
        <div className="contract-record-detail-row">
          <dt>Display rule</dt>
          <dd>{type === 'signature' ? 'Raw signature hidden' : 'Status only'}</dd>
        </div>
      </dl>
    </article>
  )
}

function AcceptanceSection({ acceptance }) {
  const records = [acceptance.currentUser, acceptance.partner].filter(Boolean)

  return (
    <EditorialSection
      className="contract-section"
      description="Acceptance remains separate from missing wording and missing signature payloads. A missing partner record is not turned into a refusal."
      eyebrow="Acceptance summary"
      title="Acceptance stays visible without turning into a control surface."
    >
      <div className="contract-record-grid">
        {records.map((record) => (
          <RecordCard key={`${record.title}-${record.displayName}`} record={record} type="acceptance" />
        ))}
      </div>
    </EditorialSection>
  )
}

function SignatureSection({ signatures }) {
  const records = [signatures.currentUser, signatures.partner].filter(Boolean)

  return (
    <EditorialSection
      className="contract-section"
      description="This page reports only safe signature status. Raw payloads, data URLs, handwritten strokes, and signature images stay hidden."
      eyebrow="Signature status"
      title="Signature status remains visible without exposing the signature itself."
    >
      <div className="contract-record-grid">
        {records.map((record) => (
          <RecordCard key={`${record.title}-${record.displayName}`} record={record} type="signature" />
        ))}
      </div>
    </EditorialSection>
  )
}

function HistorySection({ history }) {
  if (!Array.isArray(history) || history.length === 0) return null

  return (
    <EditorialSection
      className="contract-section"
      description="Only preserved relationship events surface here. Raw storage activity and technical change events stay out of view."
      eyebrow="History"
      title="Preserved milestones remain quiet."
    >
      <ol className="contract-history-list">
        {history.map((entry) => (
          <li className="contract-history-item" key={entry.id}>
            <div className="contract-history-copy">
              <span className="folio-mark">{entry.actorTitle}</span>
              <h3>{entry.title}</h3>
              <p>{entry.note}</p>
            </div>
            <div className="contract-history-meta">
              <strong>{entry.actorDisplayName}</strong>
              <span>{entry.dateLabel}</span>
            </div>
          </li>
        ))}
      </ol>
    </EditorialSection>
  )
}

function RelatedEntriesSection({ entries }) {
  return (
    <EditorialSection
      className="contract-section"
      description="Profile and favorites stay linked from here without pulling this page toward account utilities or edit controls."
      eyebrow="Related entries"
      title="The rest of the shared book stays close."
    >
      <div className="contract-link-grid">
        {Object.values(entries).map((entry) => (
          <Link className="contract-link-card" key={entry.href} to={entry.href}>
            <span className="contract-link-status">{entry.status}</span>
            <strong>{entry.title}</strong>
            <p>{entry.description}</p>
          </Link>
        ))}
      </div>
    </EditorialSection>
  )
}

function PrivacySection({ privacy }) {
  return (
    <EditorialSection
      className="contract-section contract-section-subdued"
      description="The privacy boundary stays in plain view so this route does not become a signing platform, a raw storage inspector, or a legal-services interface."
      eyebrow="Privacy and migration"
      title="The protected boundary stays visible."
    >
      <div className="contract-privacy-grid">
        {privacy.items.map((item) => (
          <article className="contract-privacy-card" key={item.label}>
            <span className="folio-mark">{item.label}</span>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
      <p className="contract-boundary-note">
        Signing, editing, accepting, exporting, and reset controls remain deferred to a later protected migration phase.
      </p>
    </EditorialSection>
  )
}

function SourceStateSection({ compatibilityError, compatibilityState, model, onRefresh }) {
  return (
    <EditorialSection
      action={{ label: 'Refresh reads', onClick: onRefresh, tone: 'secondary' }}
      className="contract-section"
      description="Compatibility stays read-only here. The page reports safe source state without exposing browser-storage keys, Firestore paths, or private payload details."
      eyebrow="Source status"
      title="Source status stays quiet but explicit."
    >
      <div className="source-status-toolbar">
        <div className="source-status-copy">
          <span className="source-status-pill">{renderCompatibilityStateLabel(compatibilityState)}</span>
          <p>The page distinguishes unavailable, empty, partial, and invalid states instead of flattening them into a generic document shell.</p>
        </div>
      </div>

      {compatibilityError ? (
        <div className="dashboard-inline-alert">
          <strong>Compatibility refresh issue</strong>
          <p>The latest protected refresh did not complete. Existing read-only contract status remains intact.</p>
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
              <span>{item.warningCount === 1 ? '1 review note' : `${item.warningCount} review notes`}</span>
            </div>
          </article>
        ))}
      </div>

      <ul className="contract-note-list">
        {model.sourceStatus.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </EditorialSection>
  )
}

export function ContractView({ compatibilityError, compatibilityState, model, onRefresh }) {
  return (
    <section className="contract-page">
      <SharedSpaceHeader
        actions={[
          { href: model.entries.profile.href, label: 'Open profile' },
          { href: model.entries.favorites.href, label: 'Open favorites', tone: 'secondary' },
        ]}
        aside={<OpeningNote model={model} />}
        className="contract-hero"
        description={describeContractState(model)}
        eyebrow="Shared space"
        folio={renderContractStatusLabel(model.status)}
        title="Our agreement"
      />

      <AgreementSection agreement={model.agreement} />
      <AcceptanceSection acceptance={model.acceptance} />
      <SignatureSection signatures={model.signatures} />
      <HistorySection history={model.history} />
      <RelatedEntriesSection entries={model.entries} />
      <PrivacySection privacy={model.privacy} />
      <SourceStateSection
        compatibilityError={compatibilityError}
        compatibilityState={compatibilityState}
        model={model}
        onRefresh={onRefresh}
      />
    </section>
  )
}
