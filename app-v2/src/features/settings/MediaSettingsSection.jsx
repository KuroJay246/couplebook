import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Images, RefreshCw, Unplug } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button.jsx'
import { InlineAlert } from '../../components/ui/InlineAlert.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { ContentCard, Surface } from '../../components/ui/Surface.jsx'
import { useAuth } from '../../auth/useAuth.js'
import {
  beginDriveOAuthViaTrustedBackend,
  disconnectDriveViaTrustedBackend,
  isTrustedMediaBackendConfigured,
  syncDriveViaTrustedBackend,
} from '../../services/trustedMediaBackendClient.js'
import { readRuntimeEnv } from '../../data/adapterUtils.js'

function toneForDriveState(state) {
  if (state === 'connected') return 'success'
  if (state === 'connecting' || state === 'syncing') return 'info'
  if (state === 'disconnected') return 'warning'
  return 'warning'
}

function labelForDriveState(state) {
  if (state === 'connected') return 'Connected'
  if (state === 'connecting') return 'Connecting'
  if (state === 'syncing') return 'Syncing'
  if (state === 'needs-attention') return 'Needs attention'
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

function mediaCountDescription(mediaService) {
  if (mediaService.lastSyncCounts) {
    const { added = 0, unchanged = 0, removed = 0 } = mediaService.lastSyncCounts
    return `${added} added, ${unchanged} unchanged, ${removed} removed in the last sync.`
  }
  return 'Loaded from the shared Album index after Drive sync runs.'
}

function MediaConnectionSummary({ media, mediaService }) {
  const connected = mediaService.state === 'connected'
  const backendReadiness = media?.backendReadiness
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <MediaStatusCard
        description="Owner-managed media provider for the couple, separate from normal Couple Book sign-in."
        label="Google Drive"
        tone={toneForDriveState(mediaService.state)}
        value={labelForDriveState(mediaService.state)}
      />
      <MediaStatusCard
        description={mediaService.connectedAccount || media?.connectedAccount || 'Owner account required'}
        label="Connected account"
        tone={connected ? 'success' : 'warning'}
        value={connected ? 'Connected' : 'Setup required'}
      />
      <MediaStatusCard
        description={media?.approvedFolderLabel || 'Couple Book media folder'}
        label="Approved media folder"
        value="Private Drive"
      />
      <MediaStatusCard
        description={mediaCountDescription(mediaService)}
        label="Media count"
        tone={connected ? 'success' : 'warning'}
        value={connected ? 'Synced index' : 'Index first'}
      />
      <MediaStatusCard
        description={backendReadiness?.description || 'The shared media service still needs final setup before it can sync automatically.'}
        label="Shared media service"
        tone={backendReadiness?.localHandlersReady ? 'success' : 'warning'}
        value={backendReadiness?.statusLabel || 'Not verified'}
      />
      <MediaStatusCard
        description="Connect once, then use Sync now when you add or change files in the private Drive folder."
        label="Drive sync"
        tone={connected ? 'success' : 'warning'}
        value={backendReadiness?.deploymentLabel || 'Backend setup needed'}
      />
    </div>
  )
}

function MediaSyncActions({ mediaService }) {
  async function syncNow() {
    await mediaService.sync()
  }

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <PrimaryButton aria-label="Connect Google Drive" loading={mediaService.state === 'connecting'} disabled={!mediaService.canUseService} onClick={() => void mediaService.connect().catch(absorbDriveError)}>
        {mediaService.state === 'connected' ? 'Reconnect' : mediaService.state === 'connecting' ? 'Connecting' : 'Connect Google Drive'}
      </PrimaryButton>
      <SecondaryButton disabled={!mediaService.canUseService || mediaService.state === 'syncing'} onClick={() => void syncNow().catch(absorbDriveError)}><RefreshCw className="size-4" />Sync now</SecondaryButton>
      <SecondaryButton disabled={!mediaService.canUseService || mediaService.state !== 'connected'} onClick={() => void mediaService.disconnect().catch(absorbDriveError)}><Unplug className="size-4" />Disconnect</SecondaryButton>
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
  const { approvedUser, user } = useAuth()
  const env = useMemo(() => readRuntimeEnv(), [])
  const canUseService = Boolean(user && approvedUser?.coupleId && isTrustedMediaBackendConfigured(env))
  const [mediaService, setMediaService] = useState({
    connectedAccount: '',
    lastSyncCounts: null,
    message: '',
    state: canUseService ? 'disconnected' : 'needs-attention',
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (url.searchParams.get('media') !== 'connected') return
    setMediaService((current) => ({
      ...current,
      connectedAccount: media?.connectedAccount || current.connectedAccount,
      message: 'Google Drive is connected. Run Sync now to refresh Album.',
      state: 'connected',
    }))
    url.searchParams.delete('media')
    window.history.replaceState({}, '', url.toString())
  }, [media?.connectedAccount])

  async function connectTrustedDrive() {
    setMediaService((current) => ({ ...current, message: '', state: 'connecting' }))
    try {
      const returnUrl = `${window.location.origin}/settings`
      const result = await beginDriveOAuthViaTrustedBackend({
        coupleId: approvedUser.coupleId,
        returnUrl,
        user,
      })
      if (!result.authorizationUrl) throw new Error('Google Drive authorization could not start.')
      window.location.assign(result.authorizationUrl)
    } catch (error) {
      setMediaService((current) => ({
        ...current,
        message: error?.message || 'Google Drive authorization could not start.',
        state: 'needs-attention',
      }))
      throw error
    }
  }

  async function syncTrustedDrive() {
    setMediaService((current) => ({ ...current, message: '', state: 'syncing' }))
    try {
      const result = await syncDriveViaTrustedBackend({ coupleId: approvedUser.coupleId, user })
      setMediaService((current) => ({
        ...current,
        lastSyncCounts: result.counts || null,
        message: 'Drive sync finished.',
        state: 'connected',
      }))
    } catch (error) {
      setMediaService((current) => ({
        ...current,
        message: error?.message || 'Drive sync could not finish.',
        state: 'needs-attention',
      }))
      throw error
    }
  }

  async function disconnectTrustedDrive() {
    setMediaService((current) => ({ ...current, message: '', state: 'syncing' }))
    try {
      await disconnectDriveViaTrustedBackend({ coupleId: approvedUser.coupleId, user })
      setMediaService((current) => ({
        ...current,
        connectedAccount: '',
        lastSyncCounts: null,
        message: 'Google Drive was disconnected.',
        state: 'disconnected',
      }))
    } catch (error) {
      setMediaService((current) => ({
        ...current,
        message: error?.message || 'Google Drive could not be disconnected.',
        state: 'needs-attention',
      }))
      throw error
    }
  }

  const trustedMediaService = {
    ...mediaService,
    canUseService,
    connect: connectTrustedDrive,
    disconnect: disconnectTrustedDrive,
    sync: syncTrustedDrive,
  }

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

      <MediaConnectionSummary media={media} mediaService={trustedMediaService} />
      <MediaSyncActions mediaService={trustedMediaService} />
      <SharedAlbumShortcut sharedAlbum={media?.sharedAlbum} />

      {trustedMediaService.message ? (
        <InlineAlert
          className="mt-4"
          tone={trustedMediaService.state === 'connected' || trustedMediaService.state === 'disconnected' ? 'success' : 'warning'}
          title={trustedMediaService.state === 'connected' ? 'Media sync updated' : 'Google Drive needs owner attention'}
          description={trustedMediaService.message}
        />
      ) : null}

      {!canUseService ? (
        <InlineAlert
          className="mt-5"
          tone="warning"
          title="Media service needs attention"
          description="Sign in with an approved Couple Book account before connecting Google Drive."
        />
      ) : null}

      <MediaArchitectureItems items={media?.items} />
    </Surface>
  )
}
