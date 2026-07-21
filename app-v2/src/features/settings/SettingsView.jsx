import { QuietStatus, SettingsGroup, UtilityPageHeader, UtilitySection } from '../../components/PageLayout'
import { WriteWorkflowPanel } from '../../components/WriteWorkflowPanel'

function renderSettingsStatusLabel(status) {
  if (status === 'ready') return 'Read-only settings'
  if (status === 'unavailable') return 'Source unavailable'
  if (status === 'invalid') return 'Needs review'
  return 'Awaiting settings'
}

function renderCompatibilityStateLabel(compatibilityState) {
  if (compatibilityState === 'loading') return 'Refreshing'
  if (compatibilityState === 'error') return 'Needs review'
  if (compatibilityState === 'ready') return 'Ready'
  return 'Waiting'
}

function describeSettingsState(model) {
  if (model.status === 'ready') {
    return 'Account, privacy, and migration notes now live here as a calm read-only utility page without reopening legacy controls.'
  }

  if (model.status === 'unavailable') {
    return 'This route is live, but the preserved settings record is not connected on this origin yet. The page stays useful without pretending those values are present.'
  }

  if (model.status === 'invalid') {
    return 'This route is live, but the preserved settings record needs review before it can be summarized safely here.'
  }

  return 'This route is live even when no preserved settings values are available yet.'
}

function OpeningNote({ model }) {
  return (
    <QuietStatus
      className="settings-opening-note"
      description="Settings stays informational, quiet, and intentionally secondary to the main story routes."
      eyebrow={renderSettingsStatusLabel(model.status)}
      items={model.openingNotes}
      title="The utility page is now real, but it still refuses to become a control panel."
    />
  )
}

function AccountSection({ account }) {
  return (
    <UtilitySection
      className="settings-section"
      description="The signed-in approved account remains visible here without turning the page into an admin dashboard."
      eyebrow="Your account"
      title="Identity stays narrow and readable."
    >
      <div className="settings-account-grid">
        <article className="settings-detail-card">
          <span className="folio-mark">Approved identity</span>
          <h3>{account.displayName}</h3>
          <p>{account.note}</p>
          <dl className="settings-detail-list">
            {account.details.map((detail) => (
              <div className="settings-detail-row" key={detail.key}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
        </article>

        <SettingsGroup
          description="Approval, identity, and sign-out boundaries remain explicit without duplicating shell controls."
          eyebrow="Read-only"
          items={account.items}
          title="Account boundaries"
        />
      </div>
    </UtilitySection>
  )
}

function AppearanceSection({ appearance }) {
  return (
    <UtilitySection
      className="settings-section"
      description="Appearance notes remain visible here while editing, switching, and save actions stay deferred."
      eyebrow="Appearance"
      title="The routed shell keeps one calm reading direction."
    >
      <div className="settings-account-grid">
        <article className="settings-detail-card">
          <span className="folio-mark">{appearance.runtimeTheme.meta}</span>
          <h3>{appearance.runtimeTheme.label}</h3>
          <p>{appearance.runtimeTheme.description}</p>
          <dl className="settings-detail-list">
            <div className="settings-detail-row">
              <dt>Preserved preference</dt>
              <dd>{appearance.preservedTheme.label}</dd>
            </div>
            <div className="settings-detail-row">
              <dt>Preference source</dt>
              <dd>{appearance.preservedTheme.origin}</dd>
            </div>
            <div className="settings-detail-row">
              <dt>Anniversary view</dt>
              <dd>{appearance.anniversaryView.label}</dd>
            </div>
          </dl>
        </article>

        <SettingsGroup
          description="Saved appearance notes can stay visible without bringing back the old browser theme controls."
          eyebrow="Display only"
          items={appearance.items}
          title="Appearance boundary"
        />
      </div>
    </UtilitySection>
  )
}

function PrivacySection({ privacy }) {
  return (
    <UtilitySection
      className="settings-section"
      description="Privacy language belongs in plain view here instead of hiding inside diagnostics or browser storage assumptions."
      eyebrow="Privacy and access"
      title="The private boundary stays plain."
    >
      <SettingsGroup
        description="This route explains access clearly without exposing implementation details, secrets, or internal identifiers."
        eyebrow="Private by design"
        items={privacy.items}
        title="What protects this book"
      />
    </UtilitySection>
  )
}

function CompatibilitySection({ compatibility, compatibilityError, compatibilityState, onRefresh }) {
  return (
    <UtilitySection
      action={{ label: 'Refresh reads', onClick: onRefresh, tone: 'secondary' }}
      className="settings-section"
      description="Compatibility stays honest and read-only here, with plain labels instead of raw keys or backend paths."
      eyebrow="Data and compatibility"
      title="Preserved sources stay explicit."
    >
      <div className="source-status-toolbar">
        <div className="source-status-copy">
          <span className="source-status-pill">{renderCompatibilityStateLabel(compatibilityState)}</span>
          <p>The routed Settings page keeps source availability visible without exposing browser-storage names, Firestore paths, or Firebase configuration.</p>
        </div>
      </div>

      {compatibilityError ? (
        <div className="dashboard-inline-alert">
          <strong>Compatibility refresh issue</strong>
          <p>{compatibilityError}</p>
        </div>
      ) : null}

      <div className="source-status-grid">
        {compatibility.items.map((item) => (
          <article className="source-card" key={item.key}>
            <div className="source-card-header">
              <strong>{item.label}</strong>
              <span className={`source-card-status source-card-status-${item.status}`}>{item.statusLabel}</span>
            </div>
            <p>{item.summary}</p>
            {item.sourceName ? (
              <div className="source-card-meta">
                <span>{item.sourceName}</span>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <ul className="settings-note-list">
        {compatibility.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </UtilitySection>
  )
}

function MigrationProgressSection({ migration }) {
  return (
    <UtilitySection
      className="settings-section"
      description="Progress stays centralized here so this page reports the current migration truth instead of scattering route status across docs and placeholders."
      eyebrow="Migration progress"
      title="The next batches stay explicit."
    >
      <div className="settings-group-grid">
        <SettingsGroup
          description="These pages are already live as protected routed React surfaces."
          eyebrow="Completed"
          items={migration.completed.map((entry) => ({
            label: entry.label,
            description: entry.summary,
            meta: entry.meta,
          }))}
          title="Completed routes"
        />

        <SettingsGroup
          description="These routes remain protected or planned, but their real page migrations are still pending."
          eyebrow="Pending"
          items={migration.pending.map((entry) => ({
            label: entry.label,
            description: entry.summary,
            meta: entry.meta,
          }))}
          title="Pending routes"
        />
      </div>

      <QuietStatus
        className="settings-gate-status"
        description={migration.note}
        eyebrow="Current gate"
        items={[
          `Jaylan: ${migration.smokeGate.jaylan}`,
          `Partner: ${migration.smokeGate.partner}`,
          `Overall: ${migration.smokeGate.overall}`,
        ]}
        title="Real-account smoke remains separate."
      />
    </UtilitySection>
  )
}

function AdvancedSection({ advanced }) {
  return (
    <UtilitySection
      className="settings-section settings-section-subdued"
      description="Development notes stay subordinate here and never become a browser inspector or Firebase console clone."
      eyebrow="Advanced"
      title="Local development status stays low emphasis."
    >
      <SettingsGroup
        description="Only non-sensitive local-development notes remain visible here."
        eyebrow="Quiet diagnostics"
        items={advanced.items}
        title="Advanced notes"
      />
    </UtilitySection>
  )
}

function DangerZoneSection({ danger }) {
  return (
    <UtilitySection
      className="settings-section utility-section-danger"
      description="Destructive account and data controls remain intentionally unavailable in this routed shell."
      eyebrow="Danger zone"
      title="No destructive actions return in this batch."
      tone="danger"
    >
      <SettingsGroup
        className="settings-group-danger-wrap"
        description="This section is informational only and deliberately offers no working actions."
        eyebrow="Informational only"
        items={danger.items}
        title="Danger zone"
        tone="danger"
      />
    </UtilitySection>
  )
}

export function SettingsView({ compatibilityError, compatibilityState, model, onRefresh }) {
  return (
    <section className="page-stack settings-page">
      <UtilityPageHeader
        aside={<OpeningNote model={model} />}
        className="settings-hero"
        description={describeSettingsState(model)}
        eyebrow="Quiet utility"
        folio={renderSettingsStatusLabel(model.status)}
        title="Settings"
      />

      <AccountSection account={model.account} />
      <WriteWorkflowPanel kind="settings" onRefresh={onRefresh} />
      <AppearanceSection appearance={model.appearance} />
      <PrivacySection privacy={model.privacy} />
      <CompatibilitySection
        compatibility={model.compatibility}
        compatibilityError={compatibilityError}
        compatibilityState={compatibilityState}
        onRefresh={onRefresh}
      />
      <MigrationProgressSection migration={model.migration} />
      <AdvancedSection advanced={model.advanced} />
      <DangerZoneSection danger={model.danger} />
    </section>
  )
}
