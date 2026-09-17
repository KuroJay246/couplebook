import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Film, ImageIcon } from 'lucide-react'
import { SecondaryButton } from './Button.jsx'

function fallbackTitle(kind) {
  return kind === 'video' ? 'Video preview unavailable' : 'Image preview unavailable'
}

function previewDescription({ description, isVideo, loading }) {
  if (loading) return 'Loading preview...'
  if (description) return description
  return isVideo
    ? 'The video original stays private until a media session is connected.'
    : 'The image original stays private until a media session is connected.'
}

function PreviewAction({ isVideo, loading, onLoadRequest }) {
  if (!onLoadRequest) return null
  return (
    <SecondaryButton disabled={loading} onClick={onLoadRequest}>
      {loading ? 'Loading...' : isVideo ? 'Open video preview' : 'Open image preview'}
    </SecondaryButton>
  )
}

function PosterPreview({ alt, className, fitClass, loading, onError, onLoadRequest, poster, title }) {
  return (
    <div className={`cb-media-preview cb-media-preview-empty cb-media-preview-poster ${className}`}>
      <img
        alt={alt || title || 'Private video thumbnail'}
        className={`h-full w-full bg-[#140d12] ${fitClass}`}
        loading="lazy"
        onError={onError}
        src={poster}
      />
      {onLoadRequest ? (
        <div className="absolute inset-x-0 bottom-0 flex justify-center bg-[#140d12]/70 p-3 backdrop-blur-sm">
          <PreviewAction isVideo loading={loading} onLoadRequest={onLoadRequest} />
        </div>
      ) : null}
    </div>
  )
}

function EmptyPreview({ className, description, failed, isVideo, kind, loading, onLoadRequest, openOriginal, title }) {
  const Icon = isVideo ? Film : ImageIcon
  return (
    <div className={`cb-media-preview cb-media-preview-empty ${className}`}>
      <div className="grid justify-items-center gap-3 p-5 text-center">
        <Icon className="size-8 text-[var(--cb-accent)]" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-[var(--cb-text)]">{failed ? fallbackTitle(kind) : title || 'Preview available on request'}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--cb-text-muted)]">
            {previewDescription({ description, isVideo, loading })}
          </p>
        </div>
        <PreviewAction isVideo={isVideo} loading={loading} onLoadRequest={onLoadRequest} />
        {failed && openOriginal ? (
          <SecondaryButton onClick={openOriginal}>
            <ExternalLink className="size-4" aria-hidden="true" />
            Open original
          </SecondaryButton>
        ) : null}
      </div>
    </div>
  )
}

function LoadedPreview({ alt, controls, fitClass, isVideo, onError, poster, src, title, videoRef }) {
  if (isVideo) {
    return (
      <video
        ref={videoRef}
        aria-label={alt || title || 'Private video preview'}
        className={`h-full w-full bg-[#140d12] ${fitClass}`}
        controls={controls}
        muted
        onError={onError}
        playsInline
        poster={poster || undefined}
        preload="metadata"
        src={src}
      />
    )
  }

  return (
    <img
      alt={alt || title || 'Private image preview'}
      className={`h-full w-full bg-[#140d12] ${fitClass}`}
      loading="lazy"
      onError={onError}
      src={src}
    />
  )
}

export function MediaPreview({
  alt,
  className = '',
  controls = true,
  description = '',
  kind = 'image',
  loading = false,
  objectFit = 'cover',
  onLoadRequest,
  openOriginal,
  poster = '',
  src = '',
  title = '',
}) {
  const videoRef = useRef(null)
  const [failedSrc, setFailedSrc] = useState('')
  const isVideo = kind === 'video'
  const failed = Boolean(src && failedSrc === src)
  const fitClass = objectFit === 'contain' ? 'object-contain' : 'object-cover'

  useEffect(() => () => {
    videoRef.current?.pause?.()
  }, [])

  if (!src || failed) {
    if (isVideo && poster && !failed) {
      return (
        <PosterPreview
          alt={alt}
          className={className}
          fitClass={fitClass}
          loading={loading}
          onError={() => setFailedSrc(poster)}
          onLoadRequest={onLoadRequest}
          poster={poster}
          title={title}
        />
      )
    }

    return (
      <EmptyPreview
        className={className}
        description={description}
        failed={failed}
        isVideo={isVideo}
        kind={kind}
        loading={loading}
        onLoadRequest={onLoadRequest}
        openOriginal={openOriginal}
        title={title}
      />
    )
  }

  return (
    <div className={`cb-media-preview ${className}`}>
      <LoadedPreview
        alt={alt}
        controls={controls}
        fitClass={fitClass}
        isVideo={isVideo}
        onError={() => setFailedSrc(src)}
        poster={poster}
        src={src}
        title={title}
        videoRef={videoRef}
      />
    </div>
  )
}
