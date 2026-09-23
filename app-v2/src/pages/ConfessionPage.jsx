import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { ErrorState } from '../components/ui/ErrorState.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'
import { useConfessionOwnerBridge } from '../features/specialMoments/useConfessionOwnerBridge.js'
import { useSpecialMomentContent } from '../features/specialMoments/useSpecialMomentContent.js'
import { createObjectUrlRegistry } from '../services/objectUrlLifecycle.js'
import { fetchMediaBlobViaTrustedBackend, isTrustedMediaBackendConfigured } from '../services/trustedMediaBackendClient.js'

function splitRuntimeParagraphs(text) {
  const normalized = String(text || '').trim()
  if (!normalized) return []
  if (normalized.includes('\n\n')) {
    return normalized.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean)
  }

  const sentences = normalized.split(/(?<=[.!?])\s+(?=[A-Z"])/).map((item) => item.trim()).filter(Boolean)
  if (sentences.length <= 3) return [normalized]

  const paragraphs = []
  for (let index = 0; index < sentences.length; index += 2) {
    paragraphs.push(sentences.slice(index, index + 2).join(' '))
  }
  return paragraphs
}

function CandidatePreview({ candidate, resolvePreviewUrl }) {
  const previewUrl = resolvePreviewUrl(candidate.previewUrl)
  if (!previewUrl) return null

  if (candidate.kind === 'image') {
    return <img alt={candidate.filename} className="confession-candidate-preview" src={previewUrl} />
  }

  if (candidate.kind === 'video') {
    return <video className="confession-candidate-preview" controls muted playsInline preload="metadata" src={previewUrl} />
  }

  return <audio className="confession-candidate-audio" controls preload="metadata" src={previewUrl} />
}

function ownerStatusCopy(ownerStateStatus, ownerSlots) {
  if (ownerStateStatus === 'ready') {
    return `${ownerSlots.filter((slot) => slot.status === 'mapped').length}/${ownerSlots.length} slots mapped`
  }

  if (ownerStateStatus === 'loading') return 'Loading local recovery state...'
  if (ownerStateStatus === 'unavailable') return 'Local recovery bridge unavailable.'
  return 'Local recovery state needs attention.'
}

function ConfessionOwnerCandidate({ activeSlotAction, candidate, resolvePreviewUrl, slotId, updateOwnerMapping }) {
  const requestId = `${slotId}:${candidate.id}`

  return (
    <article className="confession-candidate">
      <CandidatePreview candidate={candidate} resolvePreviewUrl={resolvePreviewUrl} />
      <div className="confession-candidate-copy">
        <p className="confession-candidate-name">{candidate.filename}</p>
        <p className="confession-candidate-note">{candidate.note}</p>
        <p className="confession-candidate-confidence">Confidence: {candidate.confidence}</p>
      </div>
      <button
        className="confession-owner-button"
        disabled={activeSlotAction === requestId}
        onClick={() => updateOwnerMapping(slotId, candidate.id)}
        type="button"
      >
        {activeSlotAction === requestId ? 'Saving...' : 'Use this file'}
      </button>
    </article>
  )
}

function ConfessionOwnerSlot({ activeSlotAction, resolvePreviewUrl, slot, updateOwnerMapping }) {
  return (
    <section className="confession-owner-slot">
      <div className="confession-owner-slot-header">
        <div>
          <p className="confession-owner-slot-label">{slot.label}</p>
          <p className="confession-owner-slot-meta">
            {slot.kind === 'audio' ? 'Audio optional' : slot.required ? 'Required media' : 'Optional media'}
          </p>
        </div>
        <div className="confession-owner-slot-actions">
          <span className="confession-owner-slot-state">{slot.status === 'mapped' ? 'Mapped' : 'Unmapped'}</span>
          {slot.current ? (
            <button
              className="confession-owner-button subtle"
              disabled={activeSlotAction === `${slot.id}:clear`}
              onClick={() => updateOwnerMapping(slot.id, '', true)}
              type="button"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
      <p className="confession-owner-current">
        {slot.current ? `Current: ${slot.current.filename}` : 'No local mapping saved yet.'}
      </p>
      <div className="confession-owner-candidates">
        {slot.candidates.map((candidate) => (
          <ConfessionOwnerCandidate
            activeSlotAction={activeSlotAction}
            candidate={candidate}
            key={candidate.id}
            resolvePreviewUrl={resolvePreviewUrl}
            slotId={slot.id}
            updateOwnerMapping={updateOwnerMapping}
          />
        ))}
      </div>
    </section>
  )
}

function ConfessionOwnerPanel({ activeSlotAction, ownerSlots, ownerStateError, ownerStateStatus, refreshOwnerState, resolvePreviewUrl, updateOwnerMapping }) {
  return (
    <aside className="confession-owner-panel">
      <h3>Owner restoration status</h3>
      <p className="confession-owner-copy">
        This local-only tool writes slot mappings to the ignored private import folder and keeps the recovered media out of Git and public assets.
      </p>
      <div className="confession-owner-toolbar">
        <button
          className="confession-owner-button"
          onClick={refreshOwnerState}
          type="button"
        >
          Refresh local candidates
        </button>
        <span className="confession-owner-status">
          {ownerStatusCopy(ownerStateStatus, ownerSlots)}
        </span>
      </div>
      {ownerStateError ? <p className="confession-owner-error">{ownerStateError}</p> : null}
      <div className="confession-owner-slots">
        {ownerSlots.map((slot) => (
          <ConfessionOwnerSlot
            activeSlotAction={activeSlotAction}
            key={slot.id}
            resolvePreviewUrl={resolvePreviewUrl}
            slot={slot}
            updateOwnerMapping={updateOwnerMapping}
          />
        ))}
      </div>
    </aside>
  )
}

function ConfessionVisualSlot({ slot }) {
  if (slot?.status === 'mapped' && slot.url && slot.kind === 'image') {
    return <img alt={slot.label} className="confession-slot-image" src={slot.url} />
  }

  return null
}

function ConfessionNote({ className = '', imageSlot, memeSlot, text, secondaryText }) {
  if (!text && !imageSlot?.url && !memeSlot?.url) return null

  return (
    <aside className={`confession-note ${className}`}>
      <div className="confession-note-stack">
        {text ? <p className="confession-note-bubble primary">{text}</p> : null}
        {secondaryText ? <p className="confession-note-bubble secondary">{secondaryText}</p> : null}
        {memeSlot?.url ? <img alt={memeSlot.label} className="confession-note-meme" src={memeSlot.url} /> : null}
      </div>
      {imageSlot?.url ? <img alt={imageSlot.label} className="confession-note-face" src={imageSlot.url} /> : null}
    </aside>
  )
}

function ConfessionMedia({ slotMap }) {
  const closingVideo = slotMap['closing-video']
  const backgroundAudio = slotMap['background-audio']

  return (
    <div className="confession-media">
      {closingVideo?.status === 'mapped' && closingVideo?.url ? (
        <video className="confession-video" controls playsInline preload="metadata">
          <source src={closingVideo.url} type="video/mp4" />
        </video>
      ) : null}
      {backgroundAudio?.status === 'mapped' && backgroundAudio?.url ? (
        <audio className="confession-audio" controls preload="metadata" src={backgroundAudio.url} />
      ) : null}
    </div>
  )
}

function useTrustedConfessionSlots(mediaSlots) {
  const { approvedUser, user } = useAuth()
  const [backendSlots, setBackendSlots] = useState({})
  const registryRef = useRef(null)
  if (registryRef.current == null) registryRef.current = createObjectUrlRegistry()

  const slots = useMemo(() => (Array.isArray(mediaSlots) ? mediaSlots : []), [mediaSlots])
  const slotKey = useMemo(
    () => slots.map((slot) => `${slot.id}:${slot.mediaId || ''}:${slot.url || ''}`).join('|'),
    [slots],
  )

  useEffect(() => () => registryRef.current.revokeAll(), [])

  useEffect(() => {
    if (!user || !approvedUser?.coupleId || !isTrustedMediaBackendConfigured()) return undefined
    const backendSlots = slots.filter((slot) => slot?.provider === 'google-drive' && slot?.mediaId && !slot?.url)
    if (!backendSlots.length) return undefined

    let cancelled = false
    const createdUrls = []

    async function loadSlot(slot) {
      try {
        const blob = await fetchMediaBlobViaTrustedBackend({
          coupleId: approvedUser.coupleId,
          mediaId: slot.mediaId,
          mode: slot.kind === 'image' ? 'thumbnail' : 'stream',
          user,
        })
        if (cancelled) return
        const url = registryRef.current.create(blob)
        createdUrls.push(url)
        setBackendSlots((current) => ({
          ...current,
          [slot.id]: {
            ...slot,
            status: 'mapped',
            url,
          },
        }))
      } catch {
        if (cancelled) return
        setBackendSlots((current) => ({
          ...current,
          [slot.id]: {
            ...slot,
            status: slot.required ? 'pending' : 'optional',
            url: '',
          },
        }))
      }
    }

    for (const slot of backendSlots) void loadSlot(slot)
    return () => {
      cancelled = true
      for (const url of createdUrls) registryRef.current.revoke(url)
    }
  }, [approvedUser?.coupleId, slotKey, slots, user])

  return useMemo(
    () => Object.fromEntries(slots.map((slot) => [slot.id, slot.url ? slot : backendSlots[slot.id] || slot])),
    [backendSlots, slots],
  )
}

function ConfessionLetter({ letterText }) {
  if (letterText.length === 0) {
    return (
      <div className="confession-letter">
        <p>The protected letter is available for this approved session.</p>
      </div>
    )
  }

  return (
    <div className="confession-letter">
      {letterText.map((paragraph) => (
        <p key={paragraph.slice(0, 48)}>{paragraph}</p>
      ))}
    </div>
  )
}

function ConfessionReadingCard({ model, ownerBridge, recoveryToolsEnabled, slotMap }) {
  const letterText = model.moment?.sections?.length
    ? splitRuntimeParagraphs(model.moment.sections.flatMap((section) => (section.content ? [section.content] : [])).join('\n\n'))
    : []

  return (
    <article className="confession-card">
      <header className="confession-card-header">
        <p className="confession-overline">For Mara</p>
        <h2>{model.moment.subtitle || 'To the girl who fills my heart'}</h2>
      </header>

      <div className="confession-notes" aria-label="Preserved side notes">
        <ConfessionNote
          className="top"
          imageSlot={slotMap['top-note-photo']}
          text="Ik i repeat my self alot ml"
        />
        <ConfessionNote
          className="cheesy"
          memeSlot={slotMap['cheesy-note-image']}
          secondaryText="Yh this was kinda chessy but all love"
        />
        <ConfessionNote
          className="outside"
          imageSlot={slotMap['outside-note-photo']}
          secondaryText="Yes ik i deserve a beating"
          text="Yes i did ask for your favorite flowers for a reason ml. I also did take some insprations from your code alot of it lol"
        />
      </div>

      <ConfessionLetter letterText={letterText} />

      <div className="confession-inline-media">
        <ConfessionVisualSlot slot={slotMap['inline-meme-image']} />
      </div>

      <ConfessionMedia slotMap={slotMap} />

      {recoveryToolsEnabled && ownerBridge.user?.uid && ownerBridge.showOwnerTools ? (
        <ConfessionOwnerPanel
          activeSlotAction={ownerBridge.activeSlotAction}
          ownerSlots={ownerBridge.ownerSlots}
          ownerStateError={ownerBridge.ownerStateError}
          ownerStateStatus={ownerBridge.ownerStateStatus}
          refreshOwnerState={ownerBridge.refreshOwnerState}
          resolvePreviewUrl={ownerBridge.resolvePreviewUrl}
          updateOwnerMapping={ownerBridge.updateOwnerMapping}
        />
      ) : null}
    </article>
  )
}

function ConfessionExperience({ model, ownerBridge, recoveryToolsEnabled }) {
  const [unlocked, setUnlocked] = useState(false)
  const [opened, setOpened] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const slotMap = useTrustedConfessionSlots(model.mediaSlots || [])
  const validPasswords = new Set(['mara', 'bighead', 'big head', 'mimi', 'mia'])

  function unlockCard(event) {
    event.preventDefault()
    const normalized = password.toLowerCase().trim()
    if (validPasswords.has(normalized)) {
      setUnlocked(true)
      setError('')
      return
    }
    setError('Think of what I call you.')
  }

  return (
    <section className="special-moment-page special-confession-page" data-route="confession">
      <div className="special-moment-utility">
        <Link className="special-moment-link" to="/dashboard">Back to Home</Link>
        <Link className="special-moment-link subtle" to="/gallery">Open Album</Link>
      </div>

      <div className="confession-atmosphere" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className={`confession-shell ${unlocked ? 'is-unlocked' : ''} ${opened ? 'is-opened' : ''}`}>
        {!unlocked ? (
          <form className="confession-password-screen" onSubmit={unlockCard}>
            <p className="confession-kicker">Private card</p>
            <h1>Unlock Your Card</h1>
            <p className="confession-intro">Hint: a nickname that I call you.</p>
            <input
              aria-label="Confession password"
              className="confession-password-input"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password..."
              type="text"
              value={password}
            />
            <button className="confession-open-button" type="submit">Unlock</button>
            {error ? <p className="confession-password-error" aria-live="polite">{error}</p> : null}
          </form>
        ) : (
          <div className="confession-flip-stage">
            <button
              aria-expanded={opened}
              className={`confession-card-front ${opened ? 'is-opened' : ''}`}
              onClick={() => setOpened((value) => !value)}
              type="button"
            >
              <span>For Mara</span>
              <strong>{model.moment.title}</strong>
              <em>Tap to {opened ? 'close' : 'open'}</em>
            </button>
          </div>
        )}

        {unlocked && opened ? (
          <ConfessionReadingCard
            model={model}
            ownerBridge={ownerBridge}
            recoveryToolsEnabled={recoveryToolsEnabled}
            slotMap={slotMap}
          />
        ) : null}
      </div>
    </section>
  )
}

export function ConfessionPage() {
  const { model, refreshCompatibility } = useSpecialMomentContent('confession')
  const ownerBridge = useConfessionOwnerBridge()
  const recoveryToolsEnabled = import.meta.env.VITE_ENABLE_SPECIAL_MOMENT_RECOVERY_TOOLS === 'true'

  if (model.status === 'loading') {
    return <LoadingState message="Loading confession..." />
  }

  if (model.status === 'invalid') {
    return (
      <ErrorState
        title="Confession page unavailable"
        message="The confession chapter is not configured correctly."
        onRetry={refreshCompatibility}
      />
    )
  }

  if (!['ready', 'partial'].includes(model.status) || !model.moment) {
    return (
      <ErrorState
        title="Confession source unavailable"
        message="The authentic Confession source is not loaded for this session. Start the local private bridge or restore the protected special-moment document before reviewing this page."
        onRetry={refreshCompatibility}
      />
    )
  }

  return <ConfessionExperience model={model} ownerBridge={ownerBridge} recoveryToolsEnabled={recoveryToolsEnabled} />
}
