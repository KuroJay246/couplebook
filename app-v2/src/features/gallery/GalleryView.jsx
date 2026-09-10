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
import { PageHeader } from '../../components/ui/PageHeader.jsx'
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

function mediaStatus(item) {
  if (item.media.status === 'drive-verified') return item.media.kind === 'video' ? 'Verified Drive video' : 'Verified Drive photo'
  if (item.media.status === 'storage-verified') return item.media.kind === 'video' ? 'Verified private video' : 'Verified private photo'
  if (item.media.kind === 'video') return 'Private video stored safely'
  if (item.media.kind === 'image') return 'Private image stored safely'
  if (item.specialMoment.isSpecial) return 'Protected special page'
  return 'Saved memory'
}

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

function toneFor(item) {
  if (item.media.kind === 'video') return 'info'
  if (item.media.kind === 'image') return 'success'
  if (item.specialMoment.isSpecial) return 'warning'
  return 'default'
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
  const tileAction = () => {
    if (selectionMode) {
      onToggleSelection(item)
      return
    }
    onSelect(item)
  }

  if (isIndexedDriveMedia) {
    return (
      <article className={`gallery-index-tile ${isVideo ? 'is-video' : 'is-photo'} ${selected ? 'is-selected' : ''}`}>
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
          </span>
          <span className="gallery-index-overlay">
            <span className="gallery-index-title">{item.title}</span>
            <span className="gallery-index-meta">
              {isVideo ? 'Video' : 'Photo'}{duration ? ` / ${duration}` : ''}{item.displayDate ? ` / ${item.displayDate}` : ''}
            </span>
          </span>
          {selectionMode ? <span className="gallery-index-selection" aria-hidden="true">{selected ? 'Selected' : 'Select'}</span> : null}
          {item.media.favorite ? <span className="gallery-index-favorite" aria-hidden="true"><Heart className="size-3.5" fill="currentColor" /></span> : null}
          {isVideo ? <span className="gallery-index-play" aria-hidden="true"><Film className="size-4" /></span> : null}
        </button>
      </article>
    )
  }

  return (
    <article className={`cb-photo-book-tile gallery-item flex h-full flex-col overflow-hidden ${selected ? 'is-selected' : ''}`}>
      <button
        aria-pressed={selectionMode ? selected : undefined}
        aria-label={selectionMode ? `${selected ? 'Deselect' : 'Select'} ${galleryTileLabel(item)}` : galleryTileLabel(item)}
        className={`cb-photo-book-tile-inner gallery-media-frame ${isVideo ? 'is-video' : item.media.kind === 'image' ? 'is-photo' : item.specialMoment.isSpecial ? 'is-special' : 'is-memory'} flex min-h-72 w-full flex-col justify-between p-5 text-left`}
        onClick={tileAction}
        type="button"
      >
        <div className="flex items-start justify-between gap-3">
          <StatusBadge tone={toneFor(item)}>{mediaStatus(item)}</StatusBadge>
          {isVideo ? <Film className="size-5 text-[var(--cb-accent)]" aria-hidden="true" /> : <ImageIcon className="size-5 text-[var(--cb-accent)]" aria-hidden="true" />}
        </div>
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
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">{item.displayDate || 'Date review'}</p>
          <h3 className="mt-2 text-xl font-bold text-[var(--cb-text)]">{item.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--cb-text-secondary)]">{item.description}</p>
        </div>
      </button>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge>{item.typeLabel}</StatusBadge>
          {item.tags?.slice(0, 2).map((tag) => <StatusBadge key={tag.key || tag.label}>{tag.label}</StatusBadge>)}
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          <PrimaryButton onClick={() => (selectionMode ? onToggleSelection(item) : onSelect(item))}>{selectionMode ? (selected ? 'Deselect' : 'Select') : 'Open item'}</PrimaryButton>
          {item.specialMoment.route ? <SecondaryButton as={Link} to={item.specialMoment.route}>Open related page</SecondaryButton> : null}
        </div>
      </div>
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
  const currentIndex = items.findIndex((entry) => entry.key === item.key)
  const canStep = items.length > 1 && currentIndex >= 0

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-[var(--cb-bg-soft)]/75 backdrop-blur-sm" onClick={onClose} aria-label="Close Album viewer" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-auto rounded-[28px] border border-white/10 bg-[#140d12] text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
      >
        <div className="grid min-h-[min(32rem,calc(100vh-4rem))] lg:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.7fr)]">
          <div className="flex items-center justify-center bg-[linear-gradient(180deg,#24131d_0%,#140d12_100%)] p-6">
            <MediaPreview
              alt={item.title}
              className="min-h-80 w-full rounded-[24px] border border-white/10 bg-white/[0.04]"
              description="The original is available through the private media session; temporary preview links are never saved here."
              kind={isVideo ? 'video' : 'image'}
              objectFit="contain"
              title={mediaStatus(item)}
            />
          </div>
          <div className="flex flex-col gap-5 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <StatusBadge tone={toneFor(item)}>{item.typeLabel}</StatusBadge>
                <h3 id={titleId} className="mt-3 text-2xl font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-white/72">{item.displayDate || 'Date review'}</p>
              </div>
              <TextButton aria-label="Close" className="text-white hover:bg-[var(--cb-surface)]/10" onClick={onClose} ref={closeButtonRef}>Close</TextButton>
            </div>
            <p className="text-sm leading-6 text-white/78">{item.description}</p>
            <div className="flex flex-wrap gap-2">
              {(item.tags || []).map((tag) => <StatusBadge key={tag.key || tag.label}>{tag.label}</StatusBadge>)}
            </div>
            <InlineAlert
              tone="info"
              title="Private original"
              description={hasVerifiedPrivateMedia
                ? 'The saved original stays protected. Couple Book shows the memory record here and opens temporary previews only when the media session is available.'
                : 'This item is shown through protected story details until its private media is available here.'}
            />
            <div className="mt-auto flex flex-wrap gap-2">
              {canStep ? <SecondaryButton className="border-white/20 bg-transparent text-white hover:bg-[var(--cb-surface)]/10" onClick={onPrevious}>Previous</SecondaryButton> : null}
              {canStep ? <SecondaryButton className="border-white/20 bg-transparent text-white hover:bg-[var(--cb-surface)]/10" onClick={onNext}>Next</SecondaryButton> : null}
              <SecondaryButton as={Link} className="border-white/20 bg-transparent text-white hover:bg-[var(--cb-surface)]/10" to="/timeline">Open Story</SecondaryButton>
              {hasVerifiedPrivateMedia ? <DangerButton onClick={() => onRemove(item)}>Remove from Album</DangerButton> : null}
            </div>
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
  const mediaBackend = model.mediaBackend || {}
  const mediaWarnings = Array.isArray(mediaInventory.warnings) ? mediaInventory.warnings : []

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
      <PageHeader
        eyebrow="Album"
        title="Our Memories"
        description="Photos, videos, and the stories attached to them, kept together as one private book."
        actions={(
          <>
            <StatusBadge tone="info">{model.summary.totalMemories} items</StatusBadge>
            <SecondaryButton aria-expanded={manageUploadsOpen} onClick={() => setManageUploadsOpen((value) => !value)}><SlidersHorizontal className="size-4" />{manageUploadsOpen ? 'Close add flow' : 'Add details'}</SecondaryButton>
            {uploadQueue.canUpload
              ? <PrimaryButton onClick={() => fileInputRef.current?.click()}><Upload className="size-4" />Add files</PrimaryButton>
              : <SecondaryButton as={Link} to="/settings"><Upload className="size-4" />Media & Sync</SecondaryButton>}
          </>
        )}
      />

      {uploadQueue.notice.message ? <InlineAlert description={uploadQueue.notice.message} tone={uploadQueue.notice.kind === 'error' ? 'error' : uploadQueue.notice.kind === 'success' ? 'success' : 'info'} /> : null}

      <section className="cb-album-intro grid gap-5 rounded-[28px] border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[var(--cb-shadow-card)] lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <div>
          <p className="cb-kicker">A book of moments</p>
          <h2 className="mt-2 font-serif text-4xl text-[var(--cb-text)]">Browse, open, remember</h2>
          <p className="cb-body-copy mt-3 max-w-2xl text-sm leading-7">Move through the collection by photo, video, year, or memory. Add new files when you want them saved into the book.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 self-end">
          {[['Photos', model.summary.photos], ['Videos', model.summary.videos], ['Chapters', grouped.length]].map(([label, value]) => (
            <div className="rounded-2xl bg-[var(--cb-accent-soft)] p-4 text-center" key={label}>
              <p className="text-2xl font-bold text-[var(--cb-text)]">{value}</p>
              <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <Surface>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.45fr)_minmax(0,1fr)]">
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
        <div className="mt-4 rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface-soft)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--cb-text-secondary)]">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'} across our photos, videos, and saved chapters.
            </p>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton aria-pressed={selectionMode} onClick={toggleSelectionMode}>{selectionMode ? 'Exit select' : 'Select'}</SecondaryButton>
              {selectionMode ? <TextButton disabled={selectedCount === 0} onClick={clearSelection}>Clear selection</TextButton> : null}
            </div>
          </div>
        </div>
      </Surface>

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

      <Surface tone="soft" aria-label="Album media access">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="cb-kicker">Media provider</p>
            <h2 className="mt-2 font-serif text-2xl text-[var(--cb-text)]">Album reads the private media index</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--cb-text-secondary)]">
              Drive account recovery and synchronization belong in Settings. Approved members should browse indexed photos and videos here without seeing a Drive authorization popup.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={mediaInventory.status === 'ready' ? 'success' : mediaInventory.status === 'unavailable' ? 'warning' : 'info'}>
              {mediaInventory.status === 'ready' ? 'Indexed media available' : mediaInventory.status === 'unavailable' ? 'Index unavailable' : 'Index pending'}
            </StatusBadge>
            <StatusBadge tone={mediaBackend.localHandlersReady ? 'success' : 'warning'}>
              {mediaBackend.statusLabel || 'Backend contract pending'}
            </StatusBadge>
            <StatusBadge tone="warning">{mediaBackend.deploymentLabel || 'Deployment approval required'}</StatusBadge>
            <SecondaryButton as={Link} to="/settings">Manage Media & Sync</SecondaryButton>
          </div>
        </div>
        {mediaWarnings.length > 0 ? <InlineAlert className="mt-4" tone="warning" title="Media index needs attention" description={mediaWarnings[0]} /> : null}
        {mediaBackend.description ? <InlineAlert className="mt-4" tone="info" title="Trusted backend contract" description={mediaBackend.description} /> : null}
      </Surface>
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
              title="Trusted media backend required"
              description={`${mediaBackend.uploadLabel || 'Backend contract pending'}. Files can be prepared here by approved members, but Drive storage and Firestore finalization need the approved couple-level media backend. Album will not open a Google OAuth popup for partner uploads.`}
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
                <p className="mt-2 text-sm text-[var(--cb-text-secondary)]">{group.items.length} {group.items.length === 1 ? 'item' : 'items'} from this day.</p>
              </div>
              {group.items[0] ? <StatusBadge tone="info">Newest: {group.items[0].title}</StatusBadge> : null}
            </div>
            <div className={group.items.some((item) => item.media.status === 'drive-indexed') ? 'gallery-media-library-grid' : 'grid gap-4 md:grid-cols-2 xl:grid-cols-3'}>
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
