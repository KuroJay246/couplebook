import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState } from '../components/ui/ErrorState.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'
import { useSpecialMomentContent } from '../features/specialMoments/useSpecialMomentContent.js'
import { formatMonthDayLabel } from '../../../packages/core/src/dates.js'

const CONFETTI = Array.from({ length: 18 }, (_, index) => ({
  id: `birthday-confetti-${index}`,
  left: `${6 + index * 5}%`,
  delay: `${(index % 6) * 0.4}s`,
  duration: `${3.5 + (index % 4) * 0.55}s`,
}))

function formatMomentDate(value) {
  return formatMonthDayLabel(value)
}

export function BirthdayPage() {
  const { model, refreshCompatibility } = useSpecialMomentContent('birthday')
  const [revealed, setRevealed] = useState(false)

  function replay() {
    setRevealed(false)
    window.setTimeout(() => setRevealed(true), 120)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setRevealed(true), 220)
    return () => window.clearTimeout(timer)
  }, [model.moment?.title, model.moment?.subtitle])

  if (model.status === 'loading') {
    return <LoadingState message="Loading birthday..." />
  }

  if (!['ready', 'partial'].includes(model.status) || !model.moment) {
    return (
      <ErrorState
        title="Birthday page unavailable"
        message="The birthday chapter could not be loaded for this approved session."
        onRetry={refreshCompatibility}
      />
    )
  }

  return (
    <section className="special-moment-page special-birthday-page" data-route="birthday">
      <div className="special-moment-utility">
        <Link className="special-moment-link" to="/dashboard">Back to Home</Link>
        <Link className="special-moment-link subtle" to="/gallery">Open Album</Link>
      </div>

      <div className="birthday-canvas">
        <div className="birthday-card">
          <div className="birthday-card-glow" aria-hidden="true" />
          <div className="birthday-card-inner">
            <button aria-label="Reveal birthday cake" className={`birthday-cake ${revealed ? 'is-revealed' : ''}`} onClick={() => setRevealed(true)} type="button">
              <div className="birthday-candles">
                <span className="candle tall"><span className="flame" /></span>
                <span className="candle medium"><span className="flame" /></span>
                <span className="candle short"><span className="flame" /></span>
              </div>
              <div className="birthday-cake-layer top">
                <span className="frosting" />
                <span className="sprinkle pink" />
                <span className="sprinkle gold" />
                <span className="sprinkle green" />
                <span className="birthday-cake-cherry" />
              </div>
              <div className="birthday-cake-layer middle">
                <span className="frosting" />
                <span className="sprinkle gold" />
                <span className="sprinkle green" />
                <span className="sprinkle pink" />
              </div>
              <div className="birthday-cake-layer bottom">
                <span className="frosting" />
                <span className="sprinkle pink" />
                <span className="sprinkle gold" />
                <span className="sprinkle green" />
                <span className="sprinkle violet" />
              </div>
              <div className="birthday-cake-plate" />
            </button>

            <div className={`birthday-copy ${revealed ? 'is-revealed' : ''}`}>
              <p className="birthday-kicker">{formatMomentDate(model.moment.date)}</p>
              <h1>{model.moment.title}</h1>
              <p className="birthday-subtitle">{model.moment.subtitle || 'With all my heart'}</p>
            </div>
          </div>
          <div className="birthday-actions">
            <button className="special-moment-link" onClick={replay} type="button">Replay</button>
          </div>

          <div className="birthday-confetti" aria-hidden="true">
            {CONFETTI.map((piece) => (
              <span
                key={piece.id}
                className="birthday-confetti-piece"
                style={{ left: piece.left, animationDelay: piece.delay, animationDuration: piece.duration }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
