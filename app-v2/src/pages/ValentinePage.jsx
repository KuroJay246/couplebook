import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState } from '../components/ui/ErrorState.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'
import { useSpecialMomentContent } from '../features/specialMoments/useSpecialMomentContent.js'

const FLIRTY_MESSAGES = [
  'Gyal, yuh jus ah drive me crazy 💖',
  'Mi wah tek yuh pon a ride like di rodeo 🎠',
  'One piece ah hotness, and yuh heart cold… guess wah my heart colda 💘',
  'Hottie, like a work a art 🌸',
  'Wine yuh waistline, mi ah pree every move 😉',
  'Some odda gyal need fi practice, but yuh natural 😏',
  'Mi gi yuh high props, always 💕',
  'Move like a goddess, mi follow every step 👑',
]

function Heart({ item }) {
  return (
    <span
      className="valentine-heart"
      style={{
        left: item.left,
        animationDuration: item.duration,
        animationDelay: item.delay,
      }}
    >
      {item.label}
    </span>
  )
}

export function ValentinePage() {
  const { model, refreshCompatibility } = useSpecialMomentContent('valentine')
  const cardRef = useRef(null)
  const [accepted, setAccepted] = useState(false)
  const [message, setMessage] = useState('')
  const [popups, setPopups] = useState([])
  const [noStyle, setNoStyle] = useState({ left: '57%', top: '0.75rem' })
  const floating = useMemo(
    () => Array.from({ length: 14 }, (_, index) => ({
      id: `valentine-heart-${index}`,
      left: `${Math.max(2, Math.min(94, 6 + index * 6))}%`,
      duration: `${4.2 + (index % 5) * 0.55}s`,
      delay: `${(index % 6) * 0.3}s`,
      label: index % 4 === 0 ? FLIRTY_MESSAGES[index % FLIRTY_MESSAGES.length] : index % 2 === 0 ? '💜' : '🌸',
    })),
    [],
  )

  if (model.status === 'loading') {
    return <LoadingState message="Loading valentine..." />
  }

  if (!['ready', 'partial'].includes(model.status) || !model.moment) {
    return (
      <ErrorState
        title="Valentine page unavailable"
        message="The Valentine chapter could not be loaded for this approved session."
        onRetry={refreshCompatibility}
      />
    )
  }

  const question = model.moment.title || 'Omia,\nWill you be my Valentine?'

  function showFlirtyMessage(text) {
    const id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
    const popup = {
      id,
      text,
      left: `${Math.floor(Math.random() * 70)}vw`,
      top: `${Math.floor(Math.random() * 50)}vh`,
    }
    setPopups((current) => [...current, popup].slice(-6))
    window.setTimeout(() => {
      setPopups((current) => current.filter((item) => item.id !== id))
    }, 2200)
  }

  function moveNoButton() {
    if (accepted) return
    const card = cardRef.current
    if (!card) return
    const width = card.clientWidth - 142
    const height = 78
    setNoStyle({
      left: `${Math.max(0, Math.floor(Math.random() * width))}px`,
      top: `${Math.max(0, Math.floor(Math.random() * height))}px`,
    })
    const nextMessage = FLIRTY_MESSAGES[Math.floor(Math.random() * FLIRTY_MESSAGES.length)]
    setMessage(nextMessage)
    showFlirtyMessage('Gyal, yuh jus ah drive me crazy 💖')
  }

  function acceptValentine() {
    setAccepted(true)
    const nextMessage = FLIRTY_MESSAGES[Math.floor(Math.random() * FLIRTY_MESSAGES.length)]
    setMessage(nextMessage)
    showFlirtyMessage(nextMessage)
    window.setTimeout(() => setMessage('As you should ml oh i mean... YAY 💕 I can’t wait for Valentine’s Day with you!'), 500)
  }

  function replay() {
    setAccepted(false)
    setMessage('')
    setPopups([])
    setNoStyle({ left: '57%', top: '0.75rem' })
  }

  return (
    <section className="special-moment-page special-valentine-page" data-route="valentine">
      <div className="special-moment-utility">
        <Link className="special-moment-link" to="/dashboard">Back to Home</Link>
        <Link className="special-moment-link subtle" to="/gallery">Open Album</Link>
      </div>

      <div className="valentine-stage">
        <div className="valentine-floating" aria-hidden="true">
          {floating.map((item) => <Heart item={item} key={item.id} />)}
        </div>
        {popups.map((popup) => (
          <span className="valentine-popup-message" key={popup.id} style={{ left: popup.left, top: popup.top }}>
            {popup.text}
          </span>
        ))}
        {accepted ? (
          <div className="valentine-confetti-burst" aria-hidden="true">
            {Array.from({ length: 28 }, (_item, index) => (
              <span
                key={`valentine-confetti-${index}`}
                style={{
                  '--burst-index': index,
                  '--burst-x': `${Math.cos(index * 1.7) * (8 + (index % 5) * 1.7)}rem`,
                  '--burst-y': `${Math.sin(index * 1.3) * (6 + (index % 4) * 1.4)}rem`,
                }}
              />
            ))}
          </div>
        ) : null}

        <div className={`valentine-card ${accepted ? 'is-accepted' : ''}`} ref={cardRef}>
          <div className="valentine-emoji" aria-hidden="true">🌸💜</div>
          <h1>{question.split('\n').map((line) => <span key={line}>{line}<br /></span>)}</h1>

          <div className="valentine-buttons">
            <button className="valentine-action yes" onClick={acceptValentine} type="button">Yes 💖</button>
            <button
              aria-label="No, move the playful button"
              className="valentine-action no"
              onClick={moveNoButton}
              onFocus={moveNoButton}
              onMouseEnter={moveNoButton}
              onTouchStart={moveNoButton}
              style={noStyle}
              type="button"
            >
              No 🙈
            </button>
          </div>

          <div className="valentine-response" aria-live="polite">
            {message || 'No is not an option ml ✨'}
          </div>
          <button className="special-moment-link subtle mt-5" onClick={replay} type="button">Replay</button>
        </div>
      </div>
    </section>
  )
}
