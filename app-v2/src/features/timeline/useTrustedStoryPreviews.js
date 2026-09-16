import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import { fetchMediaBlobViaTrustedBackend, isTrustedMediaBackendConfigured } from '../../services/trustedMediaBackendClient.js'

const STORY_THUMBNAIL_PRELOAD_ITEMS = 40
const STORY_THUMBNAIL_PRELOAD_CONCURRENCY = 4

function withTrustedPreview(memory, previewUrls) {
  const mediaId = memory?.media?.id || memory?.mediaIndexId || ''
  const preview = mediaId ? previewUrls[mediaId] || null : null
  const previewUrl = typeof preview === 'string' ? preview : preview?.url || ''
  if (!previewUrl) return memory
  const previewKind = typeof preview === 'string' ? memory.media?.kind || 'image' : preview.kind || memory.media?.kind || 'image'
  return {
    ...memory,
    media: {
      ...memory.media,
      previewKind,
      previewMode: typeof preview === 'string' ? 'stream' : preview.mode || 'thumbnail',
      previewUrl,
      thumbnailUrl: previewUrl,
    },
  }
}

export function useTrustedStoryPreviews(memories = [], selectedMemory = null) {
  const { approvedUser, user } = useAuth()
  const [previewUrls, setPreviewUrls] = useState({})
  const [streamStatus, setStreamStatus] = useState({ error: '', loading: false, mediaId: '' })
  const previewUrlsRef = useRef(new Map())

  useEffect(() => () => {
    for (const preview of previewUrlsRef.current.values()) {
      const url = typeof preview === 'string' ? preview : preview?.url
      if (url) URL.revokeObjectURL(url)
    }
    previewUrlsRef.current.clear()
  }, [])

  useEffect(() => {
    if (!user || !approvedUser?.coupleId || !isTrustedMediaBackendConfigured()) return undefined
    const previewMemories = memories
      .filter((memory) => memory.media?.status === 'drive-indexed' && ['image', 'video'].includes(memory.media?.kind) && memory.media?.id && !previewUrlsRef.current.has(memory.media.id))
      .slice(0, STORY_THUMBNAIL_PRELOAD_ITEMS)
    if (!previewMemories.length) return undefined

    const controller = new AbortController()
    let cancelled = false

    async function loadPreview(memory) {
      try {
        if (cancelled || controller.signal.aborted) return
        const blob = await fetchMediaBlobViaTrustedBackend({
          coupleId: approvedUser.coupleId,
          mediaId: memory.media.id,
          mode: 'thumbnail',
          user,
        })
        if (cancelled || controller.signal.aborted) return
        const objectUrl = URL.createObjectURL(blob)
        previewUrlsRef.current.set(memory.media.id, { kind: 'image', mode: 'thumbnail', url: objectUrl })
        setPreviewUrls(Object.fromEntries(previewUrlsRef.current.entries()))
      } catch {
        // A single protected preview should not block the Story timeline.
      }
    }

    async function loadPreviews() {
      const workers = Array.from({ length: Math.min(STORY_THUMBNAIL_PRELOAD_CONCURRENCY, previewMemories.length) }, async (_, workerIndex) => {
        for (let index = workerIndex; index < previewMemories.length; index += STORY_THUMBNAIL_PRELOAD_CONCURRENCY) {
          if (cancelled || controller.signal.aborted) return
          await loadPreview(previewMemories[index])
        }
      })
      await Promise.all(workers)
    }

    void loadPreviews()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [approvedUser?.coupleId, memories, user])

  const loadSelectedPreview = useCallback(async (memory, { force = false } = {}) => {
    const mediaId = memory?.media?.id
    const cached = previewUrlsRef.current.get(mediaId)
    const isVideo = memory?.media?.kind === 'video'
    const needsStream = isVideo && cached?.mode !== 'stream'
    if (!user || !approvedUser?.coupleId || !mediaId || memory?.media?.status !== 'drive-indexed' || (!force && !needsStream && previewUrlsRef.current.has(mediaId)) || !isTrustedMediaBackendConfigured()) return

    if (isVideo) setStreamStatus({ error: '', loading: true, mediaId })
    try {
      const blob = await fetchMediaBlobViaTrustedBackend({
        coupleId: approvedUser.coupleId,
        mediaId,
        mode: isVideo ? 'stream' : 'thumbnail',
        user,
      })
      const objectUrl = URL.createObjectURL(blob)
      if (cached?.url && cached.url !== objectUrl) URL.revokeObjectURL(cached.url)
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
    if (!selectedMemory) return undefined
    const timer = window.setTimeout(() => {
      void loadSelectedPreview(selectedMemory)
    }, 0)
    return () => {
      window.clearTimeout(timer)
    }
  }, [loadSelectedPreview, selectedMemory])

  const selectedMemoryWithPreview = useMemo(() => withTrustedPreview(selectedMemory, previewUrls), [previewUrls, selectedMemory])
  const selectedStreamStatus = selectedMemoryWithPreview?.media?.id && selectedMemoryWithPreview.media.id === streamStatus.mediaId ? streamStatus : null

  return {
    memoriesWithPreviews: useMemo(() => memories.map((memory) => withTrustedPreview(memory, previewUrls)), [memories, previewUrls]),
    loadSelectedPreview,
    selectedMemoryWithPreview,
    streamStatus: selectedStreamStatus,
  }
}
