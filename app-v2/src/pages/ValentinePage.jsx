import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState } from '../components/ui/ErrorState.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'
import { useSpecialMomentContent } from '../features/specialMoments/useSpecialMomentContent.js'

const FLIRTY_MESSAGES = [
  'Gyal, yuh jus ah drive me crazy',
  'Mi gi yuh high props, always',
  'Move like a goddess, mi follow every step',
  'Hottie, like a work a art',
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
  const [noStyle, setNoStyle] = useState({ left: '57%', top: '0.75rem' })
  const floating = useMemo(
    () => Array.from({ length: 14 }, (_, index) => ({
      id: `valentine-heart-${index}`,
      left: `${Math.max(2, Math.min(94, 6 + index * 6))}%`,
      duration: `${4.2 + (index % 5) * 0.55}s`,
      delay: `${(index % 6) * 0.3}s`,
      label: index % 3 === 0 ? '🌸' : index % 2 === 0 ? '💜' : '♥',
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

  const question = model.moment.title || 'Will you be my Valentine?'

  function moveNoButton() {
    const card = cardRef.current
    if (!card) return
    const width = card.clientWidth - 142
    const height = 78
    setNoStyle({
      left: `${Math.max(0, Math.floor(Math.random() * width))}px`,
      top: `${Math.max(0, Math.floor(Math.random() * height))}px`,
    })
    setMessage(FLIRTY_MESSAGES[Math.floor(Math.random() * FLIRTY_MESSAGES.length)])
  }

  function acceptValentine() {
    setAccepted(true)
    setMessage('As you should ml')
    window.setTimeout(() => setMessage('I cannot wait for Valentine’s Day with you.'), 700)
  }

  return (
    <section className="special-moment-page special-valentine-page" data-route="valentine">
      <div className="special-moment-utility">
        <Link className="special-moment-link" to="/dashboard">Back to Home</Link>
        <Link className="special-moment-link subtle" to="/timeline">Open Story</Link>
      </div>

      <div className="valentine-stage">
        <div className="valentine-floating" aria-hidden="true">
          {floating.map((item) => <Heart item={item} key={item.id} />)}
        </div>

        <div className={`valentine-card ${accepted ? 'is-accepted' : ''}`} ref={cardRef}>
          <div className="valentine-emoji" aria-hidden="true">🌸💜</div>
          <p className="valentine-kicker">A kept love note</p>
          <h1>{question}</h1>
          <p className="valentine-hint">No is not an option ml</p>

          <div className="valentine-buttons">
            <button className="valentine-action yes" onClick={acceptValentine} type="button">Yes</button>
            <button className="valentine-action no" onMouseEnter={moveNoButton} style={noStyle} type="button">No</button>
          </div>

          <div className="valentine-response" aria-live="polite">
            {message || 'Audio remains optional. The page stays fully usable without it.'}
          </div>
        </div>
      </div>
    </section>
  )
}
