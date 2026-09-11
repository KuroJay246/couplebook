import { useEffect, useId, useMemo, useRef, useState } from 'react'
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
import { formatBytes } from '../../services/mediaUploadService.js'
import { groupGalleryItemsByDate, selectFilteredGalleryItems } from './gallerySelectors.js'
import { QUEUE_STATUS, queueStatusLabel, queueStatusTone } from './useMediaUploadQueue.js'
import { useMediaUploadQueue } from './useMediaUploadQueue.js'
import { useGoogleDriveConnection } from '../media/useGoogleDriveConnection.js'

const FILTERS = [
  { key: 'all', label: 'All media' },
  { key: 'photos', label: 'Photos' },
  { key: 'videos', label: 'Videos' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'unlinked', label: 'Unlinked' },
]

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

function GalleryTile({ item, onSelect, onToggleSelection, selected = false, selectionMode = false }) {
  const isVideo = item.media.kind === 'video'
  const previewUrl = item.media.previewUrl || item.media.thumbnailUrl || ''
  const isIndexedDriveMedia = item.media.status === 'drive-indexed'
  const duration = formatDuration(item.media.durationMillis)
  const showTitle = item.titleKind === 'authored' || item.descriptionKind === 'authored'
  const tileAction = () => {
    if (selectionMode) {
      onToggleSelection(item)
      return
    }
    onSelect(item)
  }

  if (isIndexedDriveMedia) {
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
          <span className="gallery-index-placeholder" aria-hidden="true">
            {isVideo ? <Film className="size-7" /> : <ImageIcon className="size-7" />}
            <span>{isVideo ? 'Video preview needs Drive access' : 'Photo preview needs Drive access'}</span>
          </span>
          {showTitle ? <span className="gallery-index-overlay"><span className="gallery-index-title">{item.title}</span></span> : null}
          {selectionMode ? <span className="gallery-index-selection" aria-hidden="true">{selected ? 'Selected' : 'Select'}</span> : null}
          {item.media.favorite ? <span className="gallery-index-favorite" aria-hidden="true"><Heart className="size-3.5" fill="currentColor" /></span> : null}
          {isVideo ? <span className="gallery-index-play" aria-hidden="true"><Film className="size-4" /></span> : null}
        </button>
      </article>
    )
  }

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
          {previewUrl ? (
            <MediaPreview
              alt=""
              className="h-full w-full"
              controls={false}
              kind={isVideo ? 'video' : 'image'}
              objectFit="cover"
              src={previewUrl}
            />
          ) : (
            <div className="gallery-tile-art-empty">
              {isVideo ? <Film className="size-8" /> : <ImageIcon className="size-8" />}
            </div>
          )}
        </div>
        {selectionMode ? <span className="gallery-selection-pill">{selected ? 'Selected' : 'Select'}</span> : null}
        {item.media.favorite ? <span className="gallery-index-favorite" aria-hidden="true"><Heart className="size-3.5" fill="currentColor" /></span> : null}
        {isVideo ? <span className="gallery-index-play" aria-hidden="true">{duration || <Film className="size-4" />}</span> : null}
        {showTitle ? <span className="gallery-index-overlay"><span className="gallery-index-title">{item.title}</span></span> : null}
      </button>
    </article>
  )
}

function GalleryLightbox({ item, items, onClose, onNext, onPrevious, onRemove }) {
  const titleId = useId()
  const onNextRef = useRef(onNext)
  const onPreviousRef = useRef(onPrevious)
  const closeButtonRef = useRef(null)
  const dialogRef = useDialogAccessibility({
    active: Boolean(item),
    initialFocusRef: closeButtonRef,
    onClose,
  })
  const hasVerifiedPrivateMedia = ['storage-verified', 'drive-verified'].includes(item?.media?.status)

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
  const isVideo = item.media.kind === 'video'
  const mediaUrl = item.media.previewUrl || item.media.thumbnailUrl || ''
  const currentIndex = items.findIndex((entry) => entry.key === item.key)
  const canStep = items.length > 1 && currentIndex >= 0

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080508] p-3">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close Album viewer" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="cb-media-viewer relative h-[calc(100vh-1.5rem)] w-full max-w-7xl overflow-hidden text-white"
      >
        <div className="cb-media-viewer-stage">
          {mediaUrl ? (
            <MediaPreview alt={item.title} className="cb-media-viewer-media" controls={isVideo} kind={isVideo ? 'video' : 'image'} objectFit="contain" src={mediaUrl} />
          ) : (
            <div className="cb-media-viewer-empty">{isVideo ? <Film className="size-10" /> : <ImageIcon className="size-10" />}</div>
          )}
        </div>
        <div className="cb-media-viewer-top">
          <TextButton aria-label="Close" className="text-white hover:bg-white/10" onClick={onClose} ref={closeButtonRef}>Close</TextButton>
        </div>
        <div className="cb-media-viewer-bottom">
          <div>
            <h3 id={titleId}>{item.title}</h3>
            <p>{item.displayDate || ''}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canStep ? <SecondaryButton className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={onPrevious}>Previous</SecondaryButton> : null}
            {canStep ? <SecondaryButton className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={onNext}>Next</SecondaryButton> : null}
            {hasVerifiedPrivateMedia ? <DangerButton onClick={() => onRemove(item)}>Remove</DangerButton> : null}
          </div>
        </div>
      </div>
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

function UploadQueueCard({ item, onCancel, onChange, onRemove, onRetry }) {
  const editable = [QUEUE_STATUS.queued, QUEUE_STATUS.failed, QUEUE_STATUS.cancelled, QUEUE_STATUS.orphanedUpload, QUEUE_STATUS.reconnectRequired].includes(item.status)
  const showRetry = [QUEUE_STATUS.failed, QUEUE_STATUS.cancelled, QUEUE_STATUS.orphanedUpload, QUEUE_STATUS.reconnectRequired].includes(item.status) && item.retryable !== false
  const showCancel = [QUEUE_STATUS.validating, QUEUE_STATUS.hashing, QUEUE_STATUS.uploading, QUEUE_STATUS.finalizing, QUEUE_STATUS.cancelling].includes(item.status)
  const progressValue = item.status === QUEUE_STATUS.saved ? 100 : Math.max(0, item.progress || 0)
  const hasPreview = Boolean(item.previewUrl)

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
        <div className="flex flex-wrap gap-2">
          {showCancel ? <SecondaryButton aria-label={`Cancel upload for ${item.fileName}`} onClick={() => onCancel(item.id)}><XCircle className="size-4" />Cancel</SecondaryButton> : null}
          {showRetry ? <SecondaryButton aria-label={`Retry upload for ${item.fileName}`} onClick={() => onRetry(item.id)}><RotateCcw className="size-4" />Retry</SecondaryButton> : null}
          {editable ? <TextButton onClick={() => onRemove(item.id)}>Remove</TextButton> : null}
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[#f3e7ec]">
        <div className={`h-full rounded-full transition-all ${item.status === QUEUE_STATUS.failed ? 'bg-[#d96b8a]' : item.status === QUEUE_STATUS.saved ? 'bg-[#4f8a63]' : 'bg-[var(--cb-accent)]'}`} style={{ width: `${progressValue}%` }} />
      </div>

      {item.error ? <InlineAlert description={item.error} tone="error" /> : null}

      {hasPreview ? (
        <div className="overflow-hidden rounded-[20px] border border-[var(--cb-border)] bg-[var(--cb-accent-soft)]">
          <MediaPreview
            alt={`Preview for ${item.fileName}`}
            className={item.kind === 'video' ? 'aspect-video w-full' : 'aspect-[4/3] w-full'}
            kind={item.kind}
            objectFit={item.kind === 'video' ? 'contain' : 'cover'}
            src={item.previewUrl}
          />
        </div>
      ) : null}

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
    </ContentCard>
  )
}

export function GalleryView({ compatibilityError, compatibilityState, model, onRefresh }) {
  const [filter, setFilter] = useState('all')
  const [year, setYear] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedKeys, setSelectedKeys] = useState(() => new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [removeState, setRemoveState] = useState({ item: null, pending: false })
  const [manageUploadsOpen, setManageUploadsOpen] = useState(false)
  const fileInputRef = useRef(null)
  const drive = useGoogleDriveConnection()
  const uploadQueue = useMediaUploadQueue(onRefresh, drive)
  const items = useMemo(() => (Array.isArray(model.items) ? model.items : []), [model])
  const years = model.filters?.availableYears || []
  const mediaInventory = model.sourceStatus?.mediaInventory || {}
  const mediaWarnings = Array.isArray(mediaInventory.warnings) ? mediaInventory.warnings : []
  const userFacingMediaWarning = mediaWarnings.length > 0 ? 'Some photos could not be loaded. Try again from Media & Sync.' : ''

  const filtered = useMemo(() => selectFilteredGalleryItems(items, { filter, search, year }), [filter, items, search, year])
  const grouped = useMemo(() => groupGalleryItemsByDate(filtered), [filtered])
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

  async function confirmRemoval() {
    if (!removeState.item) return
    setRemoveState((current) => ({ ...current, pending: true }))
    try {
      await uploadQueue.removeSavedItem(removeState.item)
      setSelectedItem(null)
      setRemoveState({ item: null, pending: false })
    } catch {
      setRemoveState((current) => ({ ...current, pending: false }))
    }
  }

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

  return (
    <section className="space-y-5" data-route="gallery">
      <div className="sr-only" aria-live="polite">{uploadQueue.notice.message}</div>
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
      <div className="cb-album-header">
        <div>
          <h2>Album</h2>
          <p>{model.summary.totalMemories} items</p>
        </div>
        <div className="cb-album-actions">
          <SecondaryButton aria-expanded={manageUploadsOpen} onClick={() => setManageUploadsOpen((value) => !value)}><SlidersHorizontal className="size-4" />Manage</SecondaryButton>
          {uploadQueue.canUpload
            ? <PrimaryButton onClick={() => fileInputRef.current?.click()}><Upload className="size-4" />Add</PrimaryButton>
            : <SecondaryButton as={Link} to="/settings"><Upload className="size-4" />Sync</SecondaryButton>}
        </div>
      </div>

      {uploadQueue.notice.message ? <InlineAlert description={uploadQueue.notice.message} tone={uploadQueue.notice.kind === 'error' ? 'error' : uploadQueue.notice.kind === 'success' ? 'success' : 'info'} /> : null}

      <div className="cb-album-toolbar">
        <div className="cb-album-filter-row">
          <SegmentedControl
            label="Media type"
            onChange={setFilter}
            options={FILTERS.map((entry) => ({ value: entry.key, label: entry.label }))}
            value={filter}
          />
          <FormField label="Year">
            <SelectField onChange={(event) => setYear(event.target.value)} value={year}>
              <option value="all">All years</option>
              {years.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
            </SelectField>
          </FormField>
          <SearchField label="Search Album" onChange={(event) => setSearch(event.target.value)} placeholder="Search dates, titles, and tags" value={search} />
        </div>
        <div className="cb-album-toolbar-meta">
          <p className="text-sm text-[var(--cb-text-secondary)]">{filtered.length} shown</p>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton aria-pressed={selectionMode} onClick={toggleSelectionMode}>{selectionMode ? 'Done' : 'Select'}</SecondaryButton>
            {selectionMode ? <TextButton disabled={selectedCount === 0} onClick={clearSelection}>Clear</TextButton> : null}
          </div>
        </div>
      </div>

      {selectionMode ? (
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
      ) : null}

      {userFacingMediaWarning ? (
        <InlineAlert tone="warning" title="Some photos could not be loaded" description="Try again from Media & Sync." />
      ) : null}
      {manageUploadsOpen ? <div className="grid gap-5" aria-label="Album management tools">
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
            <PrimaryButton disabled={!uploadQueue.canUpload} onClick={() => fileInputRef.current?.click()}><Upload className="size-4" />Select files</PrimaryButton>
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
              title="Upload setup required"
              description="Files can be prepared here, but saving them to the shared Album needs owner media setup in Settings."
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
      </div> : null}

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
                  onSelect={setSelectedItem}
                  onToggleSelection={toggleItemSelection}
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

      <GalleryLightbox
        item={selectedItem}
        items={filtered}
        onClose={() => setSelectedItem(null)}
        onNext={() => showNeighbor(1)}
        onPrevious={() => showNeighbor(-1)}
        onRemove={(item) => setRemoveState({ item, pending: false })}
      />
      <ConfirmDialog
        confirmLabel="Remove from Album"
        message="This removes the item from the active Album by archiving the linked memory. It does not delete the original file from the private folder."
        onCancel={() => setRemoveState({ item: null, pending: false })}
        onConfirm={confirmRemoval}
        open={Boolean(removeState.item)}
        pending={removeState.pending}
        recordName={removeState.item?.title}
        title="Remove this Album item?"
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
