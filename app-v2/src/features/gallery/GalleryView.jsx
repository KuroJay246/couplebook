import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Film, ImageIcon, Images, RotateCcw, Upload, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DangerButton, PrimaryButton, SecondaryButton, TextButton } from '../../components/ui/Button.jsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { FormField, SelectField, TextAreaField, TextField } from '../../components/ui/FormField.jsx'
import { InlineAlert } from '../../components/ui/InlineAlert.jsx'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton.jsx'
import { LoadingState } from '../../components/ui/LoadingState.jsx'
import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { SearchField } from '../../components/ui/SearchField.jsx'
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { ContentCard, Surface } from '../../components/ui/Surface.jsx'
import { Toast } from '../../components/ui/Toast.jsx'
import { formatBytes } from '../../services/mediaUploadService.js'
import { QUEUE_STATUS } from './useMediaUploadQueue.js'
import { useMediaUploadQueue } from './useMediaUploadQueue.js'

const LIVE_SHARED_ALBUM_URL = 'https://www.icloud.com/photos/#/sa,20BC8532-D41C-4AB3-9C83-B05458C10B78/'
const FILTERS = [
  { key: 'all', label: 'All media' },
  { key: 'photos', label: 'Photos' },
  { key: 'videos', label: 'Videos' },
]

function matchesFilter(item, filter) {
  if (filter === 'photos') return item.media.kind === 'image'
  if (filter === 'videos') return item.media.kind === 'video'
  return true
}

function matchesYear(item, year) {
  if (year === 'all') return true
  return String(item.date?.year || '') === year
}

function mediaStatus(item) {
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

function groupByYear(items) {
  const map = new Map()
  for (const item of items) {
    const key = item.date?.year ? String(item.date.year) : 'Date review'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(item)
  }
  return [...map.entries()]
    .sort(([left], [right]) => {
      if (left === 'Date review') return 1
      if (right === 'Date review') return -1
      return Number(right) - Number(left)
    })
    .map(([yearLabel, yearItems]) => ({
      id: `album-${yearLabel}`,
      yearLabel,
      featured: yearItems[0],
      items: yearItems,
    }))
}

function toneFor(item) {
  if (item.media.kind === 'video') return 'info'
  if (item.media.kind === 'image') return 'success'
  if (item.specialMoment.isSpecial) return 'warning'
  return 'default'
}

function queueStatusLabel(status) {
  if (status === QUEUE_STATUS.validating) return 'Validating'
  if (status === QUEUE_STATUS.hashing) return 'Hashing'
  if (status === QUEUE_STATUS.uploading) return 'Uploading'
  if (status === QUEUE_STATUS.finalizing) return 'Finalizing'
  if (status === QUEUE_STATUS.cancelling) return 'Cancelling'
  if (status === QUEUE_STATUS.cancelled) return 'Cancelled'
  if (status === QUEUE_STATUS.failed) return 'Needs review'
  if (status === QUEUE_STATUS.saved) return 'Saved'
  return 'Ready'
}

function queueStatusTone(status) {
  if (status === QUEUE_STATUS.saved) return 'success'
  if (status === QUEUE_STATUS.failed) return 'error'
  if (status === QUEUE_STATUS.cancelled) return 'warning'
  if ([QUEUE_STATUS.uploading, QUEUE_STATUS.finalizing, QUEUE_STATUS.hashing].includes(status)) return 'info'
  return 'warning'
}

function GalleryTile({ item, onSelect }) {
  const isVideo = item.media.kind === 'video'

  return (
    <ContentCard className="gallery-item flex h-full flex-col overflow-hidden p-0">
      <button
        aria-label={galleryTileLabel(item)}
        className="gallery-media-frame flex min-h-56 w-full flex-col justify-between bg-[linear-gradient(180deg,#fff9fb_0%,#fdf4f8_100%)] p-5 text-left"
        onClick={() => onSelect(item)}
        type="button"
      >
        <div className="flex items-start justify-between gap-3">
          <StatusBadge tone={toneFor(item)}>{mediaStatus(item)}</StatusBadge>
          {isVideo ? <Film className="size-5 text-[var(--cb-accent)]" aria-hidden="true" /> : <ImageIcon className="size-5 text-[var(--cb-accent)]" aria-hidden="true" />}
        </div>
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
          <PrimaryButton onClick={() => onSelect(item)}>Open item</PrimaryButton>
          {item.specialMoment.route ? <SecondaryButton as={Link} to={item.specialMoment.route}>Open related page</SecondaryButton> : null}
        </div>
      </div>
    </ContentCard>
  )
}

function LiveAlbumTile() {
  return (
    <a className="block" href={LIVE_SHARED_ALBUM_URL} rel="noopener noreferrer" target="_blank">
      <Surface className="h-full">
        <div className="flex h-full flex-col justify-between gap-5">
          <div>
            <StatusBadge tone="info">Live album</StatusBadge>
            <h3 className="mt-3 font-serif text-3xl text-[var(--cb-text)]">Our Live Album</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--cb-text-secondary)]">
              Open the shared iCloud album for the newest photos and videos added outside Couple Book.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-accent-soft)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Boundary</p>
            <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">This remains a separate private iCloud destination. Couple Book only links to it and does not expose those files as public assets.</p>
          </div>
        </div>
      </Surface>
    </a>
  )
}

function GalleryLightbox({ item, items, onClose, onNext, onPrevious, onRemove }) {
  const dialogRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!item) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') onNext()
      if (event.key === 'ArrowLeft') onPrevious()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [item, onClose, onNext, onPrevious])

  useEffect(() => {
    if (!item) return
    dialogRef.current?.querySelector('button')?.focus()
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
            <div className="flex h-full min-h-80 w-full items-center justify-center rounded-[24px] border border-white/10 bg-[var(--cb-surface)]/[0.04] p-8 text-center">
              <div>
                {isVideo ? <Film className="mx-auto size-12 text-[#f4d8e6]" aria-hidden="true" /> : <ImageIcon className="mx-auto size-12 text-[#f4d8e6]" aria-hidden="true" />}
                <p className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-[#f4d8e6]">{mediaStatus(item)}</p>
                <h3 className="mt-3 font-serif text-3xl">{item.title}</h3>
                <p className="mt-3 max-w-lg text-sm leading-6 text-white/75">
                  {isVideo
                    ? 'This video remains protected. Couple Book shows the story and metadata without copying the private source into public assets.'
                    : 'This image remains protected. Couple Book preserves the story, caption, and reference without shipping the original file in the client bundle.'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-5 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <StatusBadge tone={toneFor(item)}>{item.typeLabel}</StatusBadge>
                <h3 id={titleId} className="mt-3 text-2xl font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-white/72">{item.displayDate || 'Date review'}</p>
              </div>
              <TextButton aria-label="Close" className="text-white hover:bg-[var(--cb-surface)]/10" onClick={onClose}>Close</TextButton>
            </div>
            <p className="text-sm leading-6 text-white/78">{item.description}</p>
            <div className="flex flex-wrap gap-2">
              {(item.tags || []).map((tag) => <StatusBadge key={tag.key || tag.label}>{tag.label}</StatusBadge>)}
            </div>
            <InlineAlert
              tone="info"
              title="Private media boundary"
              description={item.media.status === 'storage-verified'
                ? 'This item has verified private Storage metadata. The viewer stays metadata-first and does not expose the original object URL here.'
                : 'This item is still shown through protected story metadata only.'}
            />
            <div className="mt-auto flex flex-wrap gap-2">
              {canStep ? <SecondaryButton className="border-white/20 bg-transparent text-white hover:bg-[var(--cb-surface)]/10" onClick={onPrevious}>Previous</SecondaryButton> : null}
              {canStep ? <SecondaryButton className="border-white/20 bg-transparent text-white hover:bg-[var(--cb-surface)]/10" onClick={onNext}>Next</SecondaryButton> : null}
              <SecondaryButton as={Link} className="border-white/20 bg-transparent text-white hover:bg-[var(--cb-surface)]/10" to="/timeline">Open Story</SecondaryButton>
              {item.media.status === 'storage-verified' ? <DangerButton onClick={() => onRemove(item)}>Remove from Album</DangerButton> : null}
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
  const editable = [QUEUE_STATUS.queued, QUEUE_STATUS.failed, QUEUE_STATUS.cancelled].includes(item.status)
  const showRetry = [QUEUE_STATUS.failed, QUEUE_STATUS.cancelled].includes(item.status) && item.retryable !== false
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
          {item.kind === 'video' ? (
            <video
              aria-label={`Preview for ${item.fileName}`}
              className="aspect-video w-full bg-[#140d12] object-contain"
              controls
              muted
              playsInline
              preload="metadata"
              src={item.previewUrl}
            />
          ) : (
            <img
              alt={`Preview for ${item.fileName}`}
              className="aspect-[4/3] w-full bg-[#140d12] object-cover"
              src={item.previewUrl}
            />
          )}
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
  const [removeState, setRemoveState] = useState({ item: null, pending: false })
  const fileInputRef = useRef(null)
  const uploadQueue = useMediaUploadQueue(onRefresh)
  const items = useMemo(() => (Array.isArray(model.items) ? model.items : []), [model])
  const years = model.filters?.availableYears || []

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return items.filter((item) => {
      if (!matchesFilter(item, filter)) return false
      if (!matchesYear(item, year)) return false
      if (!normalizedSearch) return true
      return [item.title, item.description, item.displayDate, ...(item.tags || []).map((tag) => tag.label)]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [filter, items, search, year])

  const grouped = useMemo(() => groupByYear(filtered), [filtered])

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
        title="Our Shared Gallery"
        description="Browse photos and video memories, reopen the related story, and keep the live album close without changing private media boundaries."
        actions={(
          <>
            <StatusBadge tone="info">{model.summary.totalMemories} items</StatusBadge>
            <PrimaryButton disabled={!uploadQueue.canUpload} onClick={() => fileInputRef.current?.click()}><Upload className="size-4" />Add files</PrimaryButton>
          </>
        )}
      />

      {model.warnings?.length ? (
        <InlineAlert
          tone="info"
          title="Album bridge notes"
          description={`The current Album view loaded with ${model.warnings.length} compatibility note${model.warnings.length === 1 ? '' : 's'}.`}
        />
      ) : null}
      {uploadQueue.notice.message ? <InlineAlert description={uploadQueue.notice.message} tone={uploadQueue.notice.kind === 'error' ? 'error' : uploadQueue.notice.kind === 'success' ? 'success' : 'info'} /> : null}

      <Surface className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <div>
          <StatusBadge tone="warning">Metadata-first private album</StatusBadge>
          <h3 className="mt-3 font-serif text-3xl text-[var(--cb-text)]">Moments we kept close</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--cb-text-secondary)]">
            Album keeps the image-first view quiet and spacious while preserving the current private media boundary. Verified Storage media stays scoped, older references stay descriptive instead of leaking file paths.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <ContentCard>
            <p className="text-3xl font-bold text-[var(--cb-text)]">{model.summary.totalMemories}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">Moments with media</p>
          </ContentCard>
          <ContentCard>
            <p className="text-3xl font-bold text-[var(--cb-text)]">{model.summary.photos}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">Photos</p>
          </ContentCard>
          <ContentCard>
            <p className="text-3xl font-bold text-[var(--cb-text)]">{model.summary.videos}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">Videos</p>
          </ContentCard>
        </div>
      </Surface>

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
          <p className="text-sm text-[var(--cb-text-secondary)]">
            {filtered.length} {filtered.length === 1 ? 'result' : 'results'} across photos, videos, and protected memory references.
          </p>
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]">
        <LiveAlbumTile />
        <Surface aria-label="Upload queue" tone="soft">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Upload queue</p>
          <h3 className="mt-2 font-serif text-2xl text-[var(--cb-text)]">Protected imports</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">
            Add private image and video files, confirm the memory details, and save them through the same active-member Storage and Firestore boundaries already enforced in app-v2.
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
            <SecondaryButton disabled={uploadQueue.isUploading || uploadQueue.summary.queued + uploadQueue.summary.failed === 0} onClick={uploadQueue.startUploads}>
              {uploadQueue.isUploading ? 'Uploading…' : 'Start uploads'}
            </SecondaryButton>
            <SecondaryButton disabled={uploadQueue.summary.saved + uploadQueue.summary.failed + uploadQueue.summary.cancelled === 0 || uploadQueue.isUploading} onClick={uploadQueue.clearCompleted}>
              Clear finished
            </SecondaryButton>
          </div>
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
                description="Choose JPG, PNG, WEBP, GIF, MP4, or WEBM files to prepare private Album uploads."
              />
            )}
          </div>
        </Surface>
      </div>

      <div className="space-y-6">
        {grouped.length > 0 ? grouped.map((group) => (
          <section key={group.id} className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Album chapter</p>
                <h3 className="mt-2 font-serif text-3xl text-[var(--cb-text)]">{group.yearLabel}</h3>
                <p className="mt-2 text-sm text-[var(--cb-text-secondary)]">{group.items.length} {group.items.length === 1 ? 'memory' : 'memories'} in this chapter.</p>
              </div>
              {group.featured ? <StatusBadge tone="info">Featured: {group.featured.title}</StatusBadge> : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <GalleryTile item={item} key={item.key} onSelect={setSelectedItem} />
              ))}
            </div>
          </section>
        )) : (
          <EmptyState
            icon={Images}
            title="No gallery entries match this view."
            description="Try another filter, open the live album, or return to all media to reopen the full collection."
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
        message="This removes the private Storage object and archives the linked memory so it no longer appears in the active Album."
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
