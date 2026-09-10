import { ExternalLink, Images, RefreshCw, Unplug } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button.jsx'
import { InlineAlert } from '../../components/ui/InlineAlert.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { ContentCard, Surface } from '../../components/ui/Surface.jsx'
import { useGoogleDriveConnection } from '../media/useGoogleDriveConnection.js'

function toneForDriveState(state) {
  if (state === 'connected') return 'success'
  if (state === 'connecting') return 'info'
  if (state === 'disconnected') return 'warning'
  return 'warning'
}

function labelForDriveState(state) {
  if (state === 'connected') return 'Connected'
  if (state === 'connecting') return 'Connecting'
  if (state === 'wrong-account') return 'Wrong account'
  if (state === 'folder-inaccessible') return 'Folder inaccessible'
  if (state === 'reconnect-required') return 'Reconnect required'
  if (state === 'token-expired') return 'Authorization expired'
  if (state === 'temporary-failure') return 'Action required'
  return 'Not connected'
}

function absorbDriveError(error) {
  return error
}

function MediaStatusCard({ description, label, tone = 'info', value }) {
  return (
    <ContentCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>{label}</p>
          <p className="cb-body-copy mt-2 text-sm">{description}</p>
        </div>
        <StatusBadge tone={tone}>{value}</StatusBadge>
      </div>
    </ContentCard>
  )
}

function mediaCountDescription(drive) {
  if (drive.state !== 'connected') return 'Loaded from Firestore media index when backend sync is available'
  return `${drive.files.length}${drive.hasMoreFiles ? '+' : ''} files listed in this owner session`
}

function MediaConnectionSummary({ drive, media }) {
  const connected = drive.state === 'connected'
  const backendReadiness = media?.backendReadiness
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <MediaStatusCard
        description="Owner-managed media provider for the couple, separate from normal Couple Book sign-in."
        label="Google Drive"
        tone={toneForDriveState(drive.state)}
        value={labelForDriveState(drive.state)}
      />
      <MediaStatusCard
        description={media?.connectedAccount || 'Owner account required'}
        label="Connected account"
        tone={connected ? 'success' : 'warning'}
        value={connected ? 'Verified this session' : 'Owner setup'}
      />
      <MediaStatusCard
        description={media?.approvedFolderLabel || 'Couple Book media folder'}
        label="Approved media folder"
        value="Private Drive"
      />
      <MediaStatusCard
        description={mediaCountDescription(drive)}
        label="Media count"
        tone={connected ? 'success' : 'warning'}
        value={connected ? 'Session list' : 'Index first'}
      />
      <MediaStatusCard
        description={backendReadiness?.description || 'Trusted Drive backend readiness is not available in this build.'}
        label="Trusted backend"
        tone={backendReadiness?.localHandlersReady ? 'success' : 'warning'}
        value={backendReadiness?.statusLabel || 'Not verified'}
      />
      <MediaStatusCard
        description="Persistent Drive OAuth refresh storage, Drive webhooks, protected media delivery, and live media-index rules still require explicit owner-approved deployment work."
        label="Release blockers"
        tone="warning"
        value={backendReadiness?.deploymentLabel || 'Owner approval required'}
      />
    </div>
  )
}

function MediaSyncActions({ drive }) {
  async function syncNow() {
    if (drive.state === 'connected') {
      await drive.refreshListing()
      return
    }
    await drive.retryAccess()
  }

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <PrimaryButton aria-label="Connect Google Drive" loading={drive.state === 'connecting'} onClick={() => void drive.connect().catch(absorbDriveError)}>
        {drive.state === 'connected' ? 'Reconnect' : drive.state === 'connecting' ? 'Connecting' : 'Connect Google Drive'}
      </PrimaryButton>
      <SecondaryButton disabled={drive.state !== 'connected'} onClick={() => void syncNow().catch(absorbDriveError)}><RefreshCw className="size-4" />Sync now</SecondaryButton>
      <SecondaryButton disabled={drive.state !== 'connected'} onClick={drive.disconnect}><Unplug className="size-4" />Disconnect</SecondaryButton>
    </div>
  )
}

function MediaArchitectureItems({ items = [] }) {
  return (
    <div className="mt-5 grid gap-3">
      {items.map((item) => (
        <MediaStatusCard
          description={item.description}
          key={item.label}
          label={item.label}
          value={item.meta}
        />
      ))}
      <SecondaryButton as={Link} to="/gallery">Open Album</SecondaryButton>
    </div>
  )
}

function SharedAlbumShortcut({ sharedAlbum }) {
  const configured = sharedAlbum?.status === 'configured' && sharedAlbum?.url

  return (
    <ContentCard className="mt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>{sharedAlbum?.title || 'Shared iCloud Album shortcut'}</p>
          <p className="cb-body-copy mt-2 text-sm">
            {sharedAlbum?.description || 'Optional external shortcut for a shared iCloud album. Couple Book does not scrape iCloud or use this link for authorization.'}
          </p>
          <p className="cb-body-copy mt-2 text-xs">{sharedAlbum?.boundary || 'Convenience link only'}</p>
        </div>
        <StatusBadge tone={configured ? 'success' : 'warning'}>{sharedAlbum?.statusLabel || 'Not configured'}</StatusBadge>
      </div>
      {configured ? (
        <div className="mt-4">
          <SecondaryButton as="a" href={sharedAlbum.url} rel="noreferrer noopener" target="_blank">
            <ExternalLink className="size-4" aria-hidden="true" />
            Open Shared Album
          </SecondaryButton>
        </div>
      ) : null}
    </ContentCard>
  )
}

export function MediaSettingsSection({ media }) {
  const drive = useGoogleDriveConnection()

  return (
    <Surface tone="soft" aria-label="Media and sync settings">
      <div className="flex items-start gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-2xl"
          style={{
            background: 'color-mix(in srgb, var(--cb-accent-soft) 88%, transparent)',
            color: 'var(--cb-accent)',
          }}
        >
          <Images className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="cb-kicker">Media & Sync</p>
          <h3 className="cb-page-title mt-2 text-2xl">{media?.title}</h3>
          <p className="cb-body-copy mt-2 text-sm">{media?.description}</p>
        </div>
      </div>

      <MediaConnectionSummary drive={drive} media={media} />
      <MediaSyncActions drive={drive} />
      <SharedAlbumShortcut sharedAlbum={media?.sharedAlbum} />

      {drive.message ? (
        <InlineAlert
          className="mt-4"
          tone={drive.state === 'wrong-account' || drive.state === 'folder-inaccessible' ? 'warning' : 'error'}
          title="Google Drive needs owner attention"
          description={drive.message}
        />
      ) : null}

      <InlineAlert
        className="mt-5"
        tone="warning"
        title="Persistent background sync requires trusted backend approval"
        description={media?.backendBoundary || 'The browser can prove owner authorization locally, but refresh credentials, Drive Changes sync, webhook renewal, and protected thumbnail delivery must run on a trusted backend before this becomes a persistent couple-level media provider.'}
      />

      <MediaArchitectureItems items={media?.items} />
    </Surface>
  )
}
