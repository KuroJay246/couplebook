import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Film, ImageIcon } from 'lucide-react'
import { SecondaryButton } from './Button.jsx'

function fallbackTitle(kind) {
  return kind === 'video' ? 'Video preview unavailable' : 'Image preview unavailable'
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
  const Icon = isVideo ? Film : ImageIcon
  const fitClass = objectFit === 'contain' ? 'object-contain' : 'object-cover'

  useEffect(() => () => {
    videoRef.current?.pause?.()
  }, [])

  if (!src || failed) {
    if (isVideo && poster && !failed) {
      return (
        <div className={`cb-media-preview cb-media-preview-empty cb-media-preview-poster ${className}`}>
          <img
            alt={alt || title || 'Private video thumbnail'}
            className={`h-full w-full bg-[#140d12] ${fitClass}`}
            loading="lazy"
            onError={() => setFailedSrc(poster)}
            src={poster}
          />
          {onLoadRequest ? (
            <div className="absolute inset-x-0 bottom-0 flex justify-center bg-[#140d12]/70 p-3 backdrop-blur-sm">
              <SecondaryButton disabled={loading} onClick={onLoadRequest}>
                {loading ? 'Loading...' : 'Open video preview'}
              </SecondaryButton>
            </div>
          ) : null}
        </div>
      )
    }

    return (
      <div className={`cb-media-preview cb-media-preview-empty ${className}`}>
        <div className="grid justify-items-center gap-3 p-5 text-center">
          <Icon className="size-8 text-[var(--cb-accent)]" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-[var(--cb-text)]">{failed ? fallbackTitle(kind) : title || 'Preview available on request'}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--cb-text-muted)]">
              {loading ? 'Loading preview...' : description || (isVideo ? 'The video original stays private until a media session is connected.' : 'The image original stays private until a media session is connected.')}
            </p>
          </div>
          {onLoadRequest ? (
            <SecondaryButton disabled={loading} onClick={onLoadRequest}>
              {loading ? 'Loading...' : isVideo ? 'Open video preview' : 'Open image preview'}
            </SecondaryButton>
          ) : null}
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

  return (
    <div className={`cb-media-preview ${className}`}>
      {isVideo ? (
        <video
          ref={videoRef}
          aria-label={alt || title || 'Private video preview'}
          className={`h-full w-full bg-[#140d12] ${fitClass}`}
          controls={controls}
          muted
          onError={() => setFailedSrc(src)}
          playsInline
          poster={poster || undefined}
          preload="metadata"
          src={src}
        />
      ) : (
        <img
          alt={alt || title || 'Private image preview'}
          className={`h-full w-full bg-[#140d12] ${fitClass}`}
          loading="lazy"
          onError={() => setFailedSrc(src)}
          src={src}
        />
      )}
    </div>
  )
}
