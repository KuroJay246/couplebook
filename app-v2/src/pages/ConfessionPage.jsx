import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState } from '../components/ui/ErrorState.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'
import { useAuth } from '../auth/useAuth.js'
import { createLocalApiPath, readRuntimeEnv } from '../data/adapterUtils.js'
import { useSpecialMomentContent } from '../features/specialMoments/useSpecialMomentContent.js'

const BRIDGE_BASE_URL = String(readRuntimeEnv().VITE_LEGACY_LOCAL_BASE_URL || '').trim()
const OWNER_STATE_PATH = createLocalApiPath('private-media', 'confession', 'owner-state')

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

function RestorationSlot({ label, status }) {
  return (
    <div className="confession-slot">
      <span className="confession-slot-label">{label}</span>
      <span className="confession-slot-status">{status}</span>
    </div>
  )
}

function slotStatusCopy(slot) {
  if (!slot) return 'Photo awaiting restoration'
  if (slot.kind === 'audio') return slot.status === 'mapped' ? 'Audio ready' : 'Audio optional'
  if (slot.kind === 'video') return slot.status === 'mapped' ? 'Video ready' : 'Video awaiting restoration'
  return slot.status === 'mapped' ? 'Photo ready' : 'Photo awaiting restoration'
}

function resolveBridgeUrl(url) {
  if (!url) return ''

  try {
    return new URL(url, BRIDGE_BASE_URL || window.location.origin).toString()
  } catch {
    return ''
  }
}

function CandidatePreview({ candidate }) {
  const previewUrl = resolveBridgeUrl(candidate.previewUrl)
  if (!previewUrl) return null

  if (candidate.kind === 'image') {
    return <img alt={candidate.filename} className="confession-candidate-preview" src={previewUrl} />
  }

  if (candidate.kind === 'video') {
    return <video className="confession-candidate-preview" controls muted playsInline preload="metadata" src={previewUrl} />
  }

  return <audio className="confession-candidate-audio" controls preload="metadata" src={previewUrl} />
}

export function ConfessionPage() {
  const { model, refreshCompatibility } = useSpecialMomentContent('confession')
  const { user } = useAuth()
  const [opened, setOpened] = useState(false)
  const [ownerState, setOwnerState] = useState(null)
  const [ownerStateStatus, setOwnerStateStatus] = useState(BRIDGE_BASE_URL ? 'loading' : 'unavailable')
  const [ownerStateError, setOwnerStateError] = useState('')
  const [activeSlotAction, setActiveSlotAction] = useState('')

  const letterText = model.moment?.sections?.length
    ? splitRuntimeParagraphs(model.moment.sections.map((section) => section.content).filter(Boolean).join('\n\n'))
    : []
  const slotMap = Object.fromEntries((model.mediaSlots || []).map((slot) => [slot.id, slot]))
  const ownerSlots = ownerState?.slots || []
  const showOwnerTools = Boolean(BRIDGE_BASE_URL) && window.location.hostname === 'localhost'

  useEffect(() => {
    if (!BRIDGE_BASE_URL || !user?.uid) return

    let active = true

    async function loadOwnerState() {
      setOwnerStateStatus('loading')
      setOwnerStateError('')
      try {
        const response = await fetch(resolveBridgeUrl(OWNER_STATE_PATH))
        if (!response.ok) {
          throw new Error('Owner restoration state is unavailable.')
        }

        const payload = await response.json()
        if (!active) return
        setOwnerState(payload)
        setOwnerStateStatus('ready')
      } catch (error) {
        if (!active) return
        setOwnerState(null)
        setOwnerStateStatus('error')
        setOwnerStateError(error?.message || 'Owner restoration state is unavailable.')
      }
    }

    void loadOwnerState()

    return () => {
      active = false
    }
  }, [user?.uid])

  async function updateOwnerMapping(slotId, candidateId, clear = false) {
    const requestId = `${slotId}:${clear ? 'clear' : candidateId}`
    setActiveSlotAction(requestId)
    setOwnerStateError('')

    try {
      const response = await fetch(resolveBridgeUrl(OWNER_STATE_PATH), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clear ? { slotId, clear: true } : { slotId, candidateId }),
      })

      if (!response.ok) {
        throw new Error('Owner mapping update failed.')
      }

      const payload = await response.json()
      setOwnerState(payload)
      setOwnerStateStatus('ready')
    } catch (error) {
      setOwnerStateStatus('error')
      setOwnerStateError(error?.message || 'Owner mapping update failed.')
    } finally {
      setActiveSlotAction('')
    }
  }

  function renderVisualSlot(slotId, fallbackLabel) {
    const slot = slotMap[slotId]
    if (slot?.status === 'mapped' && slot.url && slot.kind === 'image') {
      return <img alt={slot.label} className="confession-slot-image" src={slot.url} />
    }

    return <RestorationSlot label={fallbackLabel} status={slotStatusCopy(slot)} />
  }

  if (model.status === 'loading') {
    return <LoadingState message="Loading confession..." />
  }

  if (!['ready', 'partial'].includes(model.status) || !model.moment) {
    return (
      <ErrorState
        title="Confession page unavailable"
        message="The confession chapter could not be loaded for this approved session."
        onRetry={refreshCompatibility}
      />
    )
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

      <div className={`confession-shell ${opened ? 'is-opened' : ''}`}>
        <div className="confession-gate">
          <p className="confession-kicker">Private reading</p>
          <h1>{model.moment.title}</h1>
          <p className="confession-intro">A private note, kept inside Couple Book and opened only for the signed-in person who belongs here.</p>
          <button className="confession-open-button" onClick={() => setOpened(true)} type="button">
            Open card
          </button>
        </div>

        <article className="confession-card">
          <header className="confession-card-header">
            <p className="confession-overline">For Mara</p>
            <h2>{model.moment.subtitle || 'To the girl who fills my heart'}</h2>
          </header>

          <div className="confession-notes">
            {renderVisualSlot('top-note-photo', 'Top note photo')}
            {renderVisualSlot('cheesy-note-image', 'Cheesy note image')}
            {renderVisualSlot('outside-note-photo', 'Outside note photo')}
          </div>

          <div className="confession-letter">
            {letterText.length > 0 ? letterText.map((paragraph) => (
              <p key={paragraph.slice(0, 48)}>{paragraph}</p>
            )) : <p>The protected letter is available for this approved session.</p>}
          </div>

          <div className="confession-inline-media">
            {renderVisualSlot('inline-meme-image', 'Inline meme image')}
          </div>

          <div className="confession-media">
            {slotMap['closing-video']?.status === 'mapped' && slotMap['closing-video']?.url ? (
              <video className="confession-video" controls playsInline preload="metadata">
                <source src={slotMap['closing-video'].url} type="video/mp4" />
              </video>
            ) : (
              <RestorationSlot label="Closing video" status={slotStatusCopy(slotMap['closing-video'])} />
            )}
            {slotMap['background-audio']?.status === 'mapped' && slotMap['background-audio']?.url ? (
              <audio className="confession-audio" controls preload="metadata" src={slotMap['background-audio'].url} />
            ) : (
              <RestorationSlot label="Background audio" status={slotStatusCopy(slotMap['background-audio'])} />
            )}
          </div>

          {user?.uid && showOwnerTools ? (
            <aside className="confession-owner-panel">
              <h3>Owner restoration status</h3>
              <p className="confession-owner-copy">
                This local-only tool writes slot mappings to the ignored private import folder and keeps the recovered media out of Git and public assets.
              </p>
              <div className="confession-owner-toolbar">
                <button
                  className="confession-owner-button"
                  onClick={() => {
                    setOwnerStateStatus('loading')
                    setOwnerStateError('')
                    fetch(resolveBridgeUrl(OWNER_STATE_PATH))
                      .then((response) => {
                        if (!response.ok) throw new Error('Owner restoration state is unavailable.')
                        return response.json()
                      })
                      .then((payload) => {
                        setOwnerState(payload)
                        setOwnerStateStatus('ready')
                      })
                      .catch((error) => {
                        setOwnerState(null)
                        setOwnerStateStatus('error')
                        setOwnerStateError(error?.message || 'Owner restoration state is unavailable.')
                      })
                  }}
                  type="button"
                >
                  Refresh local candidates
                </button>
                <span className="confession-owner-status">
                  {ownerStateStatus === 'ready'
                    ? `${ownerSlots.filter((slot) => slot.status === 'mapped').length}/${ownerSlots.length} slots mapped`
                    : ownerStateStatus === 'loading'
                      ? 'Loading local recovery state...'
                      : ownerStateStatus === 'unavailable'
                        ? 'Local recovery bridge unavailable.'
                        : 'Local recovery state needs attention.'}
                </span>
              </div>
              {ownerStateError ? <p className="confession-owner-error">{ownerStateError}</p> : null}
              <div className="confession-owner-slots">
                {ownerSlots.map((slot) => (
                  <section className="confession-owner-slot" key={slot.id}>
                    <div className="confession-owner-slot-header">
                      <div>
                        <p className="confession-owner-slot-label">{slot.label}</p>
                        <p className="confession-owner-slot-meta">
                          {slot.kind === 'audio' ? 'Audio optional' : slot.required ? 'Required media' : 'Optional media'}
                        </p>
                      </div>
                      <div className="confession-owner-slot-actions">
                        <span className="confession-owner-slot-state">{slotStatusCopy(slot)}</span>
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
                    {slot.current ? (
                      <p className="confession-owner-current">
                        Current: {slot.current.filename}
                      </p>
                    ) : (
                      <p className="confession-owner-current">
                        No local mapping saved yet.
                      </p>
                    )}
                    <div className="confession-owner-candidates">
                      {slot.candidates.map((candidate) => {
                        const requestId = `${slot.id}:${candidate.id}`
                        return (
                          <article className="confession-candidate" key={candidate.id}>
                            <CandidatePreview candidate={candidate} />
                            <div className="confession-candidate-copy">
                              <p className="confession-candidate-name">{candidate.filename}</p>
                              <p className="confession-candidate-note">{candidate.note}</p>
                              <p className="confession-candidate-confidence">Confidence: {candidate.confidence}</p>
                            </div>
                            <button
                              className="confession-owner-button"
                              disabled={activeSlotAction === requestId}
                              onClick={() => updateOwnerMapping(slot.id, candidate.id)}
                              type="button"
                            >
                              {activeSlotAction === requestId ? 'Saving...' : 'Use this file'}
                            </button>
                          </article>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </aside>
          ) : null}
        </article>
      </div>
    </section>
  )
}
