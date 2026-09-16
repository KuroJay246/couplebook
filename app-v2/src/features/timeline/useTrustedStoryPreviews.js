import { useEffect, useMemo, useRef, useState } from 'react'
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

  useEffect(() => {
    const mediaId = selectedMemory?.media?.id
    const cached = previewUrlsRef.current.get(mediaId)
    const needsStream = selectedMemory?.media?.kind === 'video' && cached?.mode !== 'stream'
    if (!user || !approvedUser?.coupleId || !mediaId || selectedMemory?.media?.status !== 'drive-indexed' || (!needsStream && previewUrlsRef.current.has(mediaId)) || !isTrustedMediaBackendConfigured()) return undefined

    let cancelled = false
    async function loadSelectedPreview() {
      try {
        const blob = await fetchMediaBlobViaTrustedBackend({
          coupleId: approvedUser.coupleId,
          mediaId,
          mode: selectedMemory.media.kind === 'video' ? 'stream' : 'thumbnail',
          user,
        })
        if (cancelled) return
        const objectUrl = URL.createObjectURL(blob)
        if (cached?.url && cached.url !== objectUrl) URL.revokeObjectURL(cached.url)
        previewUrlsRef.current.set(mediaId, { kind: selectedMemory.media.kind === 'video' ? 'video' : 'image', mode: selectedMemory.media.kind === 'video' ? 'stream' : 'thumbnail', url: objectUrl })
        setPreviewUrls(Object.fromEntries(previewUrlsRef.current.entries()))
      } catch {
        // The selected memory remains readable even if protected playback is unavailable.
      }
    }

    void loadSelectedPreview()
    return () => {
      cancelled = true
    }
  }, [approvedUser?.coupleId, selectedMemory, user])

  return {
    memoriesWithPreviews: useMemo(() => memories.map((memory) => withTrustedPreview(memory, previewUrls)), [memories, previewUrls]),
    selectedMemoryWithPreview: useMemo(() => withTrustedPreview(selectedMemory, previewUrls), [previewUrls, selectedMemory]),
  }
}
