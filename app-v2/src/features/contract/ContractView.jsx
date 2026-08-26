import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button.jsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { InlineAlert } from '../../components/ui/InlineAlert.jsx'
import { LoadingState } from '../../components/ui/LoadingState.jsx'
import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { ContentCard, Surface } from '../../components/ui/Surface.jsx'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'

export function ContractView({ compatibilityError, compatibilityState, model, onRefresh }) {
  const writer = useOwnerWrite(onRefresh)
  const [status, setStatus] = useState({ kind: '', message: '', saving: false })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const currentAcceptance = model.acceptance?.currentUser
  const accepted = currentAcceptance?.status === 'accepted'
  const agreementSections = model.agreement?.sections || []
  const history = model.history || []
  const acceptanceCards = [model.acceptance?.currentUser, model.acceptance?.partner].filter(Boolean)

  async function handleAccept() {
    setStatus({ kind: '', message: '', saving: true })
    try {
      await writer.acceptContract()
      setStatus({ kind: 'success', message: 'Contract acceptance recorded.', saving: false })
      setConfirmOpen(false)
    } catch (error) {
      setStatus({ kind: 'error', message: error?.message || 'Acceptance could not be recorded.', saving: false })
    }
  }

  if (compatibilityState === 'loading') {
    return <LoadingState message="Loading Contract..." />
  }

  if (compatibilityError || model.status === 'invalid') {
    return <ErrorState title="Contract could not be loaded" message={compatibilityError || 'The Contract view is not available right now.'} onRetry={onRefresh} />
  }

  return (
    <section className="space-y-5" data-route="contract">
      <PageHeader
        eyebrow="Relationship Contract"
        title="Shared Relationship Contract"
        description="The promises you are keeping and the deliberate acceptance that makes this page matter."
        actions={(
          <>
            {model.agreement?.version ? <StatusBadge tone="info">Version {model.agreement.version}</StatusBadge> : null}
            <PrimaryButton disabled={accepted} loading={status.saving} onClick={() => setConfirmOpen(true)}>
              {accepted ? 'Accepted' : 'Accept contract'}
            </PrimaryButton>
          </>
        )}
      />

      {status.message ? <InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /> : null}
      {model.sourceStatus?.warnings?.length ? (
        <InlineAlert
          tone="info"
          title="Contract source notes"
          description={`The current Contract view loaded with ${model.sourceStatus.warnings.length} review note${model.sourceStatus.warnings.length === 1 ? '' : 's'}.`}
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <Surface>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Agreement</p>
          <h3 className="mt-2 font-serif text-3xl text-[var(--cb-text)]">{model.agreement?.title || 'Our agreement'}</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--cb-text-secondary)]">{model.agreement?.introduction}</p>
          <div className="mt-5 grid gap-4">
            {agreementSections.length > 0 ? agreementSections.map((section) => (
              <ContentCard key={section.id}>
                <h4 className="text-lg font-bold text-[var(--cb-text)]">{section.heading}</h4>
                {section.paragraphs?.map((paragraph) => <p className="mt-3 text-sm leading-6 text-[var(--cb-text-secondary)]" key={paragraph}>{paragraph}</p>)}
                {section.clauses?.length > 0 ? (
                  <ul className="mt-3 grid gap-2 pl-5 text-sm leading-6 text-[var(--cb-text-secondary)]">
                    {section.clauses.map((clause) => <li key={clause}>{clause}</li>)}
                  </ul>
                ) : null}
              </ContentCard>
            )) : (
              <EmptyState title="Agreement wording is unavailable here." description="This page keeps the protected contract status in place while agreement text waits for an authorized runtime source." />
            )}
          </div>
        </Surface>

        <div className="grid gap-5">
          <Surface tone="soft">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Acceptance</p>
            <h3 className="mt-2 font-serif text-2xl text-[var(--cb-text)]">Current status</h3>
            <div className="mt-5 grid gap-3">
              {acceptanceCards.map((record) => (
                <ContentCard key={record.displayName}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[var(--cb-text)]">{record.displayName}</p>
                      <p className="mt-2 text-sm text-[var(--cb-text-secondary)]">{record.acceptedAtLabel}</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">{record.note}</p>
                    </div>
                    <StatusBadge tone={record.status === 'accepted' ? 'success' : record.status === 'unavailable' ? 'error' : 'warning'}>
                      {record.label}
                    </StatusBadge>
                  </div>
                </ContentCard>
              ))}
            </div>
          </Surface>

          <Surface tone="soft">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Protected boundaries</p>
            <div className="mt-5 grid gap-3">
              {(model.privacy?.items || []).map((item) => (
                <ContentCard key={item.label}>
                  <p className="text-sm font-bold text-[var(--cb-text)]">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">{item.description}</p>
                </ContentCard>
              ))}
            </div>
          </Surface>
        </div>
      </div>

      {history.length > 0 ? (
        <Surface>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">History</p>
          <h3 className="mt-2 font-serif text-2xl text-[var(--cb-text)]">Acceptance history</h3>
          <div className="mt-5 grid gap-3">
            {history.slice(0, 6).map((entry) => (
              <ContentCard className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between" key={entry.id}>
                <div>
                  <p className="text-sm font-bold text-[var(--cb-text)]">{entry.actorDisplayName}</p>
                  <p className="mt-2 text-sm text-[var(--cb-text-secondary)]">{entry.title}</p>
                </div>
                <div className="text-sm text-[var(--cb-text-muted)] sm:text-right">
                  <p>{entry.dateLabel}</p>
                  <p className="mt-1">{entry.note}</p>
                </div>
              </ContentCard>
            ))}
          </div>
        </Surface>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <SecondaryButton as={Link} to="/profile">Back to Us</SecondaryButton>
        <SecondaryButton as={Link} to="/favorites">Open Favorites</SecondaryButton>
      </div>

      <ConfirmDialog
        confirmLabel="Record acceptance"
          message="This records your acceptance status. Continue only after you have read the agreement carefully."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleAccept}
        open={confirmOpen && !accepted}
        pending={status.saving}
        recordName={currentAcceptance?.displayName}
        title="Record your acceptance?"
      />
    </section>
  )
}
