import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Film, Heart, ImageIcon, Images, RotateCcw, SlidersHorizontal, Upload, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DangerButton, PrimaryButton, SecondaryButton, TextButton } from '../../components/ui/Button.jsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { FormField, SelectField, TextAreaField, TextField } from '../../components/ui/FormField.jsx'
import { InlineAlert } from '../../components/ui/InlineAlert.jsx'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton.jsx'
import { LoadingState } from '../../components/ui/LoadingState.jsx'
import { MediaPreview } from '../../components/ui/MediaPreview.jsx'
import { SearchField } from '../../components/ui/SearchField.jsx'
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { ContentCard, Surface } from '../../components/ui/Surface.jsx'
import { Toast } from '../../components/ui/Toast.jsx'
import { useDialogAccessibility } from '../../components/ui/useDialogAccessibility.js'
import { createObjectUrlRegistry } from '../../services/objectUrlLifecycle.js'
import { formatBytes } from '../../services/mediaUploadService.js'
import { fetchMediaBlobViaTrustedBackend, isTrustedMediaBackendConfigured } from '../../services/trustedMediaBackendClient.js'
import { groupGalleryItemsByDate, selectFilteredGalleryItems } from './gallerySelectors.js'
import { QUEUE_STATUS, queueStatusLabel, queueStatusTone } from './useMediaUploadQueue.js'
import { useMediaUploadQueue } from './useMediaUploadQueue.js'
import { useAuth } from '../../auth/useAuth.js'

const FILTERS = [
  { key: 'all', label: 'All media' },
  { key: 'photos', label: 'Photos' },
  { key: 'videos', label: 'Videos' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'unlinked', label: 'Unlinked' },
]
const MAX_THUMBNAIL_PRELOAD_ITEMS = 160
const THUMBNAIL_PRELOAD_CONCURRENCY = 8

function galleryTileLabel(item) {
  return [
    item.title,
    item.typeLabel,
    item.displayDate,
    item.media.kind === 'video' ? 'Open video memory details' : 'Open photo memory details',
  ]
    .filter(Boolean)
    .join(', ')
}

function mediaTileAspectStyle(item) {
  const width = Number(item.media.width)
  const height = Number(item.media.height)
  if (width > 0 && height > 0) {
    return { aspectRatio: `${width} / ${height}` }
  }
  return { aspectRatio: item.media.kind === 'video' ? '16 / 9' : '4 / 3' }
}

function formatDuration(durationMillis) {
  const totalSeconds = Math.round(Number(durationMillis || 0) / 1000)
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return ''
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function getPreviewPlaceholder(item) {
  const media = item?.media || {}
  const isVideo = media.kind === 'video'
  if (media.status === 'private-legacy-reference') {
    return {
      icon: isVideo ? Film : ImageIcon,
      label: isVideo ? 'Archived video reference' : 'Archived photo reference',
    }
  }
  if (media.status === 'drive-indexed') {
    return {
      icon: isVideo ? Film : ImageIcon,
      label: isVideo ? 'Private video indexed' : 'Private photo indexed',
    }
  }
  return {
    icon: isVideo ? Film : ImageIcon,
    label: isVideo ? 'Video memory' : 'Photo memory',
  }
}

function GalleryTileMedia({ isIndexedDriveMedia, previewKind, previewPlaceholder, previewUrl }) {
  const PreviewIcon = previewPlaceholder.icon
  if (previewUrl) {
    return (
      <MediaPreview
        alt=""
        className="h-full w-full"
        controls={false}
        kind={previewKind}
        objectFit="cover"
        src={previewUrl}
      />
    )
  }

  if (isIndexedDriveMedia) {
    return (
      <span className="gallery-index-placeholder" aria-hidden="true">
        <PreviewIcon className="size-7" />
        <span>{previewPlaceholder.label}</span>
      </span>
    )
  }

  return (
    <div className="gallery-tile-art-empty">
      <PreviewIcon className="size-8" />
      <span>{previewPlaceholder.label}</span>
    </div>
  )
}

function GalleryTileBadges({ duration, isVideo, item, selected, selectionMode, showTitle }) {
  return (
    <>
      {showTitle ? <span className="gallery-index-overlay"><span className="gallery-index-title">{item.title}</span></span> : null}
      {selectionMode ? <span className={item.media.status === 'drive-indexed' ? 'gallery-index-selection' : 'gallery-selection-pill'} aria-hidden="true">{selected ? 'Selected' : 'Select'}</span> : null}
      {item.media.favorite ? <span className="gallery-index-favorite" aria-hidden="true"><Heart className="size-3.5" fill="currentColor" /></span> : null}
      {isVideo ? <span className="gallery-index-play" aria-hidden="true">{duration || <Film className="size-4" />}</span> : null}
    </>
  )
}

function useGalleryTileAction({ item, onSelect, onToggleSelection, selectionMode }) {
  return () => {
    if (selectionMode) {
      onToggleSelection(item)
      return
    }
    onSelect(item)
  }
}

function IndexedGalleryTile({ item, onSelect, onToggleSelection, previewKind, previewPlaceholder, previewUrl, selected, selectionMode, showTitle }) {
  const isVideo = item.media.kind === 'video'
  const tileAction = useGalleryTileAction({ item, onSelect, onToggleSelection, selectionMode })

  return (
    <article className={`gallery-index-tile cb-gallery-tile ${isVideo ? 'is-video' : 'is-photo'} ${selected ? 'is-selected' : ''}`}>
      <button
        aria-pressed={selectionMode ? selected : undefined}
        aria-label={selectionMode ? `${selected ? 'Deselect' : 'Select'} ${galleryTileLabel(item)}` : galleryTileLabel(item)}
        className="gallery-index-tile-button"
        onClick={tileAction}
        style={mediaTileAspectStyle(item)}
        type="button"
      >
        <GalleryTileMedia isIndexedDriveMedia previewKind={previewKind} previewPlaceholder={previewPlaceholder} previewUrl={previewUrl} />
        <GalleryTileBadges duration="" isVideo={isVideo} item={item} selected={selected} selectionMode={selectionMode} showTitle={showTitle} />
      </button>
    </article>
  )
}

function StandardGalleryTile({ duration, item, onSelect, onToggleSelection, previewKind, previewPlaceholder, previewUrl, selected, selectionMode, showTitle }) {
  const isVideo = item.media.kind === 'video'
  const tileAction = useGalleryTileAction({ item, onSelect, onToggleSelection, selectionMode })

  return (
    <article className={`cb-gallery-tile gallery-item ${selected ? 'is-selected' : ''}`}>
      <button
        aria-pressed={selectionMode ? selected : undefined}
        aria-label={selectionMode ? `${selected ? 'Deselect' : 'Select'} ${galleryTileLabel(item)}` : galleryTileLabel(item)}
        className={`gallery-media-frame ${isVideo ? 'is-video' : item.media.kind === 'image' ? 'is-photo' : item.specialMoment.isSpecial ? 'is-special' : 'is-memory'}`}
        onClick={tileAction}
        style={mediaTileAspectStyle(item)}
        type="button"
      >
        <div className="gallery-tile-art" aria-hidden="true">
          <GalleryTileMedia isIndexedDriveMedia={false} previewKind={previewKind} previewPlaceholder={previewPlaceholder} previewUrl={previewUrl} />
        </div>
        <GalleryTileBadges duration={duration} isVideo={isVideo} item={item} selected={selected} selectionMode={selectionMode} showTitle={showTitle} />
      </button>
    </article>
  )
}

function GalleryTile({ item, onSelect, onToggleSelection, selected = false, selectionMode = false }) {
  const isVideo = item.media.kind === 'video'
  const previewUrl = item.media.previewUrl || item.media.thumbnailUrl || ''
  const previewKind = item.media.previewKind || (isVideo ? 'video' : 'image')
  const isIndexedDriveMedia = item.media.status === 'drive-indexed'
  const previewPlaceholder = getPreviewPlaceholder(item)
  const duration = formatDuration(item.media.durationMillis)
  const showTitle = item.titleKind === 'authored' || item.descriptionKind === 'authored'

  if (isIndexedDriveMedia) {
    return <IndexedGalleryTile item={item} onSelect={onSelect} onToggleSelection={onToggleSelection} previewKind={previewKind} previewPlaceholder={previewPlaceholder} previewUrl={previewUrl} selected={selected} selectionMode={selectionMode} showTitle={showTitle} />
  }

  return <StandardGalleryTile duration={duration} item={item} onSelect={onSelect} onToggleSelection={onToggleSelection} previewKind={previewKind} previewPlaceholder={previewPlaceholder} previewUrl={previewUrl} selected={selected} selectionMode={selectionMode} showTitle={showTitle} />
}

function withTrustedPreview(item, previewUrls) {
  const mediaId = item?.media?.id || item?.mediaIndexId || ''
  const preview = mediaId ? previewUrls[mediaId] || null : null
  const previewUrl = typeof preview === 'string' ? preview : preview?.url || ''
  if (!previewUrl) return item
  const previewKind = typeof preview === 'string' ? item.media?.kind || 'image' : preview.kind || item.media?.kind || 'image'
  return {
    ...item,
    media: {
      ...item.media,
      previewKind,
      previewMode: typeof preview === 'string' ? 'stream' : preview.mode || 'thumbnail',
      previewUrl,
      thumbnailUrl: previewUrl,
    },
  }
}

function getLightboxPreviewState(item) {
  const isVideo = item.media.kind === 'video'
  const previewKind = item.media.previewKind || (isVideo ? 'video' : 'image')
  const mediaUrl = item.media.previewUrl || item.media.thumbnailUrl || ''
  const hasVideoStream = isVideo && previewKind === 'video' && mediaUrl

  return {
    hasMedia: Boolean(mediaUrl || isVideo),
    hasVideoStream,
    isVideo,
    mediaUrl,
    posterUrl: isVideo && !hasVideoStream ? mediaUrl : '',
    viewerKind: isVideo ? 'video' : previewKind,
    viewerSrc: isVideo ? (hasVideoStream ? mediaUrl : '') : mediaUrl,
  }
}

function LightboxStage({ item, onLoadStream, streamStatus }) {
  const preview = getLightboxPreviewState(item)
  if (!preview.hasMedia) {
    return <div className="cb-media-viewer-empty">{preview.isVideo ? <Film className="size-10" /> : <ImageIcon className="size-10" />}</div>
  }
  const {
    hasVideoStream,
    isVideo,
    posterUrl,
    viewerKind,
    viewerSrc,
  } = preview

  return (
    <MediaPreview
      alt={item.title}
      className="cb-media-viewer-media"
      controls={isVideo && hasVideoStream}
      description={streamStatus?.error || (isVideo ? 'The video original is private. Open a temporary playback session when you want to watch it.' : '')}
      kind={viewerKind}
      loading={Boolean(streamStatus?.loading)}
      objectFit="contain"
      onLoadRequest={isVideo ? onLoadStream : undefined}
      poster={posterUrl}
      src={viewerSrc}
      title={isVideo ? 'Private video preview' : ''}
    />
  )
}

function LightboxActions({ canStep, hasVerifiedPrivateMedia, item, onNext, onPrevious, onRemove }) {
  return (
    <div className="flex flex-wrap gap-2">
      {canStep ? <SecondaryButton className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={onPrevious}>Previous</SecondaryButton> : null}
      {canStep ? <SecondaryButton className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={onNext}>Next</SecondaryButton> : null}
      {hasVerifiedPrivateMedia ? <SecondaryButton className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={() => onRemove(item)}>Remove</SecondaryButton> : null}
      {item.media.status === 'drive-indexed' ? <DangerButton onClick={() => onRemove(item, { deleteOriginal: true })}>Delete original</DangerButton> : null}
    </div>
  )
}

function GalleryLightbox({ item, items, onClose, onLoadStream, onNext, onPrevious, onRemove, streamStatus }) {
  const titleId = useId()
  const onNextRef = useRef(onNext)
  const onPreviousRef = useRef(onPrevious)
  const closeButtonRef = useRef(null)
  const dialogRef = useDialogAccessibility({
    active: Boolean(item),
    initialFocusRef: closeButtonRef,
    onClose,
  })
  const hasVerifiedPrivateMedia = ['storage-verified', 'drive-verified', 'drive-indexed'].includes(item?.media?.status)

  useEffect(() => {
    onNextRef.current = onNext
    onPreviousRef.current = onPrevious
  }, [onNext, onPrevious])

  useEffect(() => {
    if (!item) return undefined

    function handleKeyDown(event) {
      if (event.key === 'ArrowRight') onNextRef.current()
      if (event.key === 'ArrowLeft') onPreviousRef.current()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [item])

  if (!item) return null
  const currentIndex = items.findIndex((entry) => entry.key === item.key)
  const canStep = items.length > 1 && currentIndex >= 0

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080508] p-3">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close Album viewer" />
      <dialog
        open
        ref={dialogRef}
        aria-labelledby={titleId}
        className="cb-media-viewer relative h-[calc(100vh-1.5rem)] w-full max-w-7xl overflow-hidden text-white"
      >
        <div className="cb-media-viewer-stage">
          <LightboxStage item={item} onLoadStream={onLoadStream} streamStatus={streamStatus} />
        </div>
        <div className="cb-media-viewer-top">
          <TextButton aria-label="Close" className="text-white hover:bg-white/10" onClick={onClose} ref={closeButtonRef}>Close</TextButton>
        </div>
        <div className="cb-media-viewer-bottom">
          <div>
            <h3 id={titleId}>{item.title}</h3>
            <p>{item.displayDate || ''}</p>
          </div>
          <LightboxActions canStep={canStep} hasVerifiedPrivateMedia={hasVerifiedPrivateMedia} item={item} onNext={onNext} onPrevious={onPrevious} onRemove={onRemove} />
        </div>
      </dialog>
    </div>,
    document.body,
  )
}

function AlbumSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <LoadingSkeleton className="h-64" />
      <LoadingSkeleton className="h-64" />
      <LoadingSkeleton className="h-64" />
    </div>
  )
}

function UploadQueueActions({ editable, item, onCancel, onRemove, onRetry, showCancel, showRetry }) {
  return (
    <div className="flex flex-wrap gap-2">
      {showCancel ? <SecondaryButton aria-label={`Cancel upload for ${item.fileName}`} onClick={() => onCancel(item.id)}><XCircle className="size-4" />Cancel</SecondaryButton> : null}
      {showRetry ? <SecondaryButton aria-label={`Retry upload for ${item.fileName}`} onClick={() => onRetry(item.id)}><RotateCcw className="size-4" />Retry</SecondaryButton> : null}
      {editable ? <TextButton onClick={() => onRemove(item.id)}>Remove</TextButton> : null}
    </div>
  )
}

function UploadQueuePreview({ item }) {
  if (!item.previewUrl) return null

  return (
    <div className="overflow-hidden rounded-[20px] border border-[var(--cb-border)] bg-[var(--cb-accent-soft)]">
      <MediaPreview
        alt={`Preview for ${item.fileName}`}
        className={item.kind === 'video' ? 'aspect-video w-full' : 'aspect-[4/3] w-full'}
        kind={item.kind}
        objectFit={item.kind === 'video' ? 'contain' : 'cover'}
        src={item.previewUrl}
      />
    </div>
  )
}

function UploadQueueFields({ editable, item, onChange }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <FormField label="Memory title">
        <TextField disabled={!editable} onChange={(event) => onChange(item.id, { title: event.target.value })} value={item.title} />
      </FormField>
      <FormField label="Date">
        <TextField disabled={!editable} onChange={(event) => onChange(item.id, { date: event.target.value })} type="date" value={item.date} />
      </FormField>
      <FormField className="xl:col-span-2" label="Description">
        <TextAreaField disabled={!editable} onChange={(event) => onChange(item.id, { description: event.target.value })} rows={4} value={item.description} />
      </FormField>
      <FormField label="Tags">
        <TextField disabled={!editable} onChange={(event) => onChange(item.id, { tags: event.target.value })} placeholder="date night, travel, keepsake" value={item.tags} />
      </FormField>
      <FormField label="Media note">
        <TextField disabled={!editable} onChange={(event) => onChange(item.id, { mediaNote: event.target.value })} placeholder="Private album note" value={item.mediaNote} />
      </FormField>
    </div>
  )
}

function UploadQueueCard({ item, onCancel, onChange, onRemove, onRetry }) {
  const editable = [QUEUE_STATUS.queued, QUEUE_STATUS.failed, QUEUE_STATUS.cancelled, QUEUE_STATUS.orphanedUpload, QUEUE_STATUS.reconnectRequired].includes(item.status)
  const showRetry = [QUEUE_STATUS.failed, QUEUE_STATUS.cancelled, QUEUE_STATUS.orphanedUpload, QUEUE_STATUS.reconnectRequired].includes(item.status) && item.retryable !== false
  const showCancel = [QUEUE_STATUS.validating, QUEUE_STATUS.hashing, QUEUE_STATUS.uploading, QUEUE_STATUS.finalizing, QUEUE_STATUS.cancelling].includes(item.status)
  const progressValue = item.status === QUEUE_STATUS.saved ? 100 : Math.max(0, item.progress || 0)

  return (
    <ContentCard className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={item.kind === 'video' ? 'info' : 'success'}>
              {item.kind === 'video' ? 'Video upload' : 'Photo upload'}
            </StatusBadge>
            <StatusBadge tone={queueStatusTone(item.status)}>
              {queueStatusLabel(item.status)}
            </StatusBadge>
          </div>
          <p className="mt-3 text-sm font-bold text-[var(--cb-text)]">{item.fileName}</p>
          <p className="mt-1 text-sm text-[var(--cb-text-muted)]">{formatBytes(item.sizeBytes)}</p>
          <p className="mt-1 text-xs text-[var(--cb-text-muted)]">
            {progressValue}% • {formatBytes(item.bytesTransferred || 0)} of {formatBytes(item.totalBytes || item.sizeBytes || 0)}
          </p>
        </div>
        <UploadQueueActions editable={editable} item={item} onCancel={onCancel} onRemove={onRemove} onRetry={onRetry} showCancel={showCancel} showRetry={showRetry} />
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[#f3e7ec]">
        <div className={`h-full rounded-full transition-all ${item.status === QUEUE_STATUS.failed ? 'bg-[#d96b8a]' : item.status === QUEUE_STATUS.saved ? 'bg-[#4f8a63]' : 'bg-[var(--cb-accent)]'}`} style={{ width: `${progressValue}%` }} />
      </div>

      {item.error ? <InlineAlert description={item.error} tone="error" /> : null}

      <UploadQueuePreview item={item} />
      <UploadQueueFields editable={editable} item={item} onChange={onChange} />
    </ContentCard>
  )
}

function GalleryFileInput({ fileInputRef, uploadQueue }) {
  return (
    <input
      ref={fileInputRef}
      accept={uploadQueue.acceptedTypes}
      className="hidden"
      multiple
      onChange={(event) => {
        uploadQueue.addFiles(event.target.files)
        event.target.value = ''
      }}
      type="file"
    />
  )
}

function GalleryHeader({ manageUploadsOpen, model, onAdd, onToggleManage, uploadQueue }) {
  return (
    <div className="cb-album-header">
      <div>
        <h2>Album</h2>
        <p>{model.summary.totalMemories} items</p>
      </div>
      <div className="cb-album-actions">
        <SecondaryButton aria-expanded={manageUploadsOpen} onClick={onToggleManage}><SlidersHorizontal className="size-4" />Manage</SecondaryButton>
        {uploadQueue.canUpload
          ? <PrimaryButton onClick={onAdd}><Upload className="size-4" />Add</PrimaryButton>
          : <SecondaryButton as={Link} to="/settings"><Upload className="size-4" />Sync</SecondaryButton>}
      </div>
    </div>
  )
}

function GalleryToolbar({ filter, filteredCount, onClearSelection, onFilter, onSearch, onToggleSelectionMode, onYear, search, selectedCount, selectionMode, year, years }) {
  return (
    <div className="cb-album-toolbar">
      <div className="cb-album-filter-row">
        <SegmentedControl
          label="Media type"
          onChange={onFilter}
          options={FILTERS.map((entry) => ({ value: entry.key, label: entry.label }))}
          value={filter}
        />
        <FormField label="Year">
          <SelectField onChange={(event) => onYear(event.target.value)} value={year}>
            <option value="all">All years</option>
            {years.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
          </SelectField>
        </FormField>
        <SearchField label="Search Album" onChange={(event) => onSearch(event.target.value)} placeholder="Search dates, titles, and tags" value={search} />
      </div>
      <div className="cb-album-toolbar-meta">
        <p className="text-sm text-[var(--cb-text-secondary)]">{filteredCount} shown</p>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton aria-pressed={selectionMode} onClick={onToggleSelectionMode}>{selectionMode ? 'Done' : 'Select'}</SecondaryButton>
          {selectionMode ? <TextButton disabled={selectedCount === 0} onClick={onClearSelection}>Clear</TextButton> : null}
        </div>
      </div>
    </div>
  )
}

function SelectionToolbar({ selectedCount, selectionMode }) {
  if (!selectionMode) return null

  return (
    <Surface aria-label="Album selection toolbar" tone="soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="cb-kicker">Selection</p>
          <p className="mt-1 text-sm text-[var(--cb-text-secondary)]">
            {selectedCount === 0 ? 'Choose photos or videos to prepare a batch action.' : `${selectedCount} ${selectedCount === 1 ? 'item' : 'items'} selected.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton disabled={selectedCount === 0}>Favorite selected</SecondaryButton>
          <SecondaryButton disabled={selectedCount === 0}>Link to memory</SecondaryButton>
          <DangerButton disabled={selectedCount === 0}>Remove selected</DangerButton>
        </div>
      </div>
    </Surface>
  )
}

function ReconciliationPanel({ archivedReferenceCount, reconciliation }) {
  return (
    <Surface aria-label="Album source reconciliation" tone="soft">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Private media index</p>
      <h3 className="mt-2 font-serif text-2xl text-[var(--cb-text)]">Album sources are reconciled</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">
        {Number(reconciliation.activeAlbumItems || reconciliation.totalItems || 0)} Album items are shown from {Number(reconciliation.authoritativeIndexedCount || 0)} trusted Drive records.
        {archivedReferenceCount > 0 ? ` ${archivedReferenceCount} archived Story references are kept out of the Album grid until they are linked to trusted private media.` : ''}
        {Number(reconciliation.duplicateHistoricalItems || 0) > 0 ? ` ${Number(reconciliation.duplicateHistoricalItems)} older duplicate ${Number(reconciliation.duplicateHistoricalItems) === 1 ? 'reference is' : 'references are'} hidden behind the Drive index.` : ''}
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ContentCard>
          <p className="text-3xl font-bold text-[var(--cb-text)]">{Number(reconciliation.authoritativeIndexedCount || 0)}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">Drive-indexed</p>
        </ContentCard>
        <ContentCard>
          <p className="text-3xl font-bold text-[var(--cb-text)]">{archivedReferenceCount}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">Archived references</p>
        </ContentCard>
        <ContentCard>
          <p className="text-3xl font-bold text-[var(--cb-text)]">{Number(reconciliation.duplicateHistoricalItems || 0)}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">Duplicates hidden</p>
        </ContentCard>
      </div>
    </Surface>
  )
}

function UploadQueuePanel({ onSelectFiles, uploadQueue }) {
  return (
    <Surface aria-label="Upload queue" tone="soft">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Add memories</p>
      <h3 className="mt-2 font-serif text-2xl text-[var(--cb-text)]">Prepare photos and videos</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">
        Choose private image and video files, write the memory details, and save them into the shared Album.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ContentCard>
          <p className="text-3xl font-bold text-[var(--cb-text)]">{uploadQueue.summary.total}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">Queued items</p>
        </ContentCard>
        <ContentCard>
          <p className="text-3xl font-bold text-[var(--cb-text)]">{uploadQueue.summary.saved}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">Saved this session</p>
        </ContentCard>
        <ContentCard>
          <p className="text-3xl font-bold text-[var(--cb-text)]">{formatBytes(uploadQueue.summary.bytes)}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">Private media size</p>
        </ContentCard>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton disabled={!uploadQueue.canUpload} onClick={onSelectFiles}><Upload className="size-4" />Select files</PrimaryButton>
        <SecondaryButton disabled={uploadQueue.isUploading || uploadQueue.summary.queued + uploadQueue.summary.failed + uploadQueue.summary.orphaned === 0 || !uploadQueue.canStartUploads} onClick={uploadQueue.startUploads}>
          {uploadQueue.isUploading ? 'Uploading…' : 'Start uploads'}
        </SecondaryButton>
        <SecondaryButton disabled={uploadQueue.summary.saved + uploadQueue.summary.failed + uploadQueue.summary.cancelled === 0 || uploadQueue.isUploading} onClick={uploadQueue.clearCompleted}>
          Clear finished
        </SecondaryButton>
        <SecondaryButton as={Link} to="/settings">Open Media & Sync</SecondaryButton>
      </div>
      {uploadQueue.requiresTrustedMediaBackend ? (
        <InlineAlert
          className="mt-5"
          tone="warning"
          title="Media connection needed"
          description="Files can be prepared here, but saving them to the shared Album needs Media & Sync connected."
        />
      ) : null}
      <div className="mt-5">
        {uploadQueue.items.length > 0 ? (
          <div className="grid gap-4">
            {uploadQueue.items.map((item) => (
              <UploadQueueCard
                key={item.id}
                item={item}
                onCancel={uploadQueue.cancelItem}
                onChange={uploadQueue.updateDraft}
                onRemove={uploadQueue.removeItem}
                onRetry={uploadQueue.retryItem}
              />
            ))}
          </div>
        ) : (
          <InlineAlert
            tone="info"
            title="Queue is empty"
            description="Choose JPG, PNG, WEBP, GIF, MP4, or WEBM files to prepare private Album memories."
          />
        )}
      </div>
    </Surface>
  )
}

function ManagementTools({ archivedReferenceCount, manageUploadsOpen, onSelectFiles, reconciliation, uploadQueue }) {
  if (!manageUploadsOpen) return null

  return (
    <div className="grid gap-5" aria-label="Album management tools">
      <ReconciliationPanel archivedReferenceCount={archivedReferenceCount} reconciliation={reconciliation} />
      <UploadQueuePanel onSelectFiles={onSelectFiles} uploadQueue={uploadQueue} />
    </div>
  )
}

function GalleryGrid({ grouped, onSelect, onToggleSelection, selectedKeys, selectionMode }) {
  return (
    <div className="space-y-6">
      {grouped.length > 0 ? grouped.map((group) => (
        <section key={group.id} className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">{group.monthLabel}</p>
              <h3 className="mt-2 font-serif text-3xl text-[var(--cb-text)]">{group.dayLabel}</h3>
              <p className="mt-2 text-sm text-[var(--cb-text-secondary)]">
                {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                {group.dateSource && group.dateSource !== 'captured' && group.dateSource !== 'memory-date' ? ' by saved file date.' : '.'}
              </p>
            </div>
          </div>
          <div className="gallery-media-library-grid">
            {group.items.map((item) => (
              <GalleryTile
                item={item}
                key={item.key}
                onSelect={onSelect}
                onToggleSelection={onToggleSelection}
                selected={selectedKeys.has(item.key)}
                selectionMode={selectionMode}
              />
            ))}
          </div>
        </section>
      )) : (
        <EmptyState
          icon={Images}
          title="No gallery entries match this view."
          description="Try another filter, add private photos or videos, or return to all media to reopen the full collection."
        />
      )}
    </div>
  )
}

function GalleryDialogs({ confirmRemoval, filtered, loadSelectedPreview, removeState, selectedItem, selectedItemWithPreview, selectedStreamStatus, setRemoveState, setSelectedItem, showNeighbor }) {
  return (
    <>
      <GalleryLightbox
        item={selectedItemWithPreview}
        items={filtered}
        onClose={() => setSelectedItem(null)}
        onLoadStream={() => loadSelectedPreview(selectedItem, { force: true })}
        onNext={() => showNeighbor(1)}
        onPrevious={() => showNeighbor(-1)}
        onRemove={(item, options = {}) => setRemoveState({ deleteOriginal: options.deleteOriginal === true, item, pending: false })}
        streamStatus={selectedStreamStatus}
      />
      <ConfirmDialog
        confirmLabel={removeState.deleteOriginal ? 'Delete original from Drive' : 'Remove from Album'}
        message={removeState.deleteOriginal
          ? 'This permanently deletes only this disposable original file from Google Drive, then removes it from Couple Book. Use this only for test or unwanted media.'
          : 'This removes the item from the active Album index. It does not delete the original file from the private Google Drive folder.'}
        onCancel={() => setRemoveState({ deleteOriginal: false, item: null, pending: false })}
        onConfirm={confirmRemoval}
        open={Boolean(removeState.item)}
        pending={removeState.pending}
        recordName={removeState.item?.title}
        title={removeState.deleteOriginal ? 'Delete this original from Drive?' : 'Remove this Album item?'}
      />
    </>
  )
}

function useGalleryTrustedPreviews({ approvedUser, items, selectedItem, user }) {
  const [previewUrls, setPreviewUrls] = useState({})
  const [streamStatus, setStreamStatus] = useState({ error: '', loading: false, mediaId: '' })
  const previewUrlsRef = useRef(new Map())
  const objectUrlsRef = useRef(null)
  if (objectUrlsRef.current == null) objectUrlsRef.current = createObjectUrlRegistry()

  useEffect(() => () => {
    objectUrlsRef.current.revokeAll()
    previewUrlsRef.current.clear()
  }, [])

  useEffect(() => {
    if (!user || !approvedUser?.coupleId || !isTrustedMediaBackendConfigured()) return undefined
    const indexedItems = items
      .filter((item) => item.media?.status === 'drive-indexed' && ['image', 'video'].includes(item.media?.kind) && item.media?.id && !previewUrlsRef.current.has(item.media.id))
      .slice(0, MAX_THUMBNAIL_PRELOAD_ITEMS)
    if (!indexedItems.length) return undefined

    const controller = new AbortController()
    let cancelled = false

    async function loadPreviewItem(item) {
      try {
        if (cancelled || controller.signal.aborted) return
        const blob = await fetchMediaBlobViaTrustedBackend({
          coupleId: approvedUser.coupleId,
          mediaId: item.media.id,
          mode: 'thumbnail',
          user,
        })
        if (cancelled || controller.signal.aborted) return
        const objectUrl = objectUrlsRef.current.create(blob)
        previewUrlsRef.current.set(item.media.id, { kind: 'image', mode: 'thumbnail', url: objectUrl })
        setPreviewUrls(Object.fromEntries(previewUrlsRef.current.entries()))
      } catch {
        // Individual private previews can fail without blocking the Album index.
      }
    }

    async function loadPreviews() {
      let nextIndex = 0
      async function loadNextPreview() {
        const index = nextIndex
        nextIndex += 1
        const item = indexedItems[index]
        if (!item || cancelled || controller.signal.aborted) return
        await loadPreviewItem(item)
        await loadNextPreview()
      }
      const workers = Array.from({ length: Math.min(THUMBNAIL_PRELOAD_CONCURRENCY, indexedItems.length) }, () => loadNextPreview())
      await Promise.all(workers)
    }

    void loadPreviews()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [approvedUser?.coupleId, items, user])

  const loadSelectedPreview = useCallback(async (item, { force = false } = {}) => {
    const mediaId = item?.media?.id
    const cached = previewUrlsRef.current.get(mediaId)
    const isVideo = item?.media?.kind === 'video'
    const needsStream = isVideo && cached?.mode !== 'stream'
    if (!user || !approvedUser?.coupleId || !mediaId || item?.media?.status !== 'drive-indexed' || (!force && !needsStream && previewUrlsRef.current.has(mediaId)) || !isTrustedMediaBackendConfigured()) return

    if (isVideo) setStreamStatus({ error: '', loading: true, mediaId })
    try {
      const blob = await fetchMediaBlobViaTrustedBackend({
        coupleId: approvedUser.coupleId,
        mediaId,
        mode: isVideo ? 'stream' : 'thumbnail',
        user,
      })
      const objectUrl = objectUrlsRef.current.create(blob)
      if (cached?.url && cached.url !== objectUrl) objectUrlsRef.current.revoke(cached.url)
      previewUrlsRef.current.set(mediaId, { kind: isVideo ? 'video' : 'image', mode: isVideo ? 'stream' : 'thumbnail', url: objectUrl })
      setPreviewUrls(Object.fromEntries(previewUrlsRef.current.entries()))
      if (isVideo) setStreamStatus({ error: '', loading: false, mediaId })
    } catch {
      if (isVideo) {
        setStreamStatus({
          error: 'Video playback is unavailable right now. The private thumbnail is still shown, and you can retry the protected playback session.',
          loading: false,
          mediaId,
        })
      }
    }
  }, [approvedUser, user])

  useEffect(() => {
    if (!selectedItem) return undefined
    const timer = window.setTimeout(() => {
      void loadSelectedPreview(selectedItem)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadSelectedPreview, selectedItem])

  return { loadSelectedPreview, previewUrls, streamStatus }
}

function useGallerySelection({ filtered, selectedItem, setSelectedItem }) {
  const [selectedKeys, setSelectedKeys] = useState(() => new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const selectedCount = selectedKeys.size

  function toggleSelectionMode() {
    if (selectionMode) setSelectedKeys(new Set())
    setSelectionMode((current) => !current)
  }

  function toggleItemSelection(item) {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (next.has(item.key)) next.delete(item.key)
      else next.add(item.key)
      return next
    })
  }

  function clearSelection() {
    setSelectedKeys(new Set())
    setSelectionMode(false)
  }

  function showNeighbor(direction) {
    if (!selectedItem || filtered.length <= 1) return
    const index = filtered.findIndex((item) => item.key === selectedItem.key)
    if (index < 0) return
    const nextIndex = (index + direction + filtered.length) % filtered.length
    setSelectedItem(filtered[nextIndex])
  }

  return { clearSelection, selectedCount, selectedKeys, selectionMode, showNeighbor, toggleItemSelection, toggleSelectionMode }
}

function useGalleryRemoval({ setSelectedItem, uploadQueue }) {
  const [removeState, setRemoveState] = useState({ deleteOriginal: false, item: null, pending: false })

  async function confirmRemoval() {
    if (!removeState.item) return
    setRemoveState((current) => ({ ...current, pending: true }))
    try {
      await uploadQueue.removeSavedItem(removeState.item, { deleteOriginal: removeState.deleteOriginal })
      setSelectedItem(null)
      setRemoveState({ deleteOriginal: false, item: null, pending: false })
    } catch {
      setRemoveState((current) => ({ ...current, pending: false }))
    }
  }

  return { confirmRemoval, removeState, setRemoveState }
}

function getGalleryWarning(mediaInventory, memoryArchive) {
  const mediaWarnings = Array.isArray(mediaInventory.warnings) ? mediaInventory.warnings : []
  if (mediaInventory.status === 'unavailable' && mediaWarnings.length > 0) {
    return 'The private Drive index is not readable for this session. Open Media & Sync and refresh after reconnecting.'
  }

  if (memoryArchive?.status === 'unavailable') {
    return 'The private story archive is taking too long to load. Album remains available for indexed Drive media; retry when the connection settles.'
  }

  return ''
}

function getSelectedStreamStatus(selectedItemWithPreview, streamStatus) {
  const mediaId = selectedItemWithPreview?.media?.id
  return mediaId && mediaId === streamStatus.mediaId ? streamStatus : null
}

function useGalleryModelState(model) {
  const items = useMemo(() => (Array.isArray(model.items) ? model.items : []), [model])
  const memoryArchive = model.sourceStatus?.memoryArchive || {}
  const years = model.filters?.availableYears || []
  const mediaInventory = model.sourceStatus?.mediaInventory || {}
  const reconciliation = model.sourceStatus?.reconciliation || {}
  const archivedReferenceCount = Number(reconciliation.historicalArchiveReferences || model.archiveReferenceItems?.length || 0)
  const userFacingMediaWarning = getGalleryWarning(mediaInventory, memoryArchive)

  return { archivedReferenceCount, items, reconciliation, userFacingMediaWarning, years }
}

function GalleryReadyView({ model, onRefresh }) {
  const { approvedUser, user } = useAuth()
  const [filter, setFilter] = useState('all')
  const [year, setYear] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [manageUploadsOpen, setManageUploadsOpen] = useState(false)
  const fileInputRef = useRef(null)
  const uploadQueue = useMediaUploadQueue(onRefresh, null)
  const { archivedReferenceCount, items, reconciliation, userFacingMediaWarning, years } = useGalleryModelState(model)
  const { loadSelectedPreview, previewUrls, streamStatus } = useGalleryTrustedPreviews({ approvedUser, items, selectedItem, user })

  const itemsWithPreviews = useMemo(() => items.map((item) => withTrustedPreview(item, previewUrls)), [items, previewUrls])
  const filtered = useMemo(() => selectFilteredGalleryItems(itemsWithPreviews, { filter, search, year }), [filter, itemsWithPreviews, search, year])
  const grouped = useMemo(() => groupGalleryItemsByDate(filtered), [filtered])
  const selectedItemWithPreview = useMemo(() => withTrustedPreview(selectedItem, previewUrls), [previewUrls, selectedItem])
  const selectedStreamStatus = getSelectedStreamStatus(selectedItemWithPreview, streamStatus)
  const { clearSelection, selectedCount, selectedKeys, selectionMode, showNeighbor, toggleItemSelection, toggleSelectionMode } = useGallerySelection({ filtered, selectedItem, setSelectedItem })
  const { confirmRemoval, removeState, setRemoveState } = useGalleryRemoval({ setSelectedItem, uploadQueue })

  return (
    <section className="space-y-5" data-route="gallery">
      <div className="sr-only" aria-live="polite">{uploadQueue.notice.message}</div>
      <GalleryFileInput fileInputRef={fileInputRef} uploadQueue={uploadQueue} />
      <GalleryHeader
        manageUploadsOpen={manageUploadsOpen}
        model={model}
        onAdd={() => fileInputRef.current?.click()}
        onToggleManage={() => setManageUploadsOpen((value) => !value)}
        uploadQueue={uploadQueue}
      />

      {uploadQueue.notice.message ? <InlineAlert description={uploadQueue.notice.message} tone={uploadQueue.notice.kind === 'error' ? 'error' : uploadQueue.notice.kind === 'success' ? 'success' : 'info'} /> : null}

      <GalleryToolbar
        filter={filter}
        filteredCount={filtered.length}
        onClearSelection={clearSelection}
        onFilter={setFilter}
        onSearch={setSearch}
        onToggleSelectionMode={toggleSelectionMode}
        onYear={setYear}
        search={search}
        selectedCount={selectedCount}
        selectionMode={selectionMode}
        year={year}
        years={years}
      />

      <SelectionToolbar selectedCount={selectedCount} selectionMode={selectionMode} />

      {userFacingMediaWarning ? (
        <InlineAlert tone="warning" title="Album sync needs attention" description={userFacingMediaWarning} />
      ) : null}
      <ManagementTools
        archivedReferenceCount={archivedReferenceCount}
        manageUploadsOpen={manageUploadsOpen}
        onSelectFiles={() => fileInputRef.current?.click()}
        reconciliation={reconciliation}
        uploadQueue={uploadQueue}
      />

      <GalleryGrid
        grouped={grouped}
        onSelect={setSelectedItem}
        onToggleSelection={toggleItemSelection}
        selectedKeys={selectedKeys}
        selectionMode={selectionMode}
      />

      <GalleryDialogs
        confirmRemoval={confirmRemoval}
        filtered={filtered}
        loadSelectedPreview={loadSelectedPreview}
        removeState={removeState}
        selectedItem={selectedItem}
        selectedItemWithPreview={selectedItemWithPreview}
        selectedStreamStatus={selectedStreamStatus}
        setRemoveState={setRemoveState}
        setSelectedItem={setSelectedItem}
        showNeighbor={showNeighbor}
      />
      {uploadQueue.notice.message && ['success', 'error'].includes(uploadQueue.notice.kind) ? (
        <Toast
          description={uploadQueue.notice.kind === 'error' ? 'Review the queue or Album state for the next required action.' : ''}
          title={uploadQueue.notice.message}
          tone={uploadQueue.notice.kind}
        />
      ) : null}
    </section>
  )
}

export function GalleryView({ compatibilityError, compatibilityState, model, onRefresh }) {
  if (compatibilityState === 'loading') {
    return (
      <div className="space-y-4">
        <LoadingState message="Loading Album..." />
        <AlbumSkeleton />
      </div>
    )
  }

  if (compatibilityError || model.status === 'invalid') {
    return <ErrorState title="Album could not be loaded" message={compatibilityError || 'The Album view is not available right now.'} />
  }

  return <GalleryReadyView model={model} onRefresh={onRefresh} />
}
